"""
What the live pool asks for today, counted per role family and stored.

    python -m src.jobpool.snapshot      take today's snapshot now (re-running replaces it)

The daily refresh calls take() after profiling (daily.py). Profiles describe a
posting as it is now and jobs will not be kept forever, so these counts are the
only record of what the market asked for on a given day: what monthly posts and
public role pages compare against (decisions/market-snapshots.md).

The pool counted is the one Opportunities reads (profile_repository.POOL), for
every family and level, so "live" means the same thing in both. Only postings
the daily fetch collects are counted: users' scans and pasted links also land in
the pool, but they are someone's private search, some sources' terms keep their
data private (JSearch, Jooble), and they would make the counts depend on who
used the app that day rather than on the market.
"""
from collections import Counter
from datetime import datetime, timezone

from src.database.repositories import profile_repository, snapshot_repository
from src.database.session import connection, is_configured
from src.jobpool.opportunities import duplicate_key
from src.jobpool.sources import FULL_BOARDS, KENYAN_BOARDS, POOL_WINDOWS
from src.matching.requirements import PROFILER_VERSION
from src.matching.roles import TECH_FAMILIES

ALL_FAMILIES = sorted(TECH_FAMILIES | {"ai_data", "non_tech", "other"})
# Every provider the daily fetch reads (sources.fetch_all). Anything else came
# from a user: a scan's providers or a pasted link ("url").
DAILY_SOURCES = frozenset(FULL_BOARDS) | frozenset(KENYAN_BOARDS)
# Far above the pool's size (~16k), so nothing live is cut off.
POOL_LIMIT = 200_000
KINDS = ("required", "preferred", "mentioned")


def summarise(rows: list[dict]) -> dict[str, dict]:
    """
    Pool rows (newest first) -> family -> {"postings", "readable", "seniority", "skills"}.

    Only postings from the daily fetch (DAILY_SOURCES). The same role on two
    boards or in two cities counts once, as on the Opportunities page. Thin
    profiles count as postings but not toward skills: a posting too short to
    read says nothing about what is required.
    """
    seen: set[str] = set()
    out: dict[str, dict] = {}
    for row in rows:
        if row.get("provider") not in DAILY_SOURCES:
            continue
        key = duplicate_key(row.get("company"), row.get("title"))
        if key in seen:
            continue
        seen.add(key)

        profile = row["profile"]
        summary = out.setdefault(profile["family"], {"postings": 0, "readable": 0, "seniority": Counter(), "skills": {}})
        summary["postings"] += 1
        summary["seniority"][profile["seniority"]] += 1
        if profile.get("thin"):
            continue
        summary["readable"] += 1
        for i, kind in enumerate(KINDS):
            for skill in profile.get(kind) or ():
                summary["skills"].setdefault(skill, [0, 0, 0])[i] += 1

    for summary in out.values():
        summary["seniority"] = dict(summary["seniority"])
    return out


def take() -> int | None:
    """Count and store today's snapshot. Returns the families written, None when no database."""
    if not is_configured():
        return None
    with connection() as conn:
        rows = profile_repository.pool(conn, {
            **POOL_WINDOWS, "version": PROFILER_VERSION, "families": ALL_FAMILIES,
            "too_senior": [], "refreshed": list(FULL_BOARDS), "limit": POOL_LIMIT,
        })
        summaries = summarise(rows)
        taken_on = datetime.now(timezone.utc).date()
        return snapshot_repository.upsert(conn, taken_on, PROFILER_VERSION, summaries)


if __name__ == "__main__":
    written = take()
    print("no DATABASE_URL; nothing taken" if written is None else f"snapshot: {written} families")
