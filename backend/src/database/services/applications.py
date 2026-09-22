"""
The application tracker: starting an application (bookmark, hand-entered or a
reviewed pasted link), moving it through statuses, and its history.

Every application's event trail starts at `saved`, however it was created, so
the timeline always reads from the beginning.
"""
from datetime import datetime, timezone
from types import SimpleNamespace

from psycopg.errors import ForeignKeyViolation, UniqueViolation

from src.database.repositories import application_repository as repo
from src.database.repositories import profile_repository
from src.database.services.users import UserNotFound, candidate_for, resolve_user_id  # noqa: F401
from src.database.session import connection
from src.matching.matcher import MATCHER_VERSION, match
from src.matching.requirements import PROFILER_VERSION, JobProfile

INITIAL_STATUS = "saved"
DELETABLE = ("saved", "withdrawn", "rejected")


class ApplicationNotFound(Exception):
    pass


class JobNotFound(Exception):
    pass


class BookmarkNotRemovable(Exception):
    pass


class ApplicationExists(Exception):
    pass


def _start(conn, user_id: int, status: str = INITIAL_STATUS, **fields) -> int:
    """Insert the application, record `saved`, then move it on if it already went further."""
    now = datetime.now(timezone.utc)
    try:
        application_id = repo.create(conn, user_id, **fields)
    except ForeignKeyViolation as err:
        raise JobNotFound(f"job {fields.get('job_id')}") from err
    except UniqueViolation as err:
        # Two saves of the same job racing each other.
        raise ApplicationExists("This job is already in your applications") from err

    repo.insert_event(conn, application_id, None, INITIAL_STATUS, now, None, None)
    if status != INITIAL_STATUS:
        repo.update_status(conn, application_id, status, now)
        repo.insert_event(conn, application_id, INITIAL_STATUS, status, now, None, None)
    return application_id


def score_job(conn, user_id: int, job_id: int | None) -> tuple[int | None, str | None]:
    """The matcher's score for a pool job, when the user has a CV to match it against."""
    row = profile_repository.for_job(conn, job_id) if job_id is not None else None
    if not row or not row["profile"] or row["profiler_version"] != PROFILER_VERSION:
        return None, None
    candidate = candidate_for(conn, user_id)
    if candidate is None:
        return None, None
    return match(candidate, JobProfile.from_dict(row["profile"]), SimpleNamespace(**row)).score, MATCHER_VERSION


class ApplicationService:
    def toggle_bookmark(self, payload, job_id, title=None, company=None,
                        source=None, match_score=None, cv_snapshot=None) -> dict:
        """Save a job, or remove it while it is still only a bookmark."""
        with connection() as conn:
            user_id = resolve_user_id(conn, payload)
            existing = repo.find_by_user_and_job(conn, user_id, job_id)

            if existing is None:
                application_id = _start(
                    conn, user_id, job_id=job_id, title=title, company=company, source=source,
                    match_score=match_score, cv_snapshot=cv_snapshot,
                    match_method=MATCHER_VERSION if match_score is not None else None,
                )
                return {"bookmarked": True, "application_id": application_id}

            # Removal only while still `saved`: deleting a sent application would
            # cascade away its whole event history.
            if existing["status"] != INITIAL_STATUS:
                raise BookmarkNotRemovable(f"application {existing['id']} is {existing['status']}, not a bookmark")
            repo.delete(conn, user_id, existing["id"])
            return {"bookmarked": False, "application_id": None}

    def add_manual(self, payload, title, company=None, url=None, location=None,
                   status="applied", cv_snapshot=None) -> int:
        """An application made outside JobRadar, typed in by hand."""
        with connection() as conn:
            return _start(conn, resolve_user_id(conn, payload), status, title=title, company=company,
                          source="manual", url=url, location=location, cv_snapshot=cv_snapshot)

    def add_from_url(self, payload, title, url, job_id=None, company=None, location=None,
                     workplace=None, employment_type=None, salary=None, source=None,
                     status=INITIAL_STATUS, cv_snapshot=None) -> int:
        """A pasted job link, as the user reviewed it, scored when it is a pool job and there is a CV."""
        with connection() as conn:
            user_id = resolve_user_id(conn, payload)
            if job_id is not None and repo.find_by_user_and_job(conn, user_id, job_id):
                raise ApplicationExists("This job is already in your applications")
            score, method = score_job(conn, user_id, job_id)
            return _start(conn, user_id, status, job_id=job_id, title=title, company=company, source=source,
                          url=url, location=location, workplace=workplace, employment_type=employment_type,
                          salary=salary, cv_snapshot=cv_snapshot, match_score=score, match_method=method)

    def list_applications(self, payload) -> list[dict]:
        with connection() as conn:
            user_id = resolve_user_id(conn, payload, create=False)
            return repo.list_for_user(conn, user_id) if user_id else []

    def transition(self, payload, application_id, to_status, occurred_at=None,
                   scheduled_for=None, note=None) -> None:
        occurred_at = occurred_at or datetime.now(timezone.utc)
        with connection() as conn:
            user_id = resolve_user_id(conn, payload, create=False)
            status_now = repo.current_status(conn, user_id, application_id) if user_id else None
            if status_now is None:
                raise ApplicationNotFound(f"application {application_id}")
            repo.update_status(conn, application_id, to_status, occurred_at)
            repo.insert_event(conn, application_id, status_now, to_status, occurred_at, scheduled_for, note)

    def remove(self, payload, application_id) -> None:
        """Only terminal rows go; an active application must be withdrawn first."""
        with connection() as conn:
            user_id = resolve_user_id(conn, payload, create=False)
            status_now = repo.current_status(conn, user_id, application_id) if user_id else None
            if status_now is None:
                raise ApplicationNotFound(f"application {application_id}")
            if status_now not in DELETABLE:
                raise BookmarkNotRemovable(f"application is {status_now}: withdraw it first, then delete")
            repo.delete(conn, user_id, application_id)

    def remove_many(self, payload, ids: list[int]) -> dict:
        """Several at once, by remove()'s rule: an active application stays, with its history."""
        with connection() as conn:
            user_id = resolve_user_id(conn, payload, create=False)
            deleted = repo.delete_many(conn, user_id, ids, DELETABLE) if user_id else []
        gone = set(deleted)
        return {"deleted": deleted, "kept": [i for i in ids if i not in gone]}

    def history(self, payload, application_id) -> list[dict]:
        with connection() as conn:
            user_id = resolve_user_id(conn, payload, create=False)
            if not user_id or repo.current_status(conn, user_id, application_id) is None:
                raise ApplicationNotFound(f"application {application_id}")
            return repo.timeline(conn, user_id, application_id)


application_service = ApplicationService()
