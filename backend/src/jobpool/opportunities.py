"""
The job pool matched to one user: what the Opportunities page shows.

    opportunity_service.list(payload, sort="newest") -> dict

Collection and matching are separate on purpose. The daily fetch fills and
profiles the pool once a day for everyone (daily.py); this matches it against
the user's CV as it is now, on request. Matching is arithmetic over stored
profiles — thousands of jobs in well under a second — so nothing per user is
stored and a CV edit shows on the next load instead of after a scan.

Newest first by default: a job's date is when its source says it was posted,
else an estimate from a relative "2 days ago", else when JobRadar fetched it,
and every row says which of the three it is.
"""
import hashlib
import json
import re
import time
from datetime import datetime
from types import SimpleNamespace

from src.database.repositories import profile_repository
from src.database.services.users import candidate_for, resolve_user_id
from src.database.session import connection
from src.jobpool.posting import posted_estimate, salary_text, workplace
from src.jobpool.sources import FULL_BOARDS, POOL_WINDOWS
from src.matching.matcher import FAMILY_LABELS, TIER_ORDER, match, related
from src.matching.requirements import PROFILER_VERSION, JobProfile
from src.matching.roles import RANK, TECH_FAMILIES
from src.matching.skills import display

# Newest jobs first, prefiltered by role family; more than any CV's market.
CANDIDATES = 5000
# What one response carries: every good fit, the newest stretches, and the
# closest of the out-of-reach jobs (they explain what stands in the way).
MAX_STRETCH = 200
MAX_UNLIKELY = 60
CACHE_SECONDS = 600
# Levels this far above a candidate are not even worth listing as out of reach.
TOO_SENIOR = 3


class NoProfile(Exception):
    pass


def _key(*parts) -> str:
    return " ".join(re.sub(r"[^a-z0-9]+", " ", " ".join(p or "" for p in parts).lower()).split())


_LEGAL = re.compile(r"\b(?:ltd|limited|inc|llc|plc|gmbh|co|corp|corporation|company|group|holdings)\b")
# Work arrangement, gender markers, intake year: the same role however it is labelled.
# Places stay — the same role in two cities can be local for one and abroad for the other.
_NOISE = re.compile(r"\b(?:remote|hybrid|onsite|on site|m|w|d|f|x|20\d\d|summer|winter|fall|spring)\b")


def duplicate_key(company: str | None, title: str | None) -> str:
    """One role at one employer, however many boards or cities list it."""
    return _LEGAL.sub(" ", _key(company)).strip() + "|" + " ".join(_NOISE.sub(" ", _key(title)).split())


def listed_at(row: dict) -> tuple[datetime, str]:
    """(date, basis): posted by the source, estimated from a relative phrase, or fetched by JobRadar."""
    if row.get("posted_at"):
        return row["posted_at"], "posted"
    estimate = posted_estimate(row.get("posted_at_raw"), row.get("last_seen_at"))
    if estimate:
        return estimate, "estimated"
    return row["first_seen_at"], "fetched"


def _families(candidate) -> list[str]:
    """Job families the candidate could plausibly fit, plus unclassified titles."""
    if not candidate.families:
        return sorted(TECH_FAMILIES | {"other"})
    fits = {family for family in TECH_FAMILIES | {"ai_data"}
            if max(s * related(f, family) for f, s in candidate.families.items()) >= 0.4}
    return sorted(fits | {"other"})


def _fingerprint(candidate) -> str:
    return hashlib.md5(json.dumps({
        "skills": sorted(candidate.skills), "families": candidate.families, "years": candidate.years,
        "titles": candidate.titles, "languages": sorted(candidate.languages), "phd": candidate.phd,
        "prefs": candidate.prefs.to_dict(),
    }, sort_keys=True).encode()).hexdigest()


def _item(row: dict, result) -> dict:
    when, basis = listed_at(row)
    job = SimpleNamespace(**row, raw={"workplaceType": row["workplace_type"]}, description=None)
    return {
        "job_id": row["id"], "provider": row["provider"], "title": row["title"], "company": row["company"],
        "location": row["location"], "remote": row["remote"], "workplace": workplace(job),
        "employment_type": row["employment_type"], "salary": salary_text(job), "url": row["url"],
        "listed_at": when.isoformat(), "date_basis": basis,
        "posted_at": row["posted_at"].isoformat() if row["posted_at"] else None,
        "fetched_at": row["first_seen_at"].isoformat(),
        "match": result.to_dict(),
        "also": [],
    }


