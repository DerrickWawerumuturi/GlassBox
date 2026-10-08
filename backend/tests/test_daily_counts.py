"""
Server side daily totals (src/api/daily_counts.py): what each request adds,
that an upload scan's two requests count once, and that counting never costs
a request. The writer's SQL is replaced here; the real upsert runs at the end,
against a LOCAL database only.
"""
import os
import threading
import time
from contextlib import nullcontext
from datetime import date, timedelta
from urllib.parse import parse_qs, urlsplit

import jwt
import pytest
from fastapi.testclient import TestClient

import main
from src.api import daily_counts
from src.database.repositories import daily_count_repository, user_repository
from src.database.services import users
from src.database.services.users import NoLatestCV

PDF = b"%PDF-1.4\n%a small CV\n"
CV = {"name": "Test", "title": None, "location": "Nairobi", "phone_number": None, "email": None,
      "portfolio": None, "linkedIn": None, "professional_summary": None, "skills": ["Python"],
      "experience": [], "experience_level": None, "education": []}


class Agent:
    def parse(self, text):
        return {"skills": ["Python"]}

    def match(self, query, preferences):
        return {"jobs": []}


@pytest.fixture
def counted(monkeypatch):
    """The counts each request asked for, as written: one tuple per write."""
    writes = []
    monkeypatch.setattr(daily_counts, "is_configured", lambda: True)
    monkeypatch.setattr(daily_counts, "connection", lambda: nullcontext(None))
    monkeypatch.setattr(daily_count_repository, "increment", lambda conn, events: writes.append(events))

    def settled():
        daily_counts.settle()
        return writes
    return settled


@pytest.fixture
def client(monkeypatch):
    monkeypatch.setattr(main, "_pdf_text", lambda data: _text())
    monkeypatch.setattr(main, "_agent", lambda: Agent())
    monkeypatch.setattr(main, "_cv_parser", lambda: Agent())
    monkeypatch.setattr(main.opportunity_service, "forget", lambda user: None)
    monkeypatch.setattr(users, "connection", lambda: nullcontext(None))
    now = int(time.time())
    token = jwt.encode({"sub": "900000000000000000003", "iat": now, "exp": now + 60},
                       main.current_user.__globals__["SECRET"], algorithm="HS256")
    c = TestClient(main.app, raise_server_exceptions=False)
    c.headers.update({"Origin": "http://localhost:3000"})
    c.signed_in = {"Authorization": f"Bearer {token}"}
    return c


async def _text():
    return "Python, Go"


def _upload(client, path, data=PDF):
    return client.post(path, files={"file": ("cv.pdf", data, "application/pdf")})


def test_an_upload_scan_is_counted_once_though_it_is_two_requests(client, counted):
    assert _upload(client, "/cv/parse").status_code == 200
    assert _upload(client, "/analyze").status_code == 200
    assert counted() == [("scans_started",), ("scans_finished",)]


def test_a_failed_scan_counts_as_started_and_failed(client, counted):
    assert _upload(client, "/analyze", b"PK\x03\x04 a word file").status_code == 415
    assert counted() == [("scans_started",), ("scans_failed",)]


def test_a_reused_cv_is_a_scan_and_a_reuse(client, counted, monkeypatch):
    monkeypatch.setattr(users.user_service, "latest_profile", lambda user: {"skills": ["Python"]})
    monkeypatch.setattr(main.user_service, "fetch_location_preferences", lambda user: None)
    assert client.post("/analyze/reuse", headers=client.signed_in).status_code == 200
    assert counted() == [("scans_started", "cv_reused"), ("scans_finished",)]


def test_a_reuse_with_nothing_kept_fails(client, counted, monkeypatch):
    def nothing(user):
        raise NoLatestCV("No CV kept yet.")
    monkeypatch.setattr(users.user_service, "latest_profile", nothing)
    monkeypatch.setattr(main.user_service, "fetch_location_preferences", lambda user: None)
    assert client.post("/analyze/reuse", headers=client.signed_in).status_code == 404
    assert counted() == [("scans_started", "cv_reused"), ("scans_failed",)]


def test_an_account_is_counted_once_and_only_when_its_request_worked(client, counted, monkeypatch):
    known = set()

    def upsert(conn, sub, *_):
        created = sub not in known
        known.add(sub)
        return 7, created
    monkeypatch.setattr(user_repository, "upsert_user", upsert)
    monkeypatch.setattr(user_repository, "save_cv", lambda conn, user_id, data: None)
    assert client.put("/cv", json=CV, headers=client.signed_in).headers.get("x-account-created") == "1"
    assert client.put("/cv", json=CV, headers=client.signed_in).status_code == 200
    assert counted() == [("accounts_created",)]

    known.clear()

    def broken(conn, user_id, data):
        raise RuntimeError("write failed, the transaction rolls back")
    monkeypatch.setattr(user_repository, "save_cv", broken)
    assert client.put("/cv", json=CV, headers=client.signed_in).status_code == 500
    assert counted() == [("accounts_created",)]


