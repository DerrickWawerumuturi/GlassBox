"""Location-aware ranking: tiers relative to the user, never a hard-coded country."""
from types import SimpleNamespace as Job

import pytest

from src.Agent.utils import location as loc

KE = loc.LocationPreferences(country_code="ke", city="Nairobi")
US = loc.LocationPreferences(country_code="us")


def tier(prefs, location, remote=False, eligibility=None):
    return loc.location_tier(Job(location=location, remote=remote, remote_eligibility=eligibility), prefs)


@pytest.mark.parametrize("location, remote, eligibility, expected", [
    ("Nairobi, Kenya", False, None, "local"),
    ("Westlands, Nairobi", False, None, "local"),
    ("Remote, Kenya", True, None, "remote_country"),
    ("Remote", True, "Algeria, Angola, Benin, Kenya", "remote_country"),
    ("Remote", True, "Africa", "remote_region"),
    ("Remote - EMEA", True, None, "remote_emea"),
    ("Remote", True, "Worldwide", "remote_global"),
    ("Remote", True, None, "remote_unspecified"),
    ("Remote", True, "USA", "ineligible"),
    ("San Francisco, CA", False, None, "international"),
])
def test_kenya_profile_default_order(location, remote, eligibility, expected):
    assert tier(KE, location, remote, eligibility) == expected


def test_default_order_prefers_kenya_then_remote_then_international():
    fits = [loc.location_fit(t, KE) for t in loc.TIERS]
    assert fits == sorted(fits, reverse=True) and fits[0] == 1.0
    assert loc.location_fit("ineligible", KE) == 0.0


def test_same_jobs_rank_differently_for_a_us_user():
    assert tier(US, "San Francisco, CA") == "local"
    assert tier(US, "New York City Office") == "local"
    assert tier(US, "Nairobi, Kenya") == "international"
    assert tier(US, "Remote", True, "USA") == "remote_country"
    assert tier(US, "Remote", True, "Africa") == "ineligible"


def test_saved_order_changes_ranking():
    remote_first = loc.LocationPreferences.from_dict(
        {"country_code": "ke", "order": ["remote_global", "remote_country", "local"]})
    assert loc.location_fit("remote_global", remote_first) > loc.location_fit("local", remote_first)
    assert loc.location_fit("international", remote_first) == 0.0


def test_preference_resolution_order():
    cv = loc.ResolvedLocation(country_code="ng", country_name="Nigeria", city="Lagos")
    assert loc.LocationPreferences.resolve(cv).country_code == "ng"
    assert loc.LocationPreferences.resolve(cv, saved={"country_code": "gb"}).country_code == "gb"
    assert loc.LocationPreferences.resolve(loc.ResolvedLocation()).source == "default"


def test_invalid_order_rejected():
    with pytest.raises(ValueError):
        loc.LocationPreferences(country_code="ke", order=("local", "local"))
    with pytest.raises(ValueError):
        loc.LocationPreferences(country_code="ke", order=("moon",))


@pytest.mark.parametrize("location, remote, expected", [
    ("Remote - Spain", True, "ineligible"),
    ("Remote - US", True, "ineligible"),
    ("Remote - India", True, "ineligible"),
    ("New York City Office", True, "ineligible"),
    ("Remote", True, "remote_unspecified"),
    ("Flexible / Remote", True, "remote_unspecified"),
    ("Remote, Kenya", True, "remote_country"),
    ("Nairobi Office", True, "remote_country"),
])
def test_remote_postings_restricted_by_named_place(location, remote, expected):
    assert tier(KE, location, remote) == expected


def test_same_remote_us_posting_is_local_market_for_a_us_user():
    assert tier(US, "Remote - US", True) == "remote_country"


def test_ineligible_never_outranks_eligible():
    from src.Agent.Framework.JobRadarAgent import JobRadarAgent
    from src.Agent.utils.types import Job as Posting, ParsedQuery, ProcessedJob
    query = ParsedQuery(primary_role="Backend Engineer", skills=["Python", "PostgreSQL"])
    # The ineligible one is the closer text match, and still ranks last.
    spain = Posting(title="Backend Engineer", description="Requirements: Python, PostgreSQL.",
                    location="Remote - Spain", remote=True)
    anywhere = Posting(title="Engineer", description="Requirements: Python.", location="Remote",
                       remote=True, remote_eligibility="Worldwide")
    ranked = JobRadarAgent.score_jobs(query, [ProcessedJob(spain, []), ProcessedJob(anywhere, [])], KE)
    assert [r["location_tier"] for r in ranked] == ["remote_global", "ineligible"]
    assert ranked[1]["match"]["tier"] == "unlikely"


@pytest.mark.parametrize("location, eligibility, expected", [
    ("Remote, South Africa", None, "ineligible"),
    ("Remote", "South Africa", "ineligible"),
    ("Remote", "Africa", "remote_region"),
    ("Remote", "Africa, Europe", "remote_region"),
])
def test_south_africa_is_not_the_continent(location, eligibility, expected):
    assert tier(KE, location, True, eligibility) == expected
    assert loc.remote_eligibility("South Africa", "ke") is False
    assert loc.remote_eligibility("Africa", "ke") is True
