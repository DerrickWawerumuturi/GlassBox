"""
Collection: each source saved on its own, the closing rule, retired sources,
the live pool, and the database wake up (decisions/job-sources.md).

The wake up test runs everywhere. The rest write jobs and source_runs to a
LOCAL database and are skipped without one (never the production URL in .env).
"""
import os
import uuid
from datetime import datetime, timedelta, timezone
from urllib.parse import parse_qs, urlsplit

import pytest
from psycopg_pool import PoolTimeout

from src.Agent.utils.types import Job
from src.database import session

URL = os.getenv("DATABASE_URL", "")


def _is_local(url: str) -> bool:
    parts = urlsplit(url)
    host = parts.hostname or parse_qs(parts.query).get("host", [""])[0]
    return host.startswith("/") or host in ("localhost", "127.0.0.1")


local = pytest.mark.skipif(not URL or not _is_local(URL), reason="writes jobs: needs DATABASE_URL on a local Postgres")


# ------------------------------------------------------------ waking the database

class _Conn:
    def __enter__(self):
        return self

    def __exit__(self, *exc):
        return False

    def cursor(self):
        return self

    def execute(self, sql):
        pass


def test_wake_tries_once_more_after_a_pause(monkeypatch):
    # 25 and 27 Sep 2026: a cold Neon compute took more than 10 s, nothing retried, nothing was stored.
    attempts, slept = [], []

    def connection():
        attempts.append(1)
        if len(attempts) == 1:
            raise PoolTimeout("couldn't get a connection after 10.00 sec")
        return _Conn()
    monkeypatch.setattr(session, "connection", connection)
    session.wake(sleep=slept.append)
    assert len(attempts) == 2 and slept == [session.WAKE_BACKOFF_SECONDS]


def test_wake_gives_up_after_its_one_retry(monkeypatch):
    def connection():
        raise PoolTimeout("cold")
    monkeypatch.setattr(session, "connection", connection)
    with pytest.raises(PoolTimeout):
        session.wake(sleep=lambda s: None)


# ------------------------------------------------------------ local database

NOW = datetime.now(timezone.utc)


class Board:
    """One test source, its jobs named by number, saved the way daily.save saves a source."""

    def __init__(self, closes=True):
        from src.database.services.ingestion import JobIngestionService
        self.provider = f"t{uuid.uuid4().hex[:8]}"
        self.source = f"greenhouse:{self.provider}"
        self.closes = closes
        self.ingestion = JobIngestionService()
        self.runs = 0

    def job(self, n):
        posted = (NOW - timedelta(days=2)).isoformat()
        return Job(provider=self.provider, external_id=str(n), title=f"Backend Engineer {n}", company="Acme",
                   description="Requirements: Python and SQL. " + "We ship. " * 60, location="Paris",
                   url=f"https://jobs.test/{self.provider}/{n}", posted_at=posted, posted_at_utc=posted, raw={"n": n})

    def fetch(self, numbers, error=None):
        """One fetch of the board: `numbers` listed, or a failure when `error` is set."""
        self.runs += 1
        run_at = NOW + timedelta(minutes=self.runs)
        listed = None if error else [self.job(n) for n in numbers]
        return self.ingestion.persist_source(run_at, self.source, listed, listed or [], error, self.closes)

    def state(self):
        from src.database.session import connection
        with connection() as conn, conn.cursor() as cur:
            cur.execute("select external_id, closed_at is not null as closed, missed_fetches from jobs "
                        "where provider = %s", (self.provider,))
            return {int(r["external_id"]): (r["closed"], r["missed_fetches"]) for r in cur.fetchall()}

    def runs_recorded(self):
        from src.database.session import connection
        with connection() as conn, conn.cursor() as cur:
            cur.execute("select ok, jobs, whole, closed, retired, error from source_runs where source = %s order by id",
                        (self.source,))
            return cur.fetchall()

    def drop(self):
        from src.database.session import connection
        with connection() as conn, conn.cursor() as cur:
            cur.execute("delete from jobs where provider = %s", (self.provider,))
            cur.execute("delete from source_runs where source = %s", (self.source,))


@pytest.fixture
def board():
    made = []

    def make(closes=True):
        made.append(Board(closes))
        return made[-1]
    yield make
    for b in made:
        b.drop()


@local
def test_two_full_fetches_without_a_job_close_it(board):
    b = board()
    b.fetch(range(10))
    assert b.fetch(range(9))["closed"] == 0               # one miss: still open
    assert b.state()[9] == (False, 1)
    out = b.fetch(range(9))                               # the second miss in a row closes it
    assert out == {"ok": True, "stored": 9, "whole": True, "closed": 1}
    assert b.state()[9] == (True, 2) and b.state()[0] == (False, 0)
    b.fetch(range(10))                                    # listed again: open again
    assert b.state()[9] == (False, 0)


@local
def test_a_failed_fetch_never_closes_or_counts_a_miss(board):
    b = board()
    b.fetch(range(10))
    b.fetch(range(9))
    assert b.fetch([], error="HTTPError") == {"ok": False, "stored": 0, "whole": False, "closed": 0}
    assert b.state()[9] == (False, 1)                     # untouched by the failure
    runs = b.runs_recorded()
    assert (runs[-1]["ok"], runs[-1]["error"]) == (False, "HTTPError")


@local
def test_a_fetch_under_half_the_usual_count_never_closes(board):
    # APIs fail by answering 200 with a short list. 4 of the usual 10 is suspect, twice in a row.
    b = board()
    for _ in range(3):
        b.fetch(range(10))
    b.fetch(range(4))
    b.fetch(range(4))
    assert all(not closed for closed, _ in b.state().values())
    assert [r["whole"] for r in b.runs_recorded()] == [True, True, True, False, False]


