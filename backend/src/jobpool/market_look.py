"""
The public market count: what the pool asks for, per role family, and every
market page, as the weekly publication holds them.

    look()          the latest publication's /market/look body
    page(name)      the latest publication's /market/page/{name} body
    bodies(rows)    pool rows -> both bodies; what publish.py stores
    aggregate(rows) pool rows -> the /market/look body; pure, so it is tested without a database

Once a week publish.py builds these from the pool, checks them and stores
them (market_publications, decisions/market-publication.md). The API serves
only the latest publication: it never counts on request, and an empty or
half refreshed pool can't reach the site. Before the first publication exists
it counts the live pool, as it did before publications, so a deploy can't empty
/market.

Counted exactly as the daily snapshot counts (decisions/market-snapshots.md):
snapshot.counted() keeps daily-fetch postings only and a role listed on two
boards once, and skills are counted over readable (non-thin) jobs.

Never returned: a job's text. Titles carry the title and company; sample ads
carry the fields a job card shows and the skills read from the ad, nothing a
reader could reconstruct the ad from (decisions/market-look.md).
"""
import threading
import time
from collections import Counter, defaultdict
from datetime import date, datetime, timedelta, timezone

from psycopg import errors

from src.database.repositories import profile_repository, publication_repository
from src.database.session import connection, is_configured
from src.jobpool import market_pages, snapshot
from src.matching.requirements import PROFILER_VERSION
from src.matching.roles import TECH_FAMILIES
from src.matching.skills import display

# The landing page's three levels plus "unstated". Levels the profiler gives
# that are not listed here (only "unknown") are unstated.
BUCKETS = {"intern": "junior", "entry": "junior", "junior": "junior", "mid": "mid",
           "senior": "senior", "lead": "senior", "principal": "senior"}
LEVELS = ("junior", "mid", "senior")
SKILLS_PER_FAMILY = 150
TITLES_PER_LEVEL = 14
ADS_PER_LEVEL = 6
# An ad is a sample of what a level asks for; one naming fewer skills shows nothing.
MIN_AD_SKILLS = 2


class NotAvailable(RuntimeError):
    """No database configured: there is nothing to serve."""


def bucket(level: str | None) -> str:
    return BUCKETS.get(level or "", "unstated")


def _varied(rows: list[dict], limit: int) -> list[dict]:
    """
    Up to `limit` rows, newest first, spread over companies: one per company
    first, then a second each, and so on. Fourteen titles from one employer
    describe that employer, not the level.
    """
    by_company: dict[str, list[dict]] = defaultdict(list)
    for row in rows:
        by_company[(row.get("company") or "").strip().lower()].append(row)
    picked, depth = [], 0
    while len(picked) < limit and any(len(group) > depth for group in by_company.values()):
        # dict order is first-seen order, so each round still runs newest first.
        picked += [group[depth] for group in by_company.values() if len(group) > depth][:limit - len(picked)]
        depth += 1
    return picked


def _date(value) -> str | None:
    if value is None:
        return None
    if isinstance(value, str):
        return value[:10] or None
    return value.date().isoformat() if isinstance(value, datetime) else value.isoformat()


def _ad(row: dict, level: str) -> dict:
    profile = row["profile"]
    return {
        "lvl": level,
        "title": row.get("title") or "",
        "company": row.get("company") or "",
        "location": row.get("location") or "",
        "remote": bool(row.get("remote")),
        "posted": _date(row.get("posted_at")),
        "url": row["url"],
        # A required figure only: "ideally 5 years" is not what the job asks.
        "years": profile.get("years") if profile.get("years_kind") == "required" else None,
        "req": list(profile.get("required") or ()),
        "pref": list(profile.get("preferred") or ()),
    }


def _family(rows: list[dict]) -> dict:
    seniority = Counter({name: 0 for name in (*LEVELS, "unstated")})
    skills: Counter = Counter()
    readable = 0
    by_level: dict[str, list[dict]] = {level: [] for level in LEVELS}
    for row in rows:
        profile = row["profile"]
        level = bucket(profile.get("seniority"))
        seniority[level] += 1
        if level in by_level:
            by_level[level].append(row)
        if profile.get("thin"):
            continue
        readable += 1
        # required, preferred and mentioned never share a skill (requirements._skills),
        # so this counts jobs naming it, not mentions.
        for kind in snapshot.KINDS:
            skills.update(profile.get(kind) or ())

    titles, ads = [], []
    for level, level_rows in by_level.items():
        titles += [[row.get("title") or "", row.get("company") or "", level]
                   for row in _varied(level_rows, TITLES_PER_LEVEL)]
        candidates = [row for row in level_rows if row.get("url") and not row["profile"].get("thin")
                      and len(row["profile"].get("required") or ()) >= MIN_AD_SKILLS]
        ads += [_ad(row, level) for row in _varied(candidates, ADS_PER_LEVEL)]

    top = sorted(skills.items(), key=lambda kv: (-kv[1], kv[0]))[:SKILLS_PER_FAMILY]
    return {"jobs": len(rows), "readable": readable, "seniority": dict(seniority),
            "skills": dict(top), "titles": titles, "ads": ads}


