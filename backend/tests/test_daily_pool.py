"""Daily pool refresh contract. Offline: sources and storage are faked."""
from datetime import datetime, timedelta, timezone

import pytest

from src.Agent.utils.types import Job
from src.jobpool import daily, sources

NOW = datetime.now(timezone.utc)


def job(days_old, n=1):
    return Job(provider="test", external_id=str(n), title="Engineer",
               posted_at_utc=(NOW - timedelta(days=days_old)).isoformat())


def test_window_keeps_live_requisitions_up_to_90_days():
    assert daily.is_recent(job(89), NOW)
    assert not daily.is_recent(job(91), NOW)
    assert not daily.is_recent(Job(provider="t", title="x"), NOW)


class Ingestion:
    """Records each source's save; `broken` sources raise as a database error would."""
    enabled = True

    def __init__(self, broken=()):
        self.saved, self.broken, self.profiled = [], set(broken), False

    def persist_source(self, run_at, source, listed, recent, error=None, closes=False):
        if source in self.broken and listed is not None:
            raise RuntimeError("connection lost")
        self.saved.append({"source": source, "listed": None if listed is None else len(listed),
                           "recent": len(recent), "error": error, "closes": closes})
        return {"ok": listed is not None, "stored": len(recent), "whole": closes, "closed": 0}

    def refresh_profiles(self, ids=None):
        self.profiled = ids is None
        return 1


def _offline(monkeypatch, results, ingestion):
    monkeypatch.setattr(daily, "fetch_all", lambda: results)
    monkeypatch.setattr(daily, "JobIngestionService", lambda: ingestion)
    monkeypatch.setattr(daily, "wake", lambda: None)
    monkeypatch.setattr(daily, "retire", lambda run_at: None)
    monkeypatch.setattr(daily.snapshot, "take", lambda: None)
    monkeypatch.setattr(daily.publish, "run", lambda: None)


def test_mostly_dead_sources_fail_the_run(monkeypatch):
    results = [("a", [job(1)], None)] + [(f"s{i}", None, "URLError") for i in range(5)]
    monkeypatch.setattr(daily, "fetch_all", lambda: results)
    monkeypatch.setattr(daily, "JobIngestionService", lambda: pytest_fail("stored a failed run"))
    assert daily.main() == 1


def test_each_source_is_saved_on_its_own(monkeypatch):
    ingestion = Ingestion()
    _offline(monkeypatch, [("greenhouse:acme", [job(1, 1), job(120, 2)], None), ("remoteok", [job(1, 3)], None),
                           ("greenhouse:gone", None, "HTTPError")], ingestion)
    assert daily.main() == 0
    by = {s["source"]: s for s in ingestion.saved}
    # Old jobs aren't stored, but the count the closing rule compares is everything listed.
    assert by["greenhouse:acme"] == {"source": "greenhouse:acme", "listed": 2, "recent": 1, "error": None, "closes": True}
    assert by["remoteok"]["closes"] is False                      # a window feed closes nothing by absence
    assert by["greenhouse:gone"] == {"source": "greenhouse:gone", "listed": None, "recent": 0,
                                     "error": "HTTPError", "closes": True}   # recorded, touches no job
    assert ingestion.profiled                                     # then one pass over everything stale


def test_one_source_failing_to_save_never_stops_the_others(monkeypatch, capsys):
    ingestion = Ingestion(broken={"ashby:b"})
    _offline(monkeypatch, [(name, [job(1, i)], None) for i, name in enumerate(("ashby:a", "ashby:b", "ashby:c"))],
             ingestion)
    assert daily.main() == 0
    saved = [(s["source"], s["listed"], s["error"]) for s in ingestion.saved]
    assert ("ashby:a", 1, None) in saved and ("ashby:c", 1, None) in saved
    assert ("ashby:b", None, "save: RuntimeError") in saved        # recorded as a failed fetch
    assert "::warning title=Sources not saved::ashby:b (RuntimeError)" in capsys.readouterr().out


