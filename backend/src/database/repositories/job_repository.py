from psycopg.types.json import Jsonb

from src.database.models.job import JobIdentity, JobRecord, UpsertedJob

COLUMNS = (
    "provider", "external_id", "identity_source", "fingerprint",
    "title", "company", "description", "location", "remote",
    "employment_type", "experience_level",
    "salary_min", "salary_max", "salary_currency", "salary_period",
    "url", "posted_at", "posted_at_raw", "remote_eligibility",
    "raw_payload", "payload_hash",
)

# A later response is never allowed to null out a value we already hold, and
# first_seen_at is absent from the update list on purpose: it is the one
# timestamp that must never move. Three timestamps, three meanings:
#   first_seen_at  when JobRadar first fetched the posting (its "fetched at")
#   last_seen_at   the latest sighting — every daily run moves it
#   updated_at     the last time what we store actually changed
UPSERT = f"""
insert into jobs ({", ".join(COLUMNS)})
values {{rows}}
on conflict (provider, external_id) do update set
    last_seen_at     = now(),
    updated_at       = case
                           when excluded.payload_hash is distinct from jobs.payload_hash
                             or length(coalesce(excluded.description, ''))
                              > length(coalesce(jobs.description, ''))
                           then now()
                           else jobs.updated_at
                       end,
    title            = coalesce(excluded.title, jobs.title),
    company          = coalesce(excluded.company, jobs.company),
    description      = case
                           when length(coalesce(excluded.description, ''))
                              > length(coalesce(jobs.description, ''))
                           then excluded.description
                           else jobs.description
                       end,
    location         = coalesce(excluded.location, jobs.location),
    remote           = coalesce(excluded.remote, jobs.remote),
    employment_type  = coalesce(excluded.employment_type, jobs.employment_type),
    experience_level = coalesce(excluded.experience_level, jobs.experience_level),
    salary_min       = coalesce(excluded.salary_min, jobs.salary_min),
    salary_max       = coalesce(excluded.salary_max, jobs.salary_max),
    salary_currency  = coalesce(excluded.salary_currency, jobs.salary_currency),
    salary_period    = coalesce(excluded.salary_period, jobs.salary_period),
    url              = coalesce(excluded.url, jobs.url),
    remote_eligibility = coalesce(excluded.remote_eligibility, jobs.remote_eligibility),
    posted_at        = coalesce(jobs.posted_at, excluded.posted_at),
    posted_at_raw    = coalesce(excluded.posted_at_raw, jobs.posted_at_raw),
    fingerprint      = excluded.fingerprint,
    raw_payload      = excluded.raw_payload,
    payload_hash     = excluded.payload_hash
returning id, provider, external_id, (xmax = 0) as inserted
"""

EXISTING_HASHES = """
select j.provider, j.external_id, j.payload_hash
from jobs j
join unnest(%s::text[], %s::text[]) as t(provider, external_id)
  on j.provider = t.provider and j.external_id = t.external_id
"""

BATCH_SIZE = 100


def dedupe(records: list[JobRecord]) -> tuple[list[JobRecord], int]:
    """
    Collapse repeats of one identity within a single batch.

    A posting can arrive from more than one leg of a search — the local pass and
    the remote pass both return it. Postgres rejects an ON CONFLICT DO UPDATE
    that would touch the same row twice in one statement, so this has to happen
    before the write rather than being left to the unique index.
    """
    seen: dict[JobIdentity, JobRecord] = {}
    duplicates = 0

    for record in records:
        if record.identity in seen:
            duplicates += 1
            continue
        seen[record.identity] = record

    return list(seen.values()), duplicates


def existing_payload_hashes(conn, records: list[JobRecord]) -> dict[JobIdentity, str]:
    if not records:
        return {}

    with conn.cursor() as cur:
        cur.execute(EXISTING_HASHES, (
            [r.provider for r in records],
            [r.external_id for r in records],
        ))
        return {
            JobIdentity(row["provider"], row["external_id"]): row["payload_hash"]
            for row in cur.fetchall()
        }


