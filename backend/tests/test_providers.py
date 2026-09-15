"""
What each search provider sends and what it parses, pinned before the provider
refactor so the refactor is checked against behaviour, not just imports.
No network: requests is faked.
"""
import pytest
import requests

import src.Agent.Framework.providers as providers_module
from src.Agent.Framework.providers import JoobleProvider, JSearchProvider, MuseProvider
from src.Agent.utils.types import ParsedQuery, SearchQuery, SearchScope

QUERY = SearchQuery.from_parsed(ParsedQuery(
    primary_role="Data Engineer", experience_level="Mid Level", category="Data and Analytics",
    job_requirements="under_3_years_experience",
))
LOCAL = SearchScope(kind="local", label="local:ke", country_code="ke", country_name="Kenya",
                    city="Nairobi", place="Nairobi, Kenya")
REMOTE = SearchScope(kind="remote", label="remote:global", country_code="ke", country_name="Kenya")


class FakeResponse:
    def __init__(self, status, body):
        self.status_code, self._body, self.text = status, body, str(body)

    def json(self):
        return self._body


@pytest.fixture
def http(monkeypatch):
    calls = []
    replies = []

    def fake(method):
        def call(url, **kwargs):
            calls.append({"method": method, "url": url, **kwargs})
            reply = replies.pop(0)
            if isinstance(reply, Exception):
                raise reply
            return reply
        return call

    monkeypatch.setattr(providers_module.requests, "get", fake("GET"))
    monkeypatch.setattr(providers_module.requests, "post", fake("POST"))
    monkeypatch.setenv("JSEARCH_API_KEY", "k"); monkeypatch.setenv("JSEARCH_HOST", "h")
    monkeypatch.setenv("MUSE_API_KEY", "m"); monkeypatch.setenv("JOOBLE_API_KEY", "j")
    return calls, replies


JSEARCH_JOB = {"job_id": "abc", "job_title": "Data Engineer", "employer_name": "Acme",
               "job_description": "SQL", "job_city": "Nairobi", "job_country": "KE",
               "job_is_remote": False, "job_apply_link": "https://acme.test/1",
               "job_min_salary": 10, "job_max_salary": 20, "job_salary_currency": "KES",
               "job_salary_period": "MONTH", "job_employment_type": "FULLTIME",
               "job_posted_at": "2 days ago", "job_posted_at_datetime_utc": "2026-09-13T00:00:00Z"}


def test_jsearch_local_request_and_parse(http):
    calls, replies = http
    replies.append(FakeResponse(200, {"data": {"jobs": [JSEARCH_JOB]}}))
    log = []
    jobs = JSearchProvider().search(QUERY, LOCAL, run_log=log)

    assert calls[0]["url"] == "https://jsearch.p.rapidapi.com/search-v2"
    assert calls[0]["params"] == {"query": "Data Engineer in Nairobi, Kenya", "page": 1, "num_pages": "1",
                                  "job_requirements": "under_3_years_experience", "country": "ke"}
    assert calls[0]["headers"]["x-rapidapi-key"] == "k"
    j = jobs[0]
    assert (j.provider, j.external_id, j.title, j.company, j.location) == ("jsearch", "abc", "Data Engineer", "Acme", "Nairobi, KE")
    assert (j.url, j.salary_min, j.salary_max, j.employment_type) == ("https://acme.test/1", 10, 20, "FULLTIME")
    assert log[0]["status"] == "ok" and log[0]["jobs_returned"] == 1 and log[0]["scope"] == "local:ke"
    assert log[0]["request_params"]["country"] == "ke"


def test_jsearch_remote_sets_work_from_home(http):
    calls, replies = http
    replies.append(FakeResponse(200, {"data": {"jobs": []}}))
    JSearchProvider().search(QUERY, REMOTE, run_log=[])
    assert calls[0]["params"]["work_from_home"] == "true"
    assert calls[0]["params"]["query"] == "Data Engineer"


@pytest.mark.parametrize("reply, status", [
    (FakeResponse(500, "boom"), "http_error"),
    (requests.Timeout("slow"), "timeout"),
    (ValueError("bad json"), "exception"),
])
def test_failures_are_logged_not_raised(http, reply, status):
    calls, replies = http
    replies.append(reply)
    log = []
    assert JSearchProvider().search(QUERY, LOCAL, run_log=log) == []
    assert log[0]["status"] == status and log[0]["jobs_returned"] == 0 and "error" in log[0]