def aggregate(rows: list[dict], taken_at: datetime | None = None) -> dict:
    """Pool rows (newest first, as profile_repository.POOL returns them) -> the /market/look body."""
    by_family: dict[str, list[dict]] = defaultdict(list)
    for row in snapshot.counted(rows):
        family = row["profile"].get("family")
        if family in TECH_FAMILIES:
            by_family[family].append(row)

    families = {name: _family(by_family[name]) for name in sorted(by_family)}
    keys = {key for f in families.values() for key in f["skills"]}
    keys |= {key for f in families.values() for ad in f["ads"] for key in (*ad["req"], *ad["pref"])}
    taken_at = taken_at or datetime.now(timezone.utc)
    return {
        "taken_at": taken_at.astimezone(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ"),
        "profiler_version": PROFILER_VERSION,
        "families": families,
        "skills": {key: display(key) for key in sorted(keys)},
    }


def week_of(moment: datetime) -> date:
    """The Monday that starts `moment`'s ISO week, in UTC."""
    day = moment.astimezone(timezone.utc).date()
    return day - timedelta(days=day.weekday())


def bodies(rows: list[dict], as_of: datetime) -> dict:
    """
    The landing count and every market page, from one read of the pool, so
    they always agree. `as_of` is when the jobs were collected: every body's
    taken_at, and its `week`, the Monday of that week, which the pages date by.
    """
    week = week_of(as_of).isoformat()
    return {"look": {**aggregate(rows, as_of), "week": week},
            "pages": {name: {**body, "week": week} for name, body in market_pages.build(rows, as_of).items()}}


def compute() -> dict:
    """The live count, for before the first publication: the pool as it stands, dated by its latest sighting."""
    if not is_configured():
        raise NotAvailable("The count isn't available right now.")
    with connection() as conn:
        rows = snapshot.pool_rows(conn)
        as_of = profile_repository.last_refresh(conn) or datetime.now(timezone.utc)
    return bodies(rows, as_of)


def published(known: int | None = None) -> tuple[int, dict] | None:
    """
    (id, bodies) of the latest publication; None when nothing is published
    yet, no database, or migration 019 not applied. With `known`, the id
    already held, the payload is read only when a newer one exists: (known, {})
    otherwise.
    """
    if not is_configured():
        return None
    try:
        with connection() as conn:
            latest = publication_repository.latest_id(conn)
            if latest is None:
                return None
            if latest == known:
                return known, {}
            row = publication_repository.latest(conn)
    except errors.UndefinedTable:
        return None
    return row["id"], {"look": row["look"], "pages": row["pages"]}


# One value for the whole process: every visitor sees the same count. Startup
# loads it in the background, a timer checks for a newer publication every
# REFRESH_SECONDS, and a request only ever reads what is there. A failed load
# keeps the last good one. decisions/market-publication.md
REFRESH_SECONDS = 10 * 60
CACHE_SECONDS = 3600
RETRY_SECONDS = 15
# (loaded at, bodies, publication id or None for a live count)
_cache: tuple[float, dict, int | None] | None = None
_lock = threading.Lock()
_building = threading.Lock()


class NotReady(NotAvailable):
    """Nothing loaded yet: the first load is still running."""


def refresh(now=time.monotonic) -> bool:
    """
    Load the latest publication, or count the live pool when none exists yet.
    One at a time; False if one was already running or it failed. Once a
    publication has been served, this never counts the pool again.
    """
    global _cache
    if not _building.acquire(blocking=False):
        return False
    try:
        with _lock:
            held = _cache
        found = published(held[2] if held else None)
        if found is not None and held is not None and found[0] == held[2]:
            body, pub_id = held[1], held[2]          # nothing newer: keep it, and check again later
        elif found is not None:
            pub_id, body = found
        elif held is not None and held[2] is not None:
            return False                             # a publication vanished: keep serving it
        else:
            body, pub_id = compute(), None
    except Exception as err:  # keep serving the last good count
        print(f"market count refresh failed: {err!r}")
        return False
    else:
        with _lock:
            _cache = (now(), body, pub_id)
        return True
    finally:
        _building.release()


def _refresh_in_background() -> None:
    threading.Thread(target=refresh, name="market-look-refresh", daemon=True).start()


def _built(now=time.monotonic) -> dict:
    """What refresh() last loaded. Never loads it here; an old one starts a refresh beside it."""
    with _lock:
        cached = _cache
    if cached is None:
        if not is_configured():
            raise NotAvailable("The count isn't available right now.")
        if not _building.locked():
            _refresh_in_background()  # the startup load failed or never ran
        raise NotReady("The count is loading. Try again in a few seconds.")
    if now() - cached[0] >= REFRESH_SECONDS and not _building.locked():
        _refresh_in_background()
    return cached[1]


def look(now=time.monotonic) -> dict:
    """The published count."""
    return _built(now)["look"]


def page(name: str, now=time.monotonic) -> dict | None:
    """A published market page, or None for a page that doesn't exist."""
    if name not in market_pages.PAGES:
        return None
    return _built(now)["pages"].get(name)


def forget() -> None:
    global _cache
    with _lock:
        _cache = None