def rank(candidate, rows: list[dict]) -> tuple[list[dict], dict]:
    """Every row matched, cross-posted duplicates folded into the best copy."""
    best: dict[str, dict] = {}
    for row in rows:
        item = _item(row, match(candidate, JobProfile.from_dict(row["profile"]), SimpleNamespace(**row)))
        key = duplicate_key(row["company"], row["title"])
        kept = best.get(key)
        order = (TIER_ORDER[item["match"]["tier"]], -item["match"]["score"])
        if kept is None or order < (TIER_ORDER[kept["match"]["tier"]], -kept["match"]["score"]):
            if kept:
                item["also"] = kept["also"] + [_where(kept)]
            best[key] = item
        elif len(kept["also"]) < 5:
            kept["also"].append(_where(item))
    items = list(best.values())
    counts = {tier: sum(1 for i in items if i["match"]["tier"] == tier) for tier in TIER_ORDER}
    return items, counts


def _where(item: dict) -> dict:
    return {"provider": item["provider"], "location": item["location"], "url": item["url"]}


def order(items: list[dict], sort: str) -> list[dict]:
    newest = lambda i: -datetime.fromisoformat(i["listed_at"]).timestamp()  # noqa: E731
    if sort == "match":
        return sorted(items, key=lambda i: (TIER_ORDER[i["match"]["tier"]], -i["match"]["score"], newest(i)))
    return sorted(items, key=lambda i: (newest(i), TIER_ORDER[i["match"]["tier"]], -i["match"]["score"]))


def select(items: list[dict], sort: str) -> list[dict]:
    """Every strong and good fit, the newest stretches, the closest of the rest."""
    fits = [i for i in items if i["match"]["tier"] in ("strong", "good")]
    stretch = order([i for i in items if i["match"]["tier"] == "stretch"], "newest")[:MAX_STRETCH]
    unlikely = order([i for i in items if i["match"]["tier"] == "unlikely"], "match")[:MAX_UNLIKELY]
    return order(fits + stretch + unlikely, sort)


def _profile_summary(candidate) -> dict:
    prefs = candidate.prefs
    return {
        "skills": sorted(display(s) for s in candidate.skills),
        "unmatched_skills": list(candidate.unmatched_skills),
        "families": [FAMILY_LABELS.get(f, f) for f, s in sorted(candidate.families.items(), key=lambda kv: -kv[1])],
        "years": candidate.years,
        "level": candidate.level("software"),
        "location": prefs.to_dict(),
    }


class OpportunityService:
    def __init__(self):
        self._cache: dict[tuple, tuple[float, dict]] = {}

    def list(self, payload, sort: str = "newest") -> dict:
        with connection() as conn:
            user_id = resolve_user_id(conn, payload, create=False)
            candidate = candidate_for(conn, user_id)
            if candidate is None:
                raise NoProfile("Add your CV so JobRadar can match the job pool to it")
            key = (payload["sub"], _fingerprint(candidate))
            cached = self._cache.get(key)
            if cached and cached[0] > time.monotonic():
                result = cached[1]
            else:
                top = max(RANK[candidate.level(t)] for t in ("software", "ml", "any"))
                rows = profile_repository.pool(conn, {
                    **POOL_WINDOWS, "version": PROFILER_VERSION, "families": _families(candidate),
                    "too_senior": [lvl for lvl, r in RANK.items() if r >= top + TOO_SENIOR],
                    "refreshed": list(FULL_BOARDS), "limit": CANDIDATES,
                })
                items, counts = rank(candidate, rows)
                refreshed = profile_repository.last_refresh(conn)
                result = {
                    "profile": _profile_summary(candidate),
                    "pool": {"refreshed_at": refreshed.isoformat() if refreshed else None,
                             "considered": len(rows), "window_days": POOL_WINDOWS["age"]},
                    "counts": counts,
                    "items": items,
                }
                self._cache = {k: v for k, v in self._cache.items() if v[0] > time.monotonic()}
                self._cache[key] = (time.monotonic() + CACHE_SECONDS, result)
        return {**{k: v for k, v in result.items() if k != "items"},
                "sort": sort, "opportunities": select(result["items"], sort)}

    def forget(self, payload) -> None:
        """Drop a user's cached lists: a scan has just added jobs they should show."""
        self._cache = {k: v for k, v in self._cache.items() if k[0] != payload.get("sub")}


opportunity_service = OpportunityService()
