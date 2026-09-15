"""Pasted link -> fields, for each way a page can describe a job. No network."""
import json

import pytest

from src.jobpool import extract as ex

JSON_LD = {"@context": "https://schema.org", "@graph": [{"@type": "Organization", "name": "x"}, {
    "@type": "JobPosting", "title": "[Hiring] Senior Data Engineer @Acme Analytics",
    "hiringOrganization": {"@type": "Organization", "name": "Acme Analytics"},
    "description": "&lt;p&gt;Requirements: 4+ years of experience with Python and Apache Spark. This is a hybrid role.&lt;/p&gt;",
    "jobLocation": {"@type": "Place", "address": {"addressLocality": "Nairobi", "addressCountry": {"name": "Kenya"}}},
    "employmentType": ["FULL_TIME"], "datePosted": "2026-09-12",
    "baseSalary": {"currency": "KES", "value": {"minValue": 350000, "maxValue": 500000, "unitText": "MONTH"}},
    "identifier": {"value": "DE-221"}}]}

PAGES = {
    "https://careers.acme.test/jobs/1": f'<html><script type="application/ld+json">{json.dumps(JSON_LD)}</script></html>',
    "https://jobs.meta.test/role": '<meta property="og:title" content="Backend Engineer at Tiny Startup">',
    "https://generic.test/careers": "<title>Acme Careers</title>",
}


@pytest.fixture(autouse=True)
def offline(monkeypatch):
    monkeypatch.setattr(ex, "_check_public", lambda url: None)
    monkeypatch.setattr(ex, "_from_ats", lambda url: None)

    def fetch(url):
        if "blocked" in url:
            raise ex._Blocked(403)
        return url, PAGES[url]
    monkeypatch.setattr(ex, "_fetch", fetch)


def test_json_ld_posting():
    r = ex.extract("https://careers.acme.test/jobs/1")
    f = r["fields"]
    assert r["method"] == "json-ld" and r["missing"] == [] and r["_job"] is not None
    assert (f["title"], f["company"], f["location"]) == ("Senior Data Engineer", "Acme Analytics", "Nairobi, Kenya")
    assert (f["workplace"], f["employment_type"], f["salary"]) == ("hybrid", "Full-time", "KES 350,000–500,000 / month")
    assert r["experience"] == {"years": 4, "kind": "required"}
    assert r["_job"].external_id == "careers.acme.test:DE-221"   # page ids are namespaced by site


def test_meta_tags_only_are_partial_and_not_pooled():
    r = ex.extract("https://jobs.meta.test/role")
    assert r["method"] == "page-meta" and r["_job"] is None
    assert (r["fields"]["title"], r["fields"]["company"]) == ("Backend Engineer", "Tiny Startup")
    assert r["missing"] == ["location", "workplace"] and "check the highlighted" in r["message"]


def test_generic_careers_page_title_is_not_a_job_title():
    r = ex.extract("https://generic.test/careers")
    assert r["fields"]["title"] is None and r["method"] == "none"


def test_blocked_page_keeps_what_the_url_says():
    r = ex.extract("https://blocked.linkedin.test/jobs/view/machine-learning-engineer-at-safaricom-4021337")
    assert r["method"] == "url-path" and r["source"] == "linkedin"
    assert (r["fields"]["title"], r["fields"]["company"]) == ("Machine Learning Engineer", "Safaricom")
    assert "blocks automated reading" in r["message"]


def test_pool_hit_skips_fetching(monkeypatch):
    from src.Agent.utils.types import Job
    monkeypatch.setattr(ex, "_fetch", lambda url: pytest.fail("fetched a pooled posting"))
    pooled = Job(provider="greenhouse", external_id="1", title="Pooled Role", company="Co", location="Remote", remote=True, db_id=5)
    r = ex.extract("https://careers.acme.test/jobs/1", pool_lookup=lambda url: pooled)
    assert r["method"] == "pool" and r["_job"].db_id == 5 and r["fields"]["workplace"] == "remote"
