"""market_publications: the weekly public market (decisions/market-publication.md)."""
from psycopg.types.json import Jsonb

LATEST_ID = """
select id from market_publications where status = 'published'
order by published_at desc, id desc limit 1
"""

LATEST = """
select id, week, as_of, published_at, profiler_version, jobs, gates, look, pages
from market_publications where status = 'published'
order by published_at desc, id desc limit 1
"""

RECENT = """
select id, week, as_of, published_at, created_at, status, profiler_version, jobs, gates
from market_publications order by id desc limit %s
"""

PUBLISHED_FOR = "select 1 from market_publications where status = 'published' and week = %s limit 1"

INSERT = """
insert into market_publications (week, as_of, published_at, status, profiler_version, jobs, gates, look, pages)
values (%(week)s, %(as_of)s, case when %(status)s = 'published' then now() end, %(status)s,
        %(profiler_version)s, %(jobs)s, %(gates)s, %(look)s, %(pages)s)
returning id
"""

# The latest successful collection run in the window: a run where at least half
# the sources answered (the run's own floor, daily.MIN_HEALTHY_SOURCES).
LATEST_COLLECTION = """
select run_at, max(finished_at) filter (where ok) as finished,
       count(*) filter (where ok) as ok, count(*) as sources
from source_runs
where run_at > %(now)s - make_interval(hours => %(hours)s)
group by run_at
having count(*) filter (where ok) >= %(share)s * count(*)
order by run_at desc
limit 1
"""

# Each source's latest good count from a week ago (1 to 8 days back), and
# whether it answered in the last day: what share of last week's jobs the
# healthy sources carry.
COVERAGE = """
with healthy as (
    select distinct source from source_runs
    where ok and run_at > %(now)s - interval '24 hours'
), last_week as (
    select distinct on (source) source, jobs from source_runs
    where ok and run_at <= %(now)s - interval '24 hours' and run_at > %(now)s - interval '8 days'
    order by source, run_at desc
)
select coalesce(sum(jobs), 0) as total,
       coalesce(sum(jobs) filter (where source in (select source from healthy)), 0) as healthy
from last_week
"""


def latest_id(conn) -> int | None:
    with conn.cursor() as cur:
        cur.execute(LATEST_ID)
        row = cur.fetchone()
    return row["id"] if row else None


def latest(conn) -> dict | None:
    with conn.cursor() as cur:
        cur.execute(LATEST)
        return cur.fetchone()


def recent(conn, limit: int = 5) -> list[dict]:
    """The latest rows, published or rejected, without their payloads."""
    with conn.cursor() as cur:
        cur.execute(RECENT, (limit,))
        return cur.fetchall()


def published_for(conn, week) -> bool:
    with conn.cursor() as cur:
        cur.execute(PUBLISHED_FOR, (week,))
        return cur.fetchone() is not None


def insert(conn, week, as_of, status: str, profiler_version: str, jobs: int, gates: list[dict],
           look: dict | None = None, pages: dict | None = None) -> int:
    with conn.cursor() as cur:
        cur.execute(INSERT, {"week": week, "as_of": as_of, "status": status, "profiler_version": profiler_version,
                             "jobs": jobs, "gates": Jsonb(gates), "look": Jsonb(look) if look is not None else None,
                             "pages": Jsonb(pages) if pages is not None else None})
        return cur.fetchone()["id"]


def latest_collection(conn, now, hours: int, share: float) -> dict | None:
    with conn.cursor() as cur:
        cur.execute(LATEST_COLLECTION, {"now": now, "hours": hours, "share": share})
        return cur.fetchone()


def coverage(conn, now) -> dict:
    with conn.cursor() as cur:
        cur.execute(COVERAGE, {"now": now})
        return cur.fetchone()
