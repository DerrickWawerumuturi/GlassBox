"""Source mapping regressions for provider workplace semantics."""
from src.jobpool.sources import ashby_job
from src.jobpool.posting import workplace


def test_ashby_hybrid_is_not_marked_remote_only():
    job = ashby_job({
        "id": "hybrid-1",
        "title": "Software Engineer",
        "workplaceType": "Hybrid",
        "isRemote": True,
    }, "acme")
    assert job.remote is False
    assert workplace(job) == "hybrid"


def test_ashby_explicit_remote_remains_remote():
    job = ashby_job({
        "id": "remote-1",
        "title": "Software Engineer",
        "workplaceType": "Remote",
        "isRemote": True,
    }, "acme")
    assert job.remote is True
    assert workplace(job) == "remote"


def test_ashby_explicit_onsite_overrides_inconsistent_remote_flag():
    job = ashby_job({
        "id": "onsite-1",
        "title": "Software Engineer",
        "workplaceType": "OnSite",
        "isRemote": True,
    }, "acme")
    assert job.remote is False
    assert workplace(job) == "onsite"


def test_ashby_missing_workplace_type_preserves_provider_boolean():
    job = ashby_job({
        "id": "unknown-1",
        "title": "Software Engineer",
        "isRemote": True,
    }, "acme")
    assert job.remote is True
