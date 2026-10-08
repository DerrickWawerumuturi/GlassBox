"""
The weekly market publication: the only thing /market/look and /market/page/*
serve once one exists (decisions/market-publication.md).

    python -m src.jobpool.publish                      publish this week's market if it is due
    python -m src.jobpool.publish --now                build and check one now, even if this week has one
    python -m src.jobpool.publish --accept 2026-10-12  the same, with that week's size swing accepted
    python -m src.jobpool.publish --status             the latest publications and why any was held back

Due: no publication yet for this ISO week (weeks start Monday 00:00 UTC). The
collector (daily.py) asks after every run, every 6 hours, so the first run of
the week builds a candidate from the pool it just refreshed. The candidate is
checked by GATES; if every one passes it is published, if not the rejection is
stored with its reasons, last week's market stays up, and the next run tries
again. A swing past SWING (a batch of new boards, say) waits for the founder:
`--accept <week>` publishes it with that one check waived and recorded.
"""
import sys
from datetime import date, datetime, timedelta, timezone

from src.database.repositories import profile_repository, publication_repository
from src.database.session import connection, is_configured
from src.jobpool import market_look, market_pages, snapshot
from src.jobpool.sources import MIN_HEALTHY_SOURCES
from src.matching.requirements import PROFILER_VERSION

# The gates, each named in the stored result. Numbers from 2026-10-08: 17,467
# counted jobs, every page at 274 readable jobs or more.
FRESH_HOURS = 24          # a successful collection run this recent
MIN_COVERAGE = 0.9        # healthy sources carry this share of last week's jobs
MIN_JOBS = 5_000          # counted jobs, every job type
SWING = (-0.25, 0.60)     # total against the last publication: 80 new boards moved it +54% on 2026-10-08
GATES = ("fresh", "profiles", "coverage", "jobs", "pages", "swing")


def parse_week(text: str) -> date:
    """"2026-10-12" (its Monday) or "2026-W42" -> the week's Monday."""
    if "W" in text.upper():
        year, _, number = text.upper().partition("-W")
        return date.fromisocalendar(int(year), int(number), 1)
    day = date.fromisoformat(text)
    return day - timedelta(days=day.weekday())


def candidate(conn, now: datetime) -> dict:
    """This week's market from the pool as it stands: {collection, as_of, jobs, look, pages}."""
    collection = publication_repository.latest_collection(conn, now, FRESH_HOURS, MIN_HEALTHY_SOURCES)
    as_of = collection["finished"] if collection else (profile_repository.last_refresh(conn) or now)
    rows = snapshot.pool_rows(conn)
    return {"collection": collection, "as_of": as_of, "jobs": sum(1 for _ in snapshot.counted(rows)),
            **market_look.bodies(rows, as_of)}


def gates(conn, cand: dict, previous: dict | None, now: datetime, accept: bool = False) -> list[dict]:
    """Each check on a candidate: [{"gate", "ok", "detail"}], in GATES order. `previous` is the last publication."""
    out = []

    def gate(name: str, ok: bool, detail: str) -> None:
        out.append({"gate": name, "ok": bool(ok), "detail": detail})

    run = cand["collection"]
    gate("fresh", run is not None,
         f"collected {run['finished']:%Y-%m-%d %H:%M} UTC, {run['ok']} of {run['sources']} sources answered" if run
         else f"no successful collection in the last {FRESH_HOURS} hours")

    stale = profile_repository.stale(conn, PROFILER_VERSION, None, 0, 1)
    gate("profiles", not stale, f"every job read by profiler {PROFILER_VERSION}" if not stale
         else f"jobs still to read under profiler {PROFILER_VERSION}")

    cover = publication_repository.coverage(conn, now)
    share = cover["healthy"] / cover["total"] if cover["total"] else None
    gate("coverage", share is None or share >= MIN_COVERAGE,
         "no source history from last week yet" if share is None
         else f"healthy sources carry {share:.0%} of last week's {cover['total']:,} jobs (at least {MIN_COVERAGE:.0%})")

    gate("jobs", cand["jobs"] >= MIN_JOBS, f"{cand['jobs']:,} jobs counted (at least {MIN_JOBS:,})")

    live = [name for name, body in ((previous or {}).get("pages") or {}).items() if body.get("publishable")]
    short = [f"{name} {cand['pages'].get(name, {}).get('readable', 0):,}" for name in live
             if cand["pages"].get(name, {}).get("readable", 0) < market_pages.MIN_READABLE]
    gate("pages", not short, f"readable jobs under {market_pages.MIN_READABLE}: {', '.join(short)}" if short
         else f"every page live last time has {market_pages.MIN_READABLE} readable jobs or more" if live
         else "no page was live last time" if previous else "no earlier publication to compare pages with")

    if previous is None:
        gate("swing", True, "no earlier publication to compare with")
    else:
        change = round(cand["jobs"] / previous["jobs"] - 1, 4) if previous["jobs"] else float("inf")
        within = SWING[0] <= change <= SWING[1]
        detail = (f"{cand['jobs']:,} jobs against {previous['jobs']:,} last time ({change:+.0%}; "
                  f"allowed {SWING[0]:+.0%} to {SWING[1]:+.0%})")
        gate("swing", within or accept, detail + ("" if within or not accept else ", accepted by the founder"))
    return out


