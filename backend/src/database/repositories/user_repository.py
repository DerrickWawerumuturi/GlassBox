from psycopg.types.json import Jsonb

# Everything here takes a users.id. Turning a token's subject into that id —
# including refusing stale sessions — happens once, in services/users.py.

SELECT_USER = """
select u.id from users u where u.sub = %s
"""

UPSERT_USER = """
insert into users (sub, email, name, image)
values (%s, %s, %s, %s)
on conflict (sub) do update set
    email = excluded.email,
    name  = excluded.name,
    image = excluded.image,
    updated_at = now()
returning id
"""

SAVE_CV = """
insert into cvs(user_id, data)
values (%s, %s)
on conflict(user_id) do update set
    data = excluded.data,
    updated_at = now()
"""

GET_CV = """
select c.data from cvs c where c.user_id = %s
"""

SAVE_ANALYSIS = """
insert into analyses (user_id, data, file_name)
values (%s, %s, %s)
on conflict on constraint analyses_user_key do update set
    data       = excluded.data,
    file_name  = excluded.file_name,
    updated_at = now()
"""

GET_ANALYSIS = """
select a.data, a.file_name from analyses a where a.user_id = %s
"""

# The parsed profile of the user's latest CV: one row, replaced by each new parse.
SAVE_LATEST_CV = """
insert into latest_cvs (user_id, profile, file_name, text_sha256, parser_version)
values (%s, %s, %s, %s, %s)
on conflict (user_id) do update set
    profile        = excluded.profile,
    file_name      = excluded.file_name,
    text_sha256    = excluded.text_sha256,
    parser_version = excluded.parser_version,
    parsed_at      = now()
"""

GET_LATEST_CV = """
select l.profile, l.file_name, l.text_sha256, l.parser_version, l.parsed_at
from latest_cvs l where l.user_id = %s
"""

DELETE_LATEST_CV = """
delete from latest_cvs where user_id = %s
"""

GET_LOCATION_PREFERENCES = """
select u.location_preferences from users u where u.id = %s
"""

SET_LOCATION_PREFERENCES = """
update users set location_preferences = %s, updated_at = now() where id = %s
"""

# Everything stored for the user except the account itself. Application events
# cascade from their application. Separate statements: psycopg binds parameters
# server-side, which refuses several commands in one call.
DELETE_USER_DATA = (
    "delete from cvs where user_id = %s",
    "delete from analyses where user_id = %s",
    "delete from latest_cvs where user_id = %s",
    "delete from application where user_id = %s",
)

# The users row cascades to cvs, analyses, latest_cvs and applications.
DELETE_USER = """
delete from users where id = %s
"""


def get_user_id(conn, sub: str) -> int | None:
    with conn.cursor() as cur:
        cur.execute(SELECT_USER, (sub,))
        row = cur.fetchone()
        return row["id"] if row else None


def upsert_user(conn, sub, email, name, image) -> int:
    with conn.cursor() as cur:
        cur.execute(UPSERT_USER, (sub, email, name, image))
        return cur.fetchone()["id"]


def save_cv(conn, user_id: int, data: dict) -> None:
    with conn.cursor() as cur:
        cur.execute(SAVE_CV, (user_id, Jsonb(data)))


def get_cv(conn, user_id: int) -> dict | None:
    with conn.cursor() as cur:
        cur.execute(GET_CV, (user_id,))
        row = cur.fetchone()
        return row["data"] if row else None


def save_analysis(conn, user_id: int, data: dict, file_name) -> None:
    with conn.cursor() as cur:
        cur.execute(SAVE_ANALYSIS, (user_id, Jsonb(data), file_name))


def get_analysis(conn, user_id: int) -> dict | None:
    with conn.cursor() as cur:
        cur.execute(GET_ANALYSIS, (user_id,))
        return cur.fetchone()


def save_latest_cv(conn, user_id: int, profile: dict, file_name, text_sha256: str, parser_version: str) -> None:
    with conn.cursor() as cur:
        cur.execute(SAVE_LATEST_CV, (user_id, Jsonb(profile), file_name, text_sha256, parser_version))


def get_latest_cv(conn, user_id: int) -> dict | None:
    with conn.cursor() as cur:
        cur.execute(GET_LATEST_CV, (user_id,))
        return cur.fetchone()


def delete_latest_cv(conn, user_id: int) -> bool:
    with conn.cursor() as cur:
        cur.execute(DELETE_LATEST_CV, (user_id,))
        return cur.rowcount > 0


def get_location_preferences(conn, user_id: int) -> dict | None:
    with conn.cursor() as cur:
        cur.execute(GET_LOCATION_PREFERENCES, (user_id,))
        row = cur.fetchone()
        return row["location_preferences"] if row else None


def set_location_preferences(conn, user_id: int, preferences: dict | None) -> None:
    with conn.cursor() as cur:
        cur.execute(SET_LOCATION_PREFERENCES, (Jsonb(preferences) if preferences else None, user_id))


def delete_user_data(conn, user_id: int) -> None:
    with conn.cursor() as cur:
        for statement in DELETE_USER_DATA:
            cur.execute(statement, (user_id,))


def delete_user(conn, user_id: int) -> bool:
    with conn.cursor() as cur:
        cur.execute(DELETE_USER, (user_id,))
        return cur.rowcount > 0