def test_a_partial_read_closes_nothing(monkeypatch):
    ingestion = Ingestion()
    _offline(monkeypatch, [("arbeitnow", sources.Partial([job(1)]), None), ("ashby:a", [job(1, 2)], None)], ingestion)
    assert daily.main() == 0
    assert {s["source"]: s["closes"] for s in ingestion.saved} == {"arbeitnow": False, "ashby:a": True}


def test_nothing_saved_fails_the_run(monkeypatch):
    ingestion = Ingestion(broken={"a"})
    _offline(monkeypatch, [("a", [job(1)], None)], ingestion)
    assert daily.main() == 1


def test_an_unreachable_database_fails_the_run(monkeypatch, capsys):
    from psycopg_pool import PoolTimeout

    def cold():
        raise PoolTimeout("couldn't get a connection after 10.00 sec")
    _offline(monkeypatch, [("a", [job(1)], None)], Ingestion())
    monkeypatch.setattr(daily, "wake", cold)
    assert daily.main() == 1
    assert "::error title=Database unreachable::PoolTimeout" in capsys.readouterr().out


def test_a_held_back_publication_warns_and_keeps_the_run_green(monkeypatch, capsys):
    _offline(monkeypatch, [("a", [job(1)], None)], Ingestion())
    held = {"status": "rejected", "week": None, "jobs": 10, "gates": [
        {"gate": "jobs", "ok": False, "detail": "10 jobs counted (at least 5,000)"}, {"gate": "fresh", "ok": True, "detail": "x"}]}
    monkeypatch.setattr(daily.publish, "run", lambda: held)
    assert daily.main() == 0
    assert "::warning title=Market held back::jobs: 10 jobs counted (at least 5,000)" in capsys.readouterr().out


def test_which_sources_close_by_absence():
    assert all(sources.closes_by_absence(s) for s in ("greenhouse:stripe", "ashby:a", "lever:b", "workable:c", "arbeitnow"))
    assert not any(sources.closes_by_absence(s) for s in
                   ("remoteok", "remotive", "jobicy", "himalayas", "himalayas_regional", "weworkremotely", "ke:myjobmag"))


def test_fetch_all_names_each_source_and_reports_failures(monkeypatch):
    def remoteok():
        return [job(1)]
    monkeypatch.setattr(sources, "AGGREGATORS", [remoteok])
    monkeypatch.setattr(sources, "KENYAN_BOARDS", {"myjobmag": "x"})
    monkeypatch.setattr(sources, "load_boards", lambda: [("greenhouse", "acme")])
    monkeypatch.setattr(sources, "kenyan_board", lambda name: (_ for _ in ()).throw(TimeoutError()))
    monkeypatch.setitem(sources.ATS, "greenhouse", lambda slug: [job(1), job(2, 2)])
    out = {name: (len(jobs) if jobs is not None else None, err) for name, jobs, err in sources.fetch_all(2)}
    assert out == {"greenhouse:acme": (2, None), "remoteok": (1, None), "ke:myjobmag": (None, "TimeoutError")}


def test_a_failed_snapshot_warns_on_the_run_and_keeps_it_green(monkeypatch, capsys):
    # 2 to 5 October 2026 wrote no snapshot and nobody saw why: the failure was
    # a plain log line. Now it is a GitHub Actions warning annotation, one line.
    def fail():
        raise RuntimeError("relation \"market_snapshots\" does not exist\nLINE 1: insert into")

    monkeypatch.setattr(daily.snapshot, "take", fail)
    daily.take_snapshot()
    out = capsys.readouterr().out.strip()
    assert out.startswith("::warning title=Market snapshot not taken::RuntimeError: relation")
    assert "\n" not in out and "%0ALINE 1" in out


def pytest_fail(message):
    raise AssertionError(message)


REMOTEOK_ITEM = {"id": "77", "position": "Backend Engineer", "company": "Remote Co", "description": "<p>Go</p>",
                 "location": "Worldwide", "salary_min": 100, "salary_max": 150, "url": "https://remoteok.test/77",
                 "date": "2026-09-10T00:00:00+00:00"}
