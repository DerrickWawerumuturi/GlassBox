"""
source_runs, and the closing rule's SQL (decisions/job-sources.md, "Closing jobs").

Each function runs inside the caller's transaction: the collector saves one
source at a time (ingestion.persist_source), so one source's failure never
touches another's jobs.
"""
from statistics import median

# A fetch is full only with at least this share of the source's usual count:
# APIs fail by answering 200 with an empty or short list.
FULL_SHARE = 0.5
# The usual count: the median of this many recent successful fetches, so one
# odd answer doesn't move it and a real change in a board's size does in time.
USUAL_OF = 5
# Missed full fetches in a row that close a job.
CLOSE_AFTER = 2
# A source failing every fetch for this long is retired.
RETIRE_DAYS = 7

RECORD = """
insert into source_runs (run_at, source, ok, jobs, whole, closed, error)
values (%(run_at)s, %(source)s, %(ok)s, %(jobs)s, %(whole)s, %(closed)s, %(error)s)
"""

RECENT_COUNTS = """
select jobs from source_runs
where source = %s and ok
order by run_at desc
limit %s
"""

# Open jobs of this source that the fetch didn't list: one more miss each.
MISS = """
update jobs set missed_fetches = missed_fetches + 1
where source = %(source)s and closed_at is null and id <> all(%(seen)s::bigint[])
"""

CLOSE = """
update jobs set closed_at = now()
where source = %(source)s and closed_at is null and missed_fetches >= %(after)s
"""

CLOSE_ALL = "update jobs set closed_at = now() where source = %s and closed_at is null"
MARK_RETIRED = "update source_runs set retired = true, closed = %s where source = %s and run_at = %s"

# Sources that failed in this run and every fetch since their last success (or
# ever), the first of those failures RETIRE_DAYS or more ago; `marked` once
# retired. A source taken out of companies.txt isn't fetched, so it drops out.
RETIRING = """
with last_ok as (
    select source, max(run_at) as at from source_runs where ok group by source
), streak as (
    select r.source, min(r.run_at) as since, max(r.run_at) as latest, bool_or(r.retired) as marked
    from source_runs r left join last_ok o on o.source = r.source
    where not r.ok and r.run_at > coalesce(o.at, '-infinity')
    group by r.source
)
select source, since, marked from streak
where since <= %(run_at)s - make_interval(days => %(days)s) and latest = %(run_at)s
order by source
"""


def record(conn, run_at, source: str, ok: bool, jobs: int = 0, whole: bool = False, closed: int = 0,
           error: str | None = None) -> None:
    with conn.cursor() as cur:
        cur.execute(RECORD, {"run_at": run_at, "source": source, "ok": ok, "jobs": jobs, "whole": whole,
                             "closed": closed, "error": error})


def usual(conn, source: str) -> float | None:
    """The median job count of the source's last USUAL_OF successful fetches; None with no history."""
    with conn.cursor() as cur:
        cur.execute(RECENT_COUNTS, (source, USUAL_OF))
        counts = [row["jobs"] for row in cur.fetchall()]
    return median(counts) if counts else None


def is_full(listed: int, usual_count: float | None) -> bool:
    """Whether a complete read is big enough to close jobs: never an empty one, never under half the usual count."""
    if listed <= 0:
        return False
    return usual_count is None or listed >= FULL_SHARE * usual_count


def close_missing(conn, source: str, seen: list[int]) -> int:
    """After a full fetch: one more miss for each open job it didn't list, then close those missed CLOSE_AFTER times."""
    with conn.cursor() as cur:
        cur.execute(MISS, {"source": source, "seen": seen})
        cur.execute(CLOSE, {"source": source, "after": CLOSE_AFTER})
        return cur.rowcount


def retiring(conn, run_at, days: int = RETIRE_DAYS) -> list[dict]:
    """Sources that have failed every fetch for `days` days: [{source, since, marked}], marked once retired."""
    with conn.cursor() as cur:
        cur.execute(RETIRING, {"run_at": run_at, "days": days})
        return cur.fetchall()


def retire(conn, run_at, source: str) -> int:
    """Close every open job of a source that has failed for RETIRE_DAYS, and mark this run's failed fetch retired."""
    with conn.cursor() as cur:
        cur.execute(CLOSE_ALL, (source,))
        closed = cur.rowcount
        cur.execute(MARK_RETIRED, (closed, source, run_at))
    return closed
