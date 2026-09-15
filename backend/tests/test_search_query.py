"""
Regression: the agent once wrapped the whole ParsedQuery as SearchQuery(query).
Nothing raised — location.resolve reads fields with getattr defaults — so every
analysis silently searched with no location and the object's repr as the role.
"""
import dataclasses

import pytest

from src.Agent.Framework import JobRadarAgent as agent_module
from src.Agent.Framework.providers import JSearchProvider
from src.Agent.utils import location as loc
from src.Agent.utils.types import ParsedQuery, SearchQuery, SearchScope

PARSED = ParsedQuery(
    primary_role="Machine Learning Engineer",
    secondary_roles=["Data Scientist"],
    category="Data Science",
    skills=["Python", "PyTorch"],
    experience_level="Mid Level",
    job_requirements="2+ years ML in production",
    location="Nairobi, Kenya",
    country_code="ke",
    city="Nairobi",
    remote=False,
)


def test_from_parsed_maps_every_search_field():
    q = SearchQuery.from_parsed(PARSED)
    assert q.primary_role == "Machine Learning Engineer"
    assert q.location == "Nairobi, Kenya"
    assert q.country_code == "ke"
    assert q.city == "Nairobi"
    assert q.remote is False
    assert q.skills == ["Python", "PyTorch"]
    assert q.experience_level == "Mid Level"
    assert q.job_requirements == "2+ years ML in production"
    assert q.category == "Data Science"


def test_search_query_mirrors_parsed_query_fields_it_needs():
    # A field added to SearchQuery must exist on ParsedQuery, or from_parsed drifts.
    missing = {f.name for f in dataclasses.fields(SearchQuery)} - set(ParsedQuery.model_fields)
    assert not missing, f"SearchQuery fields with no ParsedQuery source: {missing}"


def test_whole_parsed_query_is_rejected_as_a_role():
    with pytest.raises(TypeError):
        SearchQuery(PARSED)


def test_location_reaches_the_resolver():
    resolved = loc.resolve(SearchQuery.from_parsed(PARSED))
    assert resolved.country_code == "ke"
    assert resolved.city == "Nairobi"


def test_providers_receive_the_role_string(monkeypatch):
    sent = {}

    class Response:
        status_code = 200
        def json(self):
            return {"data": {"jobs": []}}

    def fake_get(url, params=None, **kwargs):
        sent[url] = params
        return Response()

    monkeypatch.setenv("JSEARCH_API_KEY", "k")
    monkeypatch.setattr("src.Agent.Framework.providers.requests.get", fake_get)
    q = SearchQuery.from_parsed(PARSED)
    JSearchProvider().search(q, SearchScope(kind="remote", label="remote:global", country_code="ke"))
    assert sent["https://jsearch.p.rapidapi.com/search-v2"]["query"] == "Machine Learning Engineer"
    assert sent["https://jsearch.p.rapidapi.com/search-v2"]["country"] == "ke"


def test_agent_passes_mapped_query_to_search(monkeypatch):
    captured = {}

    class StopAfterSearch(Exception):
        pass

    agent = agent_module.JobRadarAgent.__new__(agent_module.JobRadarAgent)
    agent.query_interpreter = type("I", (), {"parse": lambda self, text: PARSED})()

    def get_jobs(query, run_log=None):
        captured["query"] = query
        raise StopAfterSearch

    agent.search_engine = type("S", (), {"get_jobs": staticmethod(get_jobs)})()
    with pytest.raises(StopAfterSearch):
        agent.run("cv text")

    q = captured["query"]
    assert isinstance(q.primary_role, str) and q.primary_role == "Machine Learning Engineer"
    assert loc.resolve(q).country_code == "ke"


def _captured_search(monkeypatch, **run_kwargs):
    captured = {}

    class StopAfterSearch(Exception):
        pass

    agent = agent_module.JobRadarAgent.__new__(agent_module.JobRadarAgent)
    agent.query_interpreter = type("I", (), {"parse": lambda self, text: PARSED})()

    def get_jobs(query, run_log=None):
        captured["query"] = query
        raise StopAfterSearch

    agent.search_engine = type("S", (), {"get_jobs": staticmethod(get_jobs)})()
    with pytest.raises(StopAfterSearch):
        agent.run("cv text", **run_kwargs)
    return captured["query"]


def test_saved_preferences_decide_where_the_search_runs(monkeypatch):
    q = _captured_search(monkeypatch, location_preferences={"country_code": "gb", "city": "London"})
    resolved = loc.resolve(q)
    assert (resolved.country_code, resolved.city) == ("gb", "London")
    assert q.primary_role == "Machine Learning Engineer"


def test_cv_location_used_when_nothing_is_saved(monkeypatch):
    assert loc.resolve(_captured_search(monkeypatch)).country_code == "ke"
