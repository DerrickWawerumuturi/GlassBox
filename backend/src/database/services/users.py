"""
A signed-in user's own data: their account, CV, saved analysis, the parsed
profile of their latest CV, and location preferences — and the matching
profile derived from those. `resolve_user_id` is
the one way any request becomes a users.id — the applications service uses it
too — so the stale-session guard cannot be skipped by one endpoint and not another.
"""
import hashlib
from contextvars import ContextVar
from types import SimpleNamespace

from src.Agent.utils import location as loc
from src.Agent.utils.versions import PARSER_VERSION
from src.Agent.utils.types import ParsedQuery
from src.database.repositories import user_repository
from src.database.session import connection
from src.matching.candidate import Candidate
from src.matching.kept_cv import as_cv_shape, kept_cv, kept_profile


# The API sets a fresh list per request (main.py) and says on the response when
# this request created the account, for analytics' signed_up. A list, not a bool:
# services run in a thread with a copy of the context, so only a shared object
# carries the news back to the request.
account_created: ContextVar[list | None] = ContextVar("account_created", default=None)


class UserNotFound(Exception):
    pass


class NoLatestCV(Exception):
    pass


class StaleLatestCV(Exception):
    pass


def text_sha256(cv_text: str) -> str:
    """Identifies a CV's text without keeping it: same text, same profile."""
    return hashlib.sha256(cv_text.encode("utf-8")).hexdigest()


def _subject(payload: dict) -> str:
    sub = payload.get("sub")
    if not sub:
        raise UserNotFound("token carries no subject")
    # Google subjects are numeric. A UUID here is a stale frontend build minting
    # random identities — refuse rather than fork the user's data into a ghost
    # account. One such account already exists from before every path had this.
    if not sub.isdigit():
        raise UserNotFound("outdated app session — sign out and back in on the latest version")
    return sub


def resolve_user_id(conn, payload: dict, create: bool = True) -> int | None:
    """
    The users.id for a token's claims.

    Writes pass `create=True`: the user is created on first touch and their
    email and name refreshed from the token, since nothing else provisions
    accounts. Reads pass `create=False` and get None for an unknown user, so
    looking at an empty dashboard has no side effects.
    """
    sub = _subject(payload)
    if create:
        user_id, created = user_repository.upsert_user(conn, sub, payload.get("email"), payload.get("name"), payload.get("image"))
        if created and (news := account_created.get()) is not None:
            news.append(user_id)
        return user_id
    return user_repository.get_user_id(conn, sub)


def candidate_for(conn, user_id: int | None) -> Candidate | None:
    """
    Who the user is, for matching: their saved CV, and where they want to work
    (saved preferences, else the CV's location, else the deployment default).
    None without a CV — there is nothing to match against.
    """
    cv = user_repository.get_cv(conn, user_id) if user_id else None
    if cv is None:
        return None
    saved = user_repository.get_location_preferences(conn, user_id)
    where = SimpleNamespace(location=cv.get("location"), country_code=None, city=None, remote=None)
    return Candidate.from_cv(cv, loc.LocationPreferences.resolve(loc.resolve(where), saved=saved))


class UserService:
    def store_cv(self, payload, cv: dict) -> None:
        """Keeps only what matching and the UI need (kept_cv): no name, contact, summary or positions."""
        with connection() as conn:
            user_repository.save_cv(conn, resolve_user_id(conn, payload), kept_cv(cv))

    def fetch_cv(self, payload) -> dict | None:
        with connection() as conn:
            user_id = resolve_user_id(conn, payload, create=False)
            return as_cv_shape(user_repository.get_cv(conn, user_id)) if user_id else None

    def store_analysis(self, payload, data: dict, file_name) -> None:
        with connection() as conn:
            user_repository.save_analysis(conn, resolve_user_id(conn, payload), data, file_name)

    def fetch_analysis(self, payload) -> dict | None:
        with connection() as conn:
            user_id = resolve_user_id(conn, payload, create=False)
            return user_repository.get_analysis(conn, user_id) if user_id else None

    def store_latest_cv(self, payload, query: ParsedQuery, file_name, cv_text: str) -> None:
        """
        Keeps what matching needs of what the parser read (kept_profile): never
        the file or its text, the positions' companies and dates, education
        details, or the parser's free text.
        """
        profile = kept_profile(query.model_dump(mode="json"))
        with connection() as conn:
            user_repository.save_latest_cv(conn, resolve_user_id(conn, payload), profile, file_name,
                                           text_sha256(cv_text), PARSER_VERSION)

    def fetch_latest_cv(self, payload) -> dict | None:
        """What the profile page and the rescan prompt show: the file's name, when, the skills."""
        row = self._latest_cv_row(payload)
        if row is None:
            return None
        return {"file_name": row["file_name"], "parsed_at": row["parsed_at"],
                "skills": row["profile"].get("skills") or [],
                "reusable": row["parser_version"] == PARSER_VERSION}

    def latest_profile(self, payload) -> ParsedQuery:
        """The kept profile, to match again. Refused when absent or from another parser version."""
        row = self._latest_cv_row(payload)
        if row is None:
            raise NoLatestCV("No CV kept yet. Upload one to scan.")
        if row["parser_version"] != PARSER_VERSION:
            raise StaleLatestCV("Your saved CV was read by an older version. Upload it again to scan.")
        return ParsedQuery.model_validate(row["profile"])

    def profile_for_text(self, payload, cv_text: str) -> ParsedQuery | None:
        """The kept profile when this upload is the same CV, so it is not parsed twice."""
        row = self._latest_cv_row(payload)
        if row is None or row["parser_version"] != PARSER_VERSION or row["text_sha256"] != text_sha256(cv_text):
            return None
        return ParsedQuery.model_validate(row["profile"])

    def delete_latest_cv(self, payload) -> bool:
        with connection() as conn:
            user_id = resolve_user_id(conn, payload, create=False)
            return bool(user_id) and user_repository.delete_latest_cv(conn, user_id)

    def _latest_cv_row(self, payload) -> dict | None:
        with connection() as conn:
            user_id = resolve_user_id(conn, payload, create=False)
            return user_repository.get_latest_cv(conn, user_id) if user_id else None

    def candidate(self, payload) -> Candidate | None:
        with connection() as conn:
            return candidate_for(conn, resolve_user_id(conn, payload, create=False))

    def fetch_location_preferences(self, payload) -> dict | None:
        with connection() as conn:
            user_id = resolve_user_id(conn, payload, create=False)
            return user_repository.get_location_preferences(conn, user_id) if user_id else None

    def store_location_preferences(self, payload, preferences: dict | None) -> None:
        with connection() as conn:
            user_repository.set_location_preferences(conn, resolve_user_id(conn, payload), preferences)

    def delete_data(self, payload) -> None:
        """Wipes CV, kept CV profile, analysis and applications; keeps the account."""
        with connection() as conn:
            user_id = resolve_user_id(conn, payload, create=False)
            if user_id:
                user_repository.delete_user_data(conn, user_id)

    def delete_account(self, payload) -> bool:
        with connection() as conn:
            user_id = resolve_user_id(conn, payload, create=False)
            return bool(user_id) and user_repository.delete_user(conn, user_id)


user_service = UserService()