REMOTIVE_ITEM = {"id": 55, "title": "Data Analyst", "company_name": "Remotive Co", "description": "SQL",
                 "candidate_required_location": "Africa", "job_type": "full_time", "url": "https://remotive.test/55",
                 "publication_date": "2026-09-11T10:00:00"}


def test_remoteok_normalization(monkeypatch):
    monkeypatch.setattr(sources, "_json", lambda url: [{"legal": "notice"}, REMOTEOK_ITEM])
    [j] = sources.remoteok()
    assert (j.provider, j.external_id, j.title, j.company) == ("remoteok", "77", "Backend Engineer", "Remote Co")
    assert (j.location, j.remote, j.remote_eligibility) == ("Worldwide", True, "Worldwide")
    assert (j.salary_min, j.salary_max, j.url, j.posted_at_utc) == (100, 150, "https://remoteok.test/77", "2026-09-10T00:00:00+00:00")


def test_remotive_normalization(monkeypatch):
    monkeypatch.setattr(sources, "_json", lambda url: {"jobs": [REMOTIVE_ITEM]})
    [j] = sources.remotive()
    assert (j.provider, j.external_id, j.title, j.company) == ("remotive", "55", "Data Analyst", "Remotive Co")
    assert (j.location, j.remote, j.remote_eligibility, j.employment_type) == ("Africa", True, "Africa", "full_time")
    assert (j.url, j.posted_at_utc) == ("https://remotive.test/55", "2026-09-11T10:00:00")


def arbeitnow_feed(pages: int, fail_at: int | None = None):
    """A fake Arbeitnow feed of `pages` pages, one job each; the requested pages are recorded."""
    asked = []

    def fetch(url):
        page = int(url.rsplit("=", 1)[1])
        asked.append(page)
        if page == fail_at:
            raise TimeoutError()
        if page > pages:
            return {"data": [], "links": {"next": None}}
        nxt = f"https://www.arbeitnow.com/api/job-board-api?page={page + 1}" if page < pages else None
        return {"data": [{"slug": f"job-{page}", "title": "Werkstudent Software", "created_at": 1759795200}],
                "links": {"next": nxt}}
    return fetch, asked


def test_arbeitnow_reads_the_whole_feed_and_stops_where_it_ends(monkeypatch):
    # Pages 1 and 2 alone missed three quarters of its early career jobs (2026-10-07).
    fetch, asked = arbeitnow_feed(5)
    monkeypatch.setattr(sources, "_json", fetch)
    assert [j.external_id for j in sources.arbeitnow()] == [f"job-{p}" for p in range(1, 6)]
    assert asked == [1, 2, 3, 4, 5]


def test_arbeitnow_pages_are_capped_by_the_setting(monkeypatch):
    fetch, asked = arbeitnow_feed(50)
    monkeypatch.setattr(sources, "_json", fetch)
    monkeypatch.setattr(sources, "ARBEITNOW_PAGES", 3)
    assert len(sources.arbeitnow()) == 3 and asked == [1, 2, 3]


def test_arbeitnow_keeps_the_pages_read_before_a_later_one_fails(monkeypatch):
    fetch, _ = arbeitnow_feed(10, fail_at=4)
    monkeypatch.setattr(sources, "_json", fetch)
    read = sources.arbeitnow()
    # Kept, but marked: a feed read halfway closes none of the jobs it didn't reach.
    assert len(read) == 3 and isinstance(read, sources.Partial)
    fetch, _ = arbeitnow_feed(3)
    monkeypatch.setattr(sources, "_json", fetch)
    assert not isinstance(sources.arbeitnow(), sources.Partial)
    fetch, _ = arbeitnow_feed(10, fail_at=1)
    monkeypatch.setattr(sources, "_json", fetch)
    with pytest.raises(TimeoutError):
        sources.arbeitnow()
