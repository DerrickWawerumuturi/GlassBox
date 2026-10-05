"""Daily pool refresh contract. Offline: sources and storage are faked."""
from datetime import datetime, timedelta, timezone

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


def test_mostly_dead_sources_fail_the_run(monkeypatch):
    monkeypatch.setattr(daily, "fetch_all", lambda: ([job(1)], [("a", 1, None)] + [(f"s{i}", 0, "URLError") for i in range(5)]))
    monkeypatch.setattr(daily, "JobIngestionService", lambda: pytest_fail("stored a failed run"))
    assert daily.main() == 1


def test_one_dead_source_does_not(monkeypatch):
    stored = {}

    class Ingestion:
        def persist_jobs(self, search_id, jobs, observe=True, profile=True):
            stored.update(search_id=search_id, n=len(jobs), observe=observe, profile=profile)
            return {i: i for i in range(len(jobs))}

        def refresh_profiles(self, ids=None):
            stored.update(profiled_all=ids is None)
            return 1

    monkeypatch.setattr(daily, "fetch_all", lambda: ([job(1, 1), job(120, 2)], [("a", 2, None), ("b", 0, "TimeoutError")]))
    monkeypatch.setattr(daily, "JobIngestionService", Ingestion)
    monkeypatch.setattr(daily.snapshot, "take", lambda: None)
    assert daily.main() == 0
    # Stored without observations, then profiled in one pass over everything stale.
    assert stored == {"search_id": None, "n": 1, "observe": False, "profile": False, "profiled_all": True}


def test_nothing_stored_fails_the_run(monkeypatch):
    class Ingestion:
        def persist_jobs(self, *a, **k):
            return {}

    monkeypatch.setattr(daily, "fetch_all", lambda: ([job(1)], [("a", 1, None)]))
    monkeypatch.setattr(daily, "JobIngestionService", Ingestion)
    assert daily.main() == 1


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
