"""
The backfill and migration 017 on real tables: stored CVs, kept profiles and
application snapshots lose their personal details, and the backfill keeps
what matching needs. Needs a database, so it is skipped where none is set (CI).
"""
import os
import time
import uuid
from pathlib import Path

import pytest
from dotenv import load_dotenv

load_dotenv(os.path.join(os.path.dirname(__file__), "..", ".env"))
if not os.getenv("DATABASE_URL"):
    pytest.skip("needs DATABASE_URL", allow_module_level=True)

from psycopg.types.json import Jsonb  # noqa: E402

from src.database.backfill_kept_cv import minimise  # noqa: E402
from src.database.session import connection  # noqa: E402

FULL = {"name": "Jane Wanjiru", "email": "jane@example.com", "phone_number": "+254 700", "title": "Backend Engineer",
        "linkedIn": "https://linkedin.com/in/jane", "portfolio": None, "professional_summary": "At Acme Corp",
        "skills": ["Python"], "location": "Nairobi", "experience_level": "Mid",
        "experience": [{"company": "Acme Corp", "role": "Backend Engineer", "start_date": "Jan 2021", "end_date": "Jan 2024"}],
        "education": [{"school_name": "University of Nairobi", "course_title": "BSc Computer Science"}]}
PROFILE = {"primary_role": "Backend Engineer", "skills": ["Python"], "notes": "Jane, jane@example.com",
           "experience": FULL["experience"], "education": "BSc, University of Nairobi"}
TELLTALES = ("Jane", "jane@", "+254", "linkedin", "Acme", "University of Nairobi", "Jan 2021")
MIGRATION = Path(__file__).parents[1] / "src/database/migrations/017_keep_less_cv.sql"


@pytest.fixture
def user():
    sub = f"8{int(time.time() * 1000)}{uuid.uuid4().int % 1000:03d}"
    with connection() as conn, conn.cursor() as cur:
        cur.execute("insert into users (sub, email, name) values (%s, 'x@example.com', 'X') returning id", (sub,))
        user_id = cur.fetchone()["id"]
    yield user_id
    with connection() as conn, conn.cursor() as cur:
        cur.execute("delete from users where id = %s", (user_id,))


def _seed(user_id):
    with connection() as conn, conn.cursor() as cur:
        cur.execute("insert into cvs (user_id, data) values (%s, %s) on conflict (user_id) do update set data = excluded.data",
                    (user_id, Jsonb(FULL)))
        cur.execute("insert into latest_cvs (user_id, profile, file_name, text_sha256, parser_version) "
                    "values (%s, %s, 'cv.pdf', 'h', 'v') on conflict (user_id) do update set profile = excluded.profile",
                    (user_id, Jsonb(PROFILE)))
        cur.execute("insert into application (user_id, title, cv_snapshot) values (%s, 'Role', %s)", (user_id, Jsonb(FULL)))


def _stored(user_id) -> str:
    with connection() as conn, conn.cursor() as cur:
        cur.execute("select (select data from cvs where user_id = %(u)s) as cv, "
                    "(select profile from latest_cvs where user_id = %(u)s) as profile, "
                    "(select cv_snapshot from application where user_id = %(u)s limit 1) as snapshot", {"u": user_id})
        return cur.fetchone()


def test_the_backfill_drops_the_details_and_keeps_what_matching_needs(user):
    _seed(user)
    with connection() as conn:
        assert minimise(conn, dry_run=True)["cvs"] >= 1
    with connection() as conn:
        minimise(conn)
    row = _stored(user)
    assert not [t for t in TELLTALES if t in str(row)]
    assert row["cv"]["derived"]["years"]["software"] == 3.1          # Jan 2021 to Jan 2024 inclusive, from the dates now gone
    assert row["profile"]["derived"]["years"]["software"] == 3.1 and row["profile"]["primary_role"] == "Backend Engineer"


def test_migration_017_strips_what_is_left(user):
    _seed(user)
    with connection() as conn, conn.cursor() as cur:
        cur.execute(MIGRATION.read_text())
    row = _stored(user)
    assert not [t for t in TELLTALES if t in str(row)]
    assert row["cv"]["skills"] == ["Python"] and row["profile"]["skills"] == ["Python"]
