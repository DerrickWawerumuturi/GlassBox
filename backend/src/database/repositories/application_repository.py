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

SET_APPLIED = """
update application
set applied_at = %s,
    updated_at = now()
where id = %s and user_id = %s
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

# An imported row starts where the sheet left it: its status and dates are
# written with the row, and its trail follows in one statement for the batch.
IMPORT_COLUMNS = ("job_id", "title", "company", "source", "url", "location", "workplace",
                  "employment_type", "salary", "notes", "status", "applied_at", "last_status_at")
IMPORT_APPLICATIONS = f"""
insert into application (user_id, {", ".join(IMPORT_COLUMNS)})
values {{rows}}
returning id, status, applied_at
"""
INSERT_EVENTS = """
insert into application_events(application_id, from_status, to_status, occurred_at, scheduled_for, note)
values {rows}
"""

DELETE_MANY = """
delete from application
where user_id = %s and id = any(%s) and status = any(%s)
returning id
"""

# Imported applications a posting can be found for: linked to a pool job, or with a link to read.
FOR_MATCHING = """
select id, job_id, url from application
where user_id = %s and id = any(%s) and (job_id is not null or url is not null)
"""

# What the sheet said wins; the posting fills only what it left blank.
ENRICH = """
update application set
    job_id          = coalesce(job_id, %(job_id)s),
    company         = coalesce(company, %(company)s),
    location        = coalesce(location, %(location)s),
    workplace       = coalesce(workplace, %(workplace)s),
    employment_type = coalesce(employment_type, %(employment_type)s),
    salary          = coalesce(salary, %(salary)s),
    match_score     = coalesce(%(match_score)s, match_score),
    match_method    = coalesce(%(match_method)s, match_method),
    updated_at      = now()
where id = %(id)s and user_id = %(user_id)s
"""

BATCH_SIZE = 500

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

def set_applied(conn, user_id, application_id, applied_at) -> bool:
    with conn.cursor() as cur:
        cur.execute(SET_APPLIED, (applied_at, application_id, user_id))
        return cur.rowcount > 0

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


def _values(rows: int, columns: int) -> str:
    return ", ".join(["(" + ", ".join(["%s"] * columns) + ")"] * rows)


def import_many(conn, user_id: int, rows: list[dict], recorded_at, note: str) -> list[int]:
    """
    Imported applications and their trails in two statements a batch. The API
    and the database are continents apart, so a statement per row made a large
    sheet take minutes.

    The sheet's date is when the user applied. Everything after happened at
    some unknown time before the import, so it is dated at the import and says
    so. A missing date stays missing rather than becoming the import time.
    """
    ids = []
    for start in range(0, len(rows), BATCH_SIZE):
        chunk = rows[start:start + BATCH_SIZE]
        params = []
        for row in chunk:
            # Midday UTC keeps the calendar date the same in every timezone it is shown in.
            applied = datetime.combine(datetime.fromisoformat(row["applied_at"]).date(), time(12), timezone.utc) \
                if row.get("applied_at") else None
            params += [user_id, *(row.get(c) for c in IMPORT_COLUMNS[:-3]), row["status"], applied, recorded_at]
        with conn.cursor() as cur:
            cur.execute(IMPORT_APPLICATIONS.format(rows=_values(len(chunk), len(IMPORT_COLUMNS) + 1)), params)
            created = cur.fetchall()

        events = []
        for app in created:
            at = app["applied_at"] or recorded_at
            events.append((app["id"], None, "saved", at, None, note))
            if app["status"] != "saved":
                events.append((app["id"], "saved", "applied", at, None,
                               None if app["applied_at"] else "Application date not in the sheet"))
            if app["status"] not in ("saved", "applied"):
                events.append((app["id"], "applied", app["status"], recorded_at, None, "Status when imported"))
        with conn.cursor() as cur:
            cur.execute(INSERT_EVENTS.format(rows=_values(len(events), 6)), [v for event in events for v in event])
        ids += [app["id"] for app in created]
    return ids


def delete_many(conn, user_id: int, ids: list[int], statuses) -> list[int]:
    with conn.cursor() as cur:
        cur.execute(DELETE_MANY, (user_id, ids, list(statuses)))
        return [row["id"] for row in cur.fetchall()]


def for_matching(conn, user_id: int, ids: list[int]) -> list[dict]:
    with conn.cursor() as cur:
        cur.execute(FOR_MATCHING, (user_id, ids))
        return cur.fetchall()


def enrich(conn, user_id: int, application_id: int, job_id: int | None, fields: dict,
           match_score: int | None, match_method: str | None) -> None:
    with conn.cursor() as cur:
        cur.execute(ENRICH, {"id": application_id, "user_id": user_id, "job_id": job_id,
                             "match_score": match_score, "match_method": match_method,
                             **{k: fields.get(k) for k in ("company", "location", "workplace",
                                                           "employment_type", "salary")}})