def test_muse_filters_local_results_by_place_and_hides_key(http):
    calls, replies = http
    replies.append(FakeResponse(200, {"results": [
        {"id": 1, "name": "Analyst", "company": {"name": "A"}, "locations": [{"name": "Nairobi, Kenya"}],
         "levels": [{"name": "Mid Level"}], "refs": {"landing_page": "https://muse.test/1"}, "contents": "x"},
        {"id": 2, "name": "Analyst", "company": {"name": "B"}, "locations": [{"name": "Dallas, TX"}],
         "refs": {"landing_page": "https://muse.test/2"}},
    ]}))
    log = []
    jobs = MuseProvider().search(QUERY, LOCAL, run_log=log)
    assert calls[0]["params"] == {"api_key": "m", "page": 1, "level": "Mid Level",
                                  "category": "Data and Analytics", "location": "Nairobi, Kenya"}
    assert [j.external_id for j in jobs] == ["1"]
    assert jobs[0].experience_level == "Mid Level" and jobs[0].url == "https://muse.test/1"
    assert "api_key" not in log[0]["request_params"]


def test_muse_remote_leg_does_not_filter(http):
    calls, replies = http
    replies.append(FakeResponse(200, {"results": [{"id": 3, "name": "X", "company": {}, "locations": [{"name": "Dallas"}], "refs": {}}]}))
    assert len(MuseProvider().search(QUERY, REMOTE, run_log=[])) == 1
    assert calls[0]["params"]["location"] == "Flexible / Remote"


def test_jooble_posts_keywords_and_place(http):
    calls, replies = http
    replies.append(FakeResponse(200, {"jobs": [{"id": 9, "title": "Data Engineer", "company": "C",
                                                "snippet": "s", "location": "Nairobi", "link": "https://j.test/9"}]}))
    jobs = JoobleProvider().search(QUERY, LOCAL, run_log=[])
    assert calls[0]["method"] == "POST" and calls[0]["url"] == "https://jooble.org/api/j"
    assert calls[0]["json"] == {"keywords": "Data Engineer", "location": "Nairobi, Kenya"}
    assert (jobs[0].external_id, jobs[0].url) == ("9", "https://j.test/9")


def test_providers_skip_legs_they_cannot_serve():
    assert not JoobleProvider().supports(REMOTE)
    assert MuseProvider().supports(LOCAL) and MuseProvider().supports(REMOTE)


def test_engine_dedupes_by_storage_identity_and_filters_by_tier(monkeypatch):
    from src.Agent.Framework.SearchEngine import SearchEngine
    from src.Agent.utils.types import Job
    from src.Agent.utils import location as loc

    same = dict(provider="board", title="Engineer", company="Acme", location="Nairobi, Kenya", url="https://acme.test/1")
    jobs = [
        Job(external_id="1", **same), Job(external_id="1", **same),                       # duplicate
        Job(provider="board", external_id="2", title="Remote dev", remote=True, location="Remote - Spain"),
        Job(provider="board", external_id="3", title="Remote dev", remote=True, remote_eligibility="USA"),
        Job(provider="board", external_id="4", title="Remote dev", remote=True, remote_eligibility="Worldwide"),
    ]
    # JSearch gives the same posting a new id per call; the URL still matches.
    jobs.append(Job(provider="jsearch", external_id="call-2-id", title="Engineer", url="https://acme.test/1/"))
    unique, dropped = SearchEngine._dedupe(jobs)
    assert dropped == 2 and len(unique) == 4
    # Same careers page, different ?gh_jid=: different jobs.
    gh = [Job(provider="greenhouse", external_id=str(i), title="Role", url=f"https://stripe.com/jobs/search?gh_jid={i}") for i in (1, 2)]
    assert SearchEngine._dedupe(gh)[1] == 0
    resolved = loc.ResolvedLocation(country_code="ke", country_name="Kenya", city="Nairobi")
    kept, ineligible = SearchEngine._filter_eligible(unique, resolved)
    assert [j.external_id for j in kept] == ["1", "4"] and ineligible == 2
    assert SearchEngine._filter_eligible(unique, loc.ResolvedLocation()) == (unique, 0)