@local
def test_an_empty_fetch_never_closes(board):
    # Even once empty answers are the usual count: the median of [0, 0, 3] is 0.
    b = board()
    b.fetch(range(3))
    for _ in range(4):
        b.fetch([])
    assert all(not closed for closed, _ in b.state().values())


@local
def test_a_window_feed_never_closes_by_absence(board):
    b = board(closes=False)
    b.fetch(range(5))
    for _ in range(3):
        b.fetch(range(2))
    assert all(state == (False, 0) for state in b.state().values())


@local
def test_one_source_failing_to_save_leaves_the_others_and_its_own_jobs(board, monkeypatch):
    from src.database.repositories import job_repository
    from src.jobpool import daily
    a, b = board(), board()
    a.fetch(range(3))
    real = job_repository.upsert_many

    def upsert(conn, records):
        if records and records[0].source == a.source:
            real(conn, records)                    # half done, then the database fails
            raise RuntimeError("connection lost")
        return real(conn, records)
    monkeypatch.setattr(job_repository, "upsert_many", upsert)
    run_at = NOW + timedelta(hours=1)
    results = [(a.source, [a.job(n) for n in range(1)], None), (b.source, [b.job(n) for n in range(4)], None)]
    assert daily.save(a.ingestion, run_at, results, {s: jobs for s, jobs, _ in results}) == 1
    assert len(b.state()) == 4                             # the other source saved
    assert a.state() == {0: (False, 0), 1: (False, 0), 2: (False, 0)}   # its transaction rolled back whole
    assert (a.runs_recorded()[-1]["ok"], a.runs_recorded()[-1]["error"]) == (False, "save: RuntimeError")


@local
def test_a_source_failing_for_seven_days_is_retired_once(board, capsys):
    from src.database.repositories import source_repository
    from src.database.session import connection
    from src.jobpool import daily
    b = board()
    b.fetch(range(3))
    with connection() as conn:
        for days in (8, 5, 2):
            source_repository.record(conn, NOW - timedelta(days=days), b.source, ok=False, error="HTTPError")
        source_repository.record(conn, NOW, b.source, ok=False, error="HTTPError")
    # Its jobs were stored "now" by the first fetch; the failures are what count.
    with connection() as conn, conn.cursor() as cur:
        cur.execute("update source_runs set run_at = %s where source = %s and ok", (NOW - timedelta(days=9), b.source))
    daily.retire(NOW)
    out = capsys.readouterr().out
    assert f"::warning title=Source retired::{b.source} has failed every fetch since" in out and "3 jobs closed" in out
    assert all(closed for closed, _ in b.state().values())
    assert b.runs_recorded()[-1]["retired"] and b.runs_recorded()[-1]["closed"] == 3
    later = NOW + timedelta(hours=6)
    with connection() as conn:
        source_repository.record(conn, later, b.source, ok=False, error="HTTPError")
    daily.retire(later)
    assert "0 jobs closed" in capsys.readouterr().out          # still reported, closed once


@local
def test_a_source_that_answered_this_week_is_not_retired(board, capsys):
    from src.database.repositories import source_repository
    from src.database.session import connection
    from src.jobpool import daily
    b = board()
    b.fetch(range(2))                                          # a success now
    with connection() as conn:
        source_repository.record(conn, NOW + timedelta(hours=1), b.source, ok=False, error="HTTPError")
    daily.retire(NOW + timedelta(hours=1))
    assert b.source not in capsys.readouterr().out


@local
def test_the_live_pool_uses_closed_at_for_placed_jobs_and_the_old_rule_for_the_rest(board):
    from src.database.services.ingestion import JobIngestionService
    from src.database.session import connection
    from src.jobpool import snapshot
    b, window = board(), board(closes=False)
    b.fetch(range(4))
    window.fetch(range(2))
    b.fetch([0, 1, 2])
    b.fetch([0, 1, 2])                                         # job 3 closed
    ids = []
    with connection() as conn, conn.cursor() as cur:
        cur.execute("select id from jobs where provider in (%s, %s)", (b.provider, window.provider))
        ids = [r["id"] for r in cur.fetchall()]
        # 10 days unseen: job 1 placed (source set), job 2 from before migration 018 (no source), a window job.
        cur.execute("update jobs set last_seen_at = now() - interval '10 days' "
                    "where provider = %s and external_id in ('1', '2')", (b.provider,))
        cur.execute("update jobs set source = null where provider = %s and external_id = '2'", (b.provider,))
        cur.execute("update jobs set last_seen_at = now() - interval '10 days' where provider = %s and external_id = '0'",
                    (window.provider,))
    JobIngestionService().refresh_profiles(ids)
    # The pool exactly as snapshot.pool_rows reads it, with the test board as a complete board.
    from src.database.repositories import profile_repository
    from src.jobpool.sources import FULL_BOARDS, POOL_WINDOWS
    from src.matching.requirements import PROFILER_VERSION
    with connection() as conn:
        rows = profile_repository.counted_pool(conn, {
            **POOL_WINDOWS, "version": PROFILER_VERSION, "families": snapshot.ALL_FAMILIES, "too_senior": [],
            "refreshed": [*FULL_BOARDS, b.provider], "limit": snapshot.POOL_LIMIT})
    live = {(r["provider"], r["url"].rsplit("/", 1)[1]) for r in rows if r["provider"] in (b.provider, window.provider)}
    assert (b.provider, "0") in live
    assert (b.provider, "1") in live                           # not seen for 10 days, but never missed by a full fetch
    assert (b.provider, "2") not in live                       # no source yet: the old 3 day rule
    assert (b.provider, "3") not in live                       # closed
    assert (window.provider, "0") in live                      # a window feed: age only
