"""
Today's count for the landing page: what the live pool asks for, per role family.

    look()          the cached result for GET /market/look (recomputed about hourly)
    aggregate(rows) pool rows -> the response body; pure, so it is tested without a database

Counted exactly as the daily snapshot counts (decisions/market-snapshots.md):
snapshot.counted() keeps daily-fetch postings only and a role listed on two
boards once, and skills are counted over readable (non-thin) jobs. The only
difference is that this is live, not stored.

Never returned: a job's text. Titles carry the title and company; sample ads
carry the fields a job card shows and the skills read from the ad, nothing a
reader could reconstruct the ad from (decisions/market-look.md).
"""
import threading
import time
from collections import Counter, defaultdict
from datetime import datetime, timezone

from src.database.session import connection, is_configured
from src.jobpool import snapshot
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
CACHE_SECONDS = 3600


class NotAvailable(RuntimeError):
    """No database configured: there is no pool to count."""


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


def compute() -> dict:
    if not is_configured():
        raise NotAvailable("Today's count isn't available right now.")
    with connection() as conn:
        rows = snapshot.pool_rows(conn)
    return aggregate(rows)


# One value for the whole process: every visitor sees the same count, and the
# pool only changes once a day. Building it reads the whole pool (about 6s on
# the live database), so no request ever builds it: startup builds it in the
# background, a timer rebuilds it every REFRESH_SECONDS, and a request only ever
# reads what is there (stale while a rebuild runs). A failed rebuild keeps the
# last good count. decisions/market-look.md
REFRESH_SECONDS = 50 * 60
RETRY_SECONDS = 15
_cache: tuple[float, dict] | None = None
_lock = threading.Lock()
_building = threading.Lock()


class NotReady(NotAvailable):
    """Nothing built yet: the first build is still running."""


def refresh(now=time.monotonic) -> bool:
    """Rebuild the count. One rebuild at a time; False if one was already running or it failed."""
    global _cache
    if not _building.acquire(blocking=False):
        return False
    try:
        body = compute()
    except Exception as err:  # keep serving the last good count
        print(f"market look refresh failed: {err!r}")
        return False
    else:
        with _lock:
            _cache = (now(), body)
        return True
    finally:
        _building.release()


def _refresh_in_background() -> None:
    threading.Thread(target=refresh, name="market-look-refresh", daemon=True).start()


def look(now=time.monotonic) -> dict:
    """Today's count as last built. Never builds it here; an old one starts a rebuild beside it."""
    with _lock:
        cached = _cache
    if cached is None:
        if not is_configured():
            raise NotAvailable("Today's count isn't available right now.")
        if not _building.locked():
            _refresh_in_background()  # the startup build failed or never ran
        raise NotReady("Today's count is being made. Try again in a few seconds.")
    if now() - cached[0] >= CACHE_SECONDS and not _building.locked():
        _refresh_in_background()
    return cached[1]


def forget() -> None:
    global _cache
    with _lock:
        _cache = None
