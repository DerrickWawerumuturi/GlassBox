from psycopg.types.json import Jsonb

# The posting fields profile_job reads, hashed exactly as requirements.content_hash
# does it — concat_ws skips NULLs the way the Python join does.
_CONTENT = "md5(concat_ws('|', j.title, j.description, j.experience_level, j.employment_type))"

# Jobs with no profile, a profile from older rules, or text that changed since.
STALE = f"""
select j.id, j.title, j.company, j.description, j.experience_level, j.employment_type
from jobs j
left join job_profiles p on p.job_id = j.id
where j.archived_at is null
  and j.id > %(after)s
  and (%(ids)s::bigint[] is null or j.id = any(%(ids)s::bigint[]))
  and (p.job_id is null or p.profiler_version <> %(version)s or p.content_hash <> {_CONTENT})
order by j.id
limit %(limit)s
"""

UPSERT = """
insert into job_profiles (job_id, profiler_version, content_hash, family, seniority, profile)
values {rows}
on conflict (job_id) do update set
    profiler_version = excluded.profiler_version,
    content_hash     = excluded.content_hash,
    family           = excluded.family,
    seniority        = excluded.seniority,
    profile          = excluded.profile,
    profiled_at      = now()
"""

# The live pool, with profiles, for the role families a candidate points at.
# Liveness mirrors PoolProvider: a board the daily fetch reads in full must have
# been seen in the last few days; anything else gets a plain age limit, because
# a missed sighting says nothing about a posting only found by searching.
_LIVE = """
from jobs j
join job_profiles p on p.job_id = j.id and p.profiler_version = %(version)s
where j.archived_at is null
  and p.family = any(%(families)s::text[])
  and p.seniority <> all(%(too_senior)s::text[])
  and coalesce(j.posted_at, j.first_seen_at) > now() - make_interval(days => %(age)s)
  and (j.last_seen_at > now() - make_interval(days => %(live)s)
       or (j.provider <> all(%(refreshed)s::text[])
           and j.last_seen_at > now() - make_interval(days => %(unverified)s)))
order by coalesce(j.posted_at, j.first_seen_at) desc
limit %(limit)s
"""
POOL = """
select j.id, j.provider, j.title, j.company, j.location, j.remote, j.remote_eligibility,
       j.employment_type, j.salary_min, j.salary_max, j.salary_currency, j.salary_period, j.url,
       j.posted_at, j.posted_at_raw, j.first_seen_at, j.last_seen_at, j.raw_payload ->> 'workplaceType' as workplace_type,
       p.profile""" + _LIVE

# The same pool, with only what the market counts read (snapshot.py, market_look.py).
# Reading raw_payload and the whole profile for ~13k rows moved ~8 MB and took
# 4-9 s from Neon; this is a fraction of it.
COUNTED = """
select j.provider, j.title, j.company, j.location, j.remote, j.url, j.posted_at,
       jsonb_build_object('family', p.profile -> 'family', 'seniority', p.profile -> 'seniority',
                          'thin', p.profile -> 'thin', 'years', p.profile -> 'years',
                          'years_kind', p.profile -> 'years_kind', 'required', p.profile -> 'required',
                          'preferred', p.profile -> 'preferred', 'mentioned', p.profile -> 'mentioned') as profile""" + _LIVE

# The opposite of STALE, for given jobs: profiles that still describe their posting.
FRESH = f"""
select p.job_id, p.profile
from job_profiles p
join jobs j on j.id = p.job_id
where p.job_id = any(%(ids)s::bigint[]) and p.profiler_version = %(version)s and p.content_hash = {_CONTENT}
"""

PROFILE_FOR_JOB = """
select j.id, j.title, j.location, j.remote, j.remote_eligibility, p.profile, p.profiler_version
from jobs j left join job_profiles p on p.job_id = j.id
where j.id = %s
"""

LAST_REFRESH = "select max(last_seen_at) as refreshed_at from jobs"

BATCH_SIZE = 500


def stale(conn, version: str, ids: list[int] | None = None, after: int = 0, limit: int = BATCH_SIZE) -> list[dict]:
    with conn.cursor() as cur:
        cur.execute(STALE, {"version": version, "ids": ids, "after": after, "limit": limit})
        return cur.fetchall()


def upsert(conn, rows: list[tuple[int, str, str, str, str, dict]]) -> int:
    """rows: (job_id, profiler_version, content_hash, family, seniority, profile)."""
    for start in range(0, len(rows), BATCH_SIZE):
        chunk = rows[start:start + BATCH_SIZE]
        sql = UPSERT.format(rows=", ".join(["(%s, %s, %s, %s, %s, %s)"] * len(chunk)))
        params = [v for row in chunk for v in (*row[:5], Jsonb(row[5]))]
        with conn.cursor() as cur:
            cur.execute(sql, params)
    return len(rows)


def fresh(conn, version: str, ids: list[int]) -> dict[int, dict]:
    with conn.cursor() as cur:
        cur.execute(FRESH, {"version": version, "ids": ids})
        return {row["job_id"]: row["profile"] for row in cur.fetchall()}


def pool(conn, params: dict) -> list[dict]:
    with conn.cursor() as cur:
        cur.execute(POOL, params)
        return cur.fetchall()


def counted_pool(conn, params: dict) -> list[dict]:
    """The pool as the market counts read it: the POOL rows, fewer columns."""
    with conn.cursor() as cur:
        cur.execute(COUNTED, params)
        return cur.fetchall()


def for_job(conn, job_id: int) -> dict | None:
    with conn.cursor() as cur:
        cur.execute(PROFILE_FOR_JOB, (job_id,))
        return cur.fetchone()


def last_refresh(conn):
    with conn.cursor() as cur:
        cur.execute(LAST_REFRESH)
        return cur.fetchone()["refreshed_at"]
