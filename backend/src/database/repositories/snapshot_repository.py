from psycopg.types.json import Jsonb

# Taken once a day by the collector's first run (snapshot.take); a run by hand
# replaces that day's row rather than adding an extra sighting.
UPSERT = """
insert into market_snapshots (taken_on, profiler_version, family, postings, readable, seniority, skills)
values {rows}
on conflict (taken_on, profiler_version, family) do update set
    postings  = excluded.postings,
    readable  = excluded.readable,
    seniority = excluded.seniority,
    skills    = excluded.skills,
    taken_at  = now()
"""


TAKEN = "select 1 from market_snapshots where taken_on = %s and profiler_version = %s limit 1"


def taken(conn, taken_on, version: str) -> bool:
    """Whether a snapshot for this day and profiler version is stored already."""
    with conn.cursor() as cur:
        cur.execute(TAKEN, (taken_on, version))
        return cur.fetchone() is not None


def upsert(conn, taken_on, version: str, summaries: dict[str, dict]) -> int:
    """summaries: family -> {"postings", "readable", "seniority", "skills"}."""
    if not summaries:
        return 0
    sql = UPSERT.format(rows=", ".join(["(%s, %s, %s, %s, %s, %s, %s)"] * len(summaries)))
    params = [v for family, s in summaries.items()
              for v in (taken_on, version, family, s["postings"], s["readable"],
                        Jsonb(s["seniority"]), Jsonb(s["skills"]))]
    with conn.cursor() as cur:
        cur.execute(sql, params)
    return len(summaries)
