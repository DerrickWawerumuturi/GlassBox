from datetime import datetime, time, timezone

from psycopg.types.json import Jsonb

# Every way an application starts — a bookmark, a hand-entered one, a reviewed
# pasted link, a spreadsheet row — is this one insert with different fields filled in.
CREATE_COLUMNS = (
    "job_id", "title", "company", "source", "match_score", "match_method", "cv_snapshot",
    "url", "location", "workplace", "employment_type", "salary", "notes",
)
CREATE_APPLICATION = f"""
insert into application (user_id, {", ".join(CREATE_COLUMNS)})
values (%(user_id)s, {", ".join(f"%({c})s" for c in CREATE_COLUMNS)})
returning id
"""

GET_STATUS = """
select a.status
from application a
where a.id = %s and a.user_id = %s
"""

UPDATE_STATUS = """
update application
set status          = %s,
    last_status_at  = %s,
    applied_at      = coalesce(applied_at, %s),
    updated_at      = now()
where id = %s
"""

INSERT_EVENT = """
insert into application_events(application_id, from_status, to_status, occurred_at, scheduled_for, note)
values (%s, %s, %s, %s, %s, %s)
"""

# The application's own values win: they are what the user reviewed. The job
# row fills in only what the application never recorded (plain bookmarks).
# Newest in JobRadar first — added_at, not applied_at: a sheet imported today
# lands on top, in the order its own application dates give it.
GET_LIST_FOR_USER = """
select a.id, a.job_id, a.title, a.company, a.match_score, a.status,
       a.created_at as added_at, a.applied_at, a.last_status_at, a.cv_snapshot,
       a.workplace, a.employment_type, a.salary, a.match_method, a.source, a.notes,
       coalesce(a.url, j.url)           as url,
       coalesce(a.location, j.location) as location,
       coalesce(a.workplace = 'remote', j.remote) as remote,
       coalesce(j.provider, 'manual')   as provider
from application a
left join jobs j on j.id = a.job_id
where a.user_id = %s
order by a.created_at desc, a.applied_at desc nulls last, a.id desc
"""

GET_TIMELINE = """
select e.from_status, e.to_status, e.occurred_at, e.scheduled_for, e.note
from application_events e
join application a on a.id = e.application_id
where e.application_id = %s and a.user_id = %s
order by e.occurred_at desc, e.id desc
"""

FIND_BY_USER_AND_JOB = """
select a.id, a.status
from application a
where a.user_id = %s and a.job_id = %s
"""

DELETE_APPLICATION = """
delete from application
where id = %s and user_id = %s
"""

# Pool jobs behind a list of links, so an imported application joins the job
# it was for when JobRadar already holds it.
JOBS_BY_LINK = """
select id, url from jobs
where archived_at is null and rtrim(lower(url), '/') = any(%s)
"""

SET_IMPORTED_STATUS = """
update application
set status = %s, applied_at = %s, last_status_at = %s, updated_at = now()
where id = %s
"""

def create(conn, user_id: int, **fields) -> int:
    unknown = set(fields) - set(CREATE_COLUMNS)
    if unknown:
        raise TypeError(f"not application columns: {sorted(unknown)}")
    values = {column: fields.get(column) for column in CREATE_COLUMNS}
    if values["cv_snapshot"] is not None:
        values["cv_snapshot"] = Jsonb(values["cv_snapshot"])
    with conn.cursor() as cur:
        cur.execute(CREATE_APPLICATION, {"user_id": user_id, **values})
        return cur.fetchone()["id"]


def current_status(conn, user_id, application_id) -> str | None:
    with conn.cursor() as cur:
        cur.execute(GET_STATUS, (application_id, user_id))
        row = cur.fetchone()
        return row["status"] if row else None

def update_status(conn, application_id, to_status, occurred_at) -> None:
    with conn.cursor() as cur:
        cur.execute(UPDATE_STATUS,  (to_status, occurred_at, occurred_at, application_id,))

def insert_event(conn, application_id, from_status, to_status, occurred_at, scheduled_for, note) -> None:
    with conn.cursor() as cur:
        cur.execute(INSERT_EVENT, (application_id, from_status, to_status, occurred_at, scheduled_for, note))

def list_for_user(conn, user_id) -> list[dict]:
    with conn.cursor() as cur:
        cur.execute(GET_LIST_FOR_USER, (user_id,))
        applications = cur.fetchall()
        return applications

def timeline(conn, user_id, application_id) -> list[dict]:
    with conn.cursor() as cur:
        cur.execute(GET_TIMELINE, (application_id, user_id))
        timelines = cur.fetchall()
        return timelines

def find_by_user_and_job(conn, user_id, job_id) -> dict | None:
    with conn.cursor() as cur:
        cur.execute(FIND_BY_USER_AND_JOB, (user_id, job_id))
        return cur.fetchone()

def delete(conn, user_id, application_id) -> bool:
    with conn.cursor() as cur:
        cur.execute(DELETE_APPLICATION, (application_id, user_id))
        return cur.rowcount > 0


def jobs_by_link(conn, urls: list[str]) -> list[dict]:
    """Pool jobs whose link is one of `urls` (compared lowercased, without a trailing slash)."""
    if not urls:
        return []
    with conn.cursor() as cur:
        cur.execute(JOBS_BY_LINK, (urls,))
        return cur.fetchall()


def import_status(conn, application_id, status, applied_on: str | None, recorded_at, note) -> None:
    """
    An imported application's status and trail. The sheet's date is when the
    user applied; everything else happened at some unknown time before the
    import, so later steps are dated at the import and say so. A missing date
    stays missing rather than becoming the import time.
    """
    # Midday UTC keeps the calendar date the same in every timezone it is shown in.
    applied = datetime.combine(datetime.fromisoformat(applied_on).date(), time(12), timezone.utc) \
        if applied_on else None
    insert_event(conn, application_id, None, "saved", applied or recorded_at, None, note)
    if status != "saved":
        insert_event(conn, application_id, "saved", "applied", applied or recorded_at, None,
                     None if applied else "Application date not in the sheet")
        if status != "applied":
            insert_event(conn, application_id, "applied", status, recorded_at, None, "Status when imported")
    with conn.cursor() as cur:
        cur.execute(SET_IMPORTED_STATUS, (status, applied, recorded_at, application_id))
