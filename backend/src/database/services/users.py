"""
A signed-in user's own data: their account, CV, saved analysis and location
preferences — and the matching profile derived from those. `resolve_user_id` is
the one way any request becomes a users.id — the applications service uses it
too — so the stale-session guard cannot be skipped by one endpoint and not another.
"""
from types import SimpleNamespace

from src.Agent.utils import location as loc
from src.database.repositories import user_repository
from src.database.session import connection
from src.matching.candidate import Candidate


class UserNotFound(Exception):
    pass


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
        return user_repository.upsert_user(conn, sub, payload.get("email"), payload.get("name"), payload.get("image"))
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
        with connection() as conn:
            user_repository.save_cv(conn, resolve_user_id(conn, payload), cv)

    def fetch_cv(self, payload) -> dict | None:
        with connection() as conn:
            user_id = resolve_user_id(conn, payload, create=False)
            return user_repository.get_cv(conn, user_id) if user_id else None

    def store_analysis(self, payload, data: dict, file_name) -> None:
        with connection() as conn:
            user_repository.save_analysis(conn, resolve_user_id(conn, payload), data, file_name)

    def fetch_analysis(self, payload) -> dict | None:
        with connection() as conn:
            user_id = resolve_user_id(conn, payload, create=False)
            return user_repository.get_analysis(conn, user_id) if user_id else None

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
        """Wipes CV, analysis and applications; keeps the account."""
        with connection() as conn:
            user_id = resolve_user_id(conn, payload, create=False)
            if user_id:
                user_repository.delete_user_data(conn, user_id)

    def delete_account(self, payload) -> bool:
        with connection() as conn:
            user_id = resolve_user_id(conn, payload, create=False)
            return bool(user_id) and user_repository.delete_user(conn, user_id)


user_service = UserService()