def test_a_count_that_fails_to_write_is_logged_and_the_scan_still_answers(client, monkeypatch, capsys):
    monkeypatch.setattr(daily_counts, "is_configured", lambda: True)

    def down():
        raise RuntimeError("database unreachable")
    monkeypatch.setattr(daily_counts, "connection", down)
    response = _upload(client, "/analyze")
    daily_counts.settle()
    assert response.status_code == 200 and response.json() == {"jobs": []}
    assert "daily count not kept (scans_started): database unreachable" in capsys.readouterr().out


def test_a_slow_count_never_holds_the_request(client, counted, monkeypatch):
    release = threading.Event()
    monkeypatch.setattr(daily_count_repository, "increment", lambda conn, events: release.wait(5))
    start = time.monotonic()
    response = _upload(client, "/analyze")
    elapsed = time.monotonic() - start
    release.set()
    daily_counts.settle()
    assert response.status_code == 200 and elapsed < 2


def test_a_stopped_writer_never_fails_the_request(client, monkeypatch):
    class Stopped:
        def submit(self, *args):
            raise RuntimeError("cannot schedule new futures after shutdown")
    monkeypatch.setattr(daily_counts, "_writer", Stopped())
    assert _upload(client, "/analyze").status_code == 200


def test_without_a_database_nothing_is_written(client, monkeypatch):
    writes = []
    monkeypatch.setattr(daily_counts, "is_configured", lambda: False)
    monkeypatch.setattr(daily_counts, "connection", lambda: nullcontext(None))
    monkeypatch.setattr(daily_count_repository, "increment", lambda conn, events: writes.append(events))
    assert _upload(client, "/analyze").status_code == 200
    daily_counts.settle()
    assert writes == []


def test_only_known_counters_reach_the_sql():
    with pytest.raises(ValueError):
        daily_count_repository.increment(None, ("scans_started", "1; drop table users"))


def test_the_table_shows_each_day_and_a_seven_day_total():
    today = date(2026, 10, 8)
    rows = [{"day": today - timedelta(days=13 - i), "scans_started": i, "scans_finished": i, "scans_failed": 0,
             "cv_reused": 0, "accounts_created": 1} for i in range(14)]
    lines = daily_counts.table(rows, 3).splitlines()
    assert lines[0].split() == ["day", "(UTC)", "started", "finished", "failed", "reused", "accounts"]
    assert [line.split()[0] for line in lines[1:4]] == ["2026-10-06", "2026-10-07", "2026-10-08"]
    # The last 7 days: 7 + 8 + ... + 13 = 70 scans, 7 accounts.
    assert lines[4].split() == ["last", "7", "days", "70", "70", "0", "0", "7"]


# ------------------------------------------------- the real SQL, local database only

URL = os.getenv("DATABASE_URL", "")


def _is_local(url: str) -> bool:
    parts = urlsplit(url)
    host = parts.hostname or parse_qs(parts.query).get("host", [""])[0]
    return host.startswith("/") or host in ("localhost", "127.0.0.1")


local_db = pytest.mark.skipif(not URL or not _is_local(URL), reason="writes counts: needs a local Postgres")


def _today(conn) -> dict:
    return daily_count_repository.recent(conn, 1)[0]


@local_db
def test_two_first_counts_of_a_day_at_once_both_land():
    """
    The race: the day has no row, and a second request counts while the first
    request's insert is not yet committed. The second waits on the first, then
    adds to its row. Read then insert would fail it on the primary key.
    """
    import psycopg
    from src.database.session import connection
    with connection() as conn, conn.cursor() as cur:
        cur.execute("delete from daily_counts where day = (now() at time zone 'utc')::date")
    with psycopg.connect(URL) as first, psycopg.connect(URL) as second:
        daily_count_repository.increment(first, ("scans_started", "cv_reused"))  # open, not committed
        errors = []

        def count_second():
            try:
                daily_count_repository.increment(second, ("scans_started",))
                second.commit()
            except Exception as err:
                errors.append(err)
        racing = threading.Thread(target=count_second)
        racing.start()
        time.sleep(0.3)  # the second is now waiting on the first's row
        first.commit()
        racing.join(5)
    with connection() as conn:
        today = _today(conn)
    assert errors == []
    assert (today["scans_started"], today["cv_reused"], today["scans_finished"]) == (2, 1, 0)


@local_db
def test_a_quiet_day_reads_as_zeros():
    from src.database.session import connection
    with connection() as conn:
        rows = daily_count_repository.recent(conn, 14)
    assert len(rows) == 14 and len({r["day"] for r in rows}) == 14
    assert all(isinstance(r["accounts_created"], int) for r in rows)