def run(now: datetime | None = None, force: bool = False, accept: date | None = None) -> dict | None:
    """
    Publish this week's market if it is due (or `force`, or `accept`ing this
    week's swing). Returns None when not due, else {"id", "status", "week",
    "jobs", "gates"}: the stored row, published or rejected.
    """
    if not is_configured():
        return None
    now = now or datetime.now(timezone.utc)
    week = market_look.week_of(now)
    if accept is not None and accept != week:
        raise ValueError(f"only this week's market can be accepted: the week of {week.isoformat()}")
    with connection() as conn:
        if not force and accept is None and publication_repository.published_for(conn, week):
            return None
        cand = candidate(conn, now)
        checks = gates(conn, cand, publication_repository.latest(conn), now, accept=accept is not None)
        status = "published" if all(g["ok"] for g in checks) else "rejected"
        kept = status == "published"
        row_id = publication_repository.insert(conn, week, cand["as_of"], status, PROFILER_VERSION, cand["jobs"],
                                               checks, cand["look"] if kept else None, cand["pages"] if kept else None)
    return {"id": row_id, "status": status, "week": week, "jobs": cand["jobs"], "gates": checks}


def held_back(result: dict) -> str:
    """The failed checks of a rejected candidate, one line."""
    return "; ".join(f"{g['gate']}: {g['detail']}" for g in result["gates"] if not g["ok"])


def _print(result: dict | None) -> None:
    if result is None:
        print("this week's market is already published; nothing to do (--now builds one anyway)")
        return
    print(f"week of {result['week'].isoformat()}: {result['status']} (row {result['id']}, {result['jobs']:,} jobs)")
    for g in result["gates"]:
        print(f"  {'pass' if g['ok'] else 'FAIL'}  {g['gate']:<9} {g['detail']}")


def status() -> None:
    with connection() as conn:
        rows = publication_repository.recent(conn)
    if not rows:
        print("nothing published yet: /market serves the live count until the first publication")
    for row in rows:
        when = f"published {row['published_at']:%Y-%m-%d %H:%M}" if row["published_at"] else f"rejected {row['created_at']:%Y-%m-%d %H:%M}"
        print(f"row {row['id']}  week of {row['week']}  {when} UTC  as of {row['as_of']:%Y-%m-%d %H:%M}  "
              f"{row['jobs']:,} jobs  profiler {row['profiler_version']}")
        for g in row["gates"]:
            if not g["ok"]:
                print(f"    FAIL {g['gate']}: {g['detail']}")


def main(argv: list[str]) -> int:
    if not is_configured():
        print("no DATABASE_URL; nothing to publish")
        return 1
    if "--status" in argv:
        status()
        return 0
    accept = parse_week(argv[argv.index("--accept") + 1]) if "--accept" in argv else None
    result = run(force="--now" in argv, accept=accept)
    _print(result)
    return 0 if result is None or result["status"] == "published" else 1


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