def _values(record: JobRecord) -> list:
    return [
        record.provider, record.external_id, record.identity_source,
        record.fingerprint, record.title, record.company, record.description,
        record.location, record.remote, record.employment_type,
        record.experience_level, record.salary_min, record.salary_max,
        record.salary_currency, record.salary_period, record.url,
        record.posted_at, record.posted_at_raw, record.remote_eligibility,
        Jsonb(record.raw_payload),
        record.payload_hash,
    ]


def upsert_many(conn, records: list[JobRecord]) -> list[UpsertedJob]:
    """Insert or refresh each posting. Safe to call with the same batch repeatedly."""
    results: list[UpsertedJob] = []
    placeholder = "(" + ", ".join(["%s"] * len(COLUMNS)) + ")"

    for start in range(0, len(records), BATCH_SIZE):
        chunk = records[start:start + BATCH_SIZE]
        sql = UPSERT.format(rows=", ".join([placeholder] * len(chunk)))
        params = [value for record in chunk for value in _values(record)]

        with conn.cursor() as cur:
            cur.execute(sql, params)
            results.extend(
                UpsertedJob(
                    id=row["id"],
                    provider=row["provider"],
                    external_id=row["external_id"],
                    inserted=row["inserted"],
                )
                for row in cur.fetchall()
            )

    return results


# ------------------------------------------------------------------ reading
# Rows come back as the pipeline's Job, so a posting read from the pool is
# indistinguishable from one a provider just returned.

_JOB_SELECT = """
select id, provider, external_id, title, company, description, location,
       remote, remote_eligibility, employment_type, experience_level,
       salary_min, salary_max, salary_currency, salary_period, url,
       posted_at, posted_at_raw, raw_payload
from jobs
"""

SEARCH_POOL = _JOB_SELECT + """
where exists (
    select 1 from unnest(%(roles)s::text[]) as r(role)
    where to_tsvector('english', coalesce(title, '')) @@ plainto_tsquery('english', r.role)
)
  and archived_at is null
  and (last_seen_at > now() - make_interval(days => %(live)s)
       or (provider <> all(%(refreshed)s::text[])
           and last_seen_at > now() - make_interval(days => %(unverified)s)))
  and coalesce(posted_at, first_seen_at) > now() - make_interval(days => %(age)s)
  and (%(remote)s::boolean is null or remote = %(remote)s::boolean)
  and (%(place)s::text is null or location ~* %(place)s::text)
order by posted_at desc nulls last
limit %(limit)s
"""

FIND_BY_URL = _JOB_SELECT + """
where rtrim(lower(url), '/') = rtrim(lower(%s), '/')
  and archived_at is null
order by last_seen_at desc
limit 1
"""


def row_to_job(row):
    from src.Agent.utils.types import Job

    posted = row["posted_at"]
    return Job(
        title=row["title"], company=row["company"], description=row["description"],
        location=row["location"], remote=row["remote"], remote_eligibility=row["remote_eligibility"],
        employment_type=row["employment_type"], experience_level=row["experience_level"],
        salary_min=row["salary_min"], salary_max=row["salary_max"],
        salary_currency=row["salary_currency"], salary_period=row["salary_period"],
        url=row["url"], posted_at=row["posted_at_raw"],
        posted_at_utc=posted.isoformat() if posted else None,
        provider=row["provider"], external_id=row["external_id"],
        # The stored payload, so re-persisting sees an unchanged hash.
        raw=row["raw_payload"], db_id=row["id"],
    )


def descriptions(conn, ids: list[int]) -> dict[int, str]:
    """Posting text by job id, for reading tools that start from pool rows (which carry no text)."""
    with conn.cursor() as cur:
        cur.execute("select id, description from jobs where id = any(%s::bigint[])", (ids,))
        return {row["id"]: row["description"] or "" for row in cur.fetchall()}


def search_pool(conn, params: dict) -> list:
    with conn.cursor() as cur:
        cur.execute(SEARCH_POOL, params)
        return [row_to_job(row) for row in cur.fetchall()]


def find_by_url(conn, url: str):
    with conn.cursor() as cur:
        cur.execute(FIND_BY_URL, (url,))
        row = cur.fetchone()
        return row_to_job(row) if row else None
