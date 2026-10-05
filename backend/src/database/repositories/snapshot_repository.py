from psycopg.types.json import Jsonb

# Re-running on the same day replaces that day's row: the snapshot describes the
# pool as it stands after the latest refresh, not an extra sighting.
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
