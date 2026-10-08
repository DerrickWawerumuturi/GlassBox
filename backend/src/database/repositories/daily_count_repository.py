"""daily_counts: one row per UTC day of server side totals (decisions/analytics.md)."""

COLUMNS = ("scans_started", "scans_finished", "scans_failed", "cv_reused", "accounts_created")

# One statement, so two requests counting at once both land: the conflict
# branch adds to whatever the row holds when it runs.
INCREMENT = """
insert into daily_counts (day, {columns}) values ((now() at time zone 'utc')::date, {ones})
on conflict (day) do update set {adds}
"""

# Every day in the window, a day without a row as zeros: a quiet day is a fact too.
RECENT = """
select d::date as day, {columns}
from generate_series((now() at time zone 'utc')::date - (%(days)s - 1), (now() at time zone 'utc')::date,
                     interval '1 day') as d
left join daily_counts c on c.day = d::date
order by day
"""


def increment(conn, events: tuple[str, ...]) -> None:
    """Adds one to each named counter on today's row. Names come from COLUMNS only: they are spliced into SQL."""
    unknown = set(events) - set(COLUMNS)
    if unknown or not events:
        raise ValueError(f"not a daily count: {sorted(unknown) or events}")
    columns = list(dict.fromkeys(events))
    sql = INCREMENT.format(columns=", ".join(columns), ones=", ".join("1" for _ in columns),
                           adds=", ".join(f"{c} = daily_counts.{c} + 1" for c in columns))
    with conn.cursor() as cur:
        cur.execute(sql)


def recent(conn, days: int) -> list[dict]:
    """The last `days` UTC days, oldest first, today included."""
    sql = RECENT.format(columns=", ".join(f"coalesce(c.{c}, 0) as {c}" for c in COLUMNS))
    with conn.cursor() as cur:
        cur.execute(sql, {"days": days})
        return cur.fetchall()
