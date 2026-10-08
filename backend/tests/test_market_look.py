"""
GET /market/look: today's count per role family.

The aggregation is pure and runs everywhere. The last test reads a seeded
LOCAL database and is skipped without one.
"""
import json
import os
from datetime import datetime, timezone
from urllib.parse import parse_qs, urlsplit

import pytest
from fastapi.testclient import TestClient

import main
from src.jobpool import market_look as ml
from src.jobpool import snapshot

TAKEN = datetime(2026, 10, 5, 12, 0, tzinfo=timezone.utc)
SECRET = "This is the full ad text and must never leave the server"
AD_KEYS = {"lvl", "title", "company", "location", "remote", "posted", "url", "years", "req", "pref"}


def row(company, title, family="backend", seniority="junior", thin=False, required=("python", "sql"),
        preferred=(), mentioned=(), provider="greenhouse", url="https://jobs.example.com/1", years=None,
        years_kind="unstated"):
    return {"provider": provider, "company": company, "title": title, "location": "Paris", "remote": None,
            "url": url, "posted_at": datetime(2026, 10, 3, 9, 30, tzinfo=timezone.utc), "description": SECRET,
            "profile": {"family": family, "seniority": seniority, "thin": thin, "years": years,
                        "years_kind": years_kind, "required": list(required), "preferred": list(preferred),
                        "mentioned": list(mentioned)}}


ROWS = [
    row("Shift", "Junior Backend Developer, C# .Net - Paris", required=("c#", ".net"), preferred=("azure",),
        years=2, years_kind="required"),
    row("Shift Ltd", "Junior Backend Developer, C# .Net - Paris", required=("c#", ".net")),   # cross-posted
    row("Acme", "Backend Engineer", seniority="mid", required=("go",), mentioned=("python",)),
    row("Beta", "Senior Backend Engineer", seniority="senior", years=5, years_kind="preferred"),
    row("Gamma", "Staff Backend Engineer", seniority="principal", url=None),
    row("Delta", "Backend Developer", seniority="unknown", thin=True, required=("php", "mysql")),
    row("Eps", "Backend Developer II", provider="url"),                                  # someone's pasted link
    row("Zeta", "Recruiter", family="non_tech"),
    row("Eta", "Something", family="other"),
    row("Theta", "AI data annotator", family="ai_data"),
    row("Iota", "React Developer", family="frontend", seniority="entry", required=("react", "typescript")),
]


def test_shape_and_counting_rules():
    out = ml.aggregate(ROWS, TAKEN)
    assert out["taken_at"] == "2026-10-05T12:00:00Z" and out["profiler_version"] == ml.PROFILER_VERSION
    assert set(out["families"]) == {"backend", "frontend"}
    backend = out["families"]["backend"]
    assert set(backend) == {"jobs", "readable", "seniority", "skills", "titles", "ads"}
    # cross-posted once, pasted link out, thin counted as a job but not toward skills
    assert (backend["jobs"], backend["readable"]) == (5, 4)
    assert backend["seniority"] == {"junior": 1, "mid": 1, "senior": 2, "unstated": 1}
    assert backend["skills"] == {"python": 3, "sql": 2, "c#": 1, ".net": 1, "azure": 1, "go": 1}
    assert out["families"]["frontend"]["seniority"]["junior"] == 1


def test_counts_match_the_stored_snapshot():
    out, stored = ml.aggregate(ROWS, TAKEN), snapshot.summarise(ROWS)
    for name, family in out["families"].items():
        assert (family["jobs"], family["readable"]) == (stored[name]["postings"], stored[name]["readable"])
        assert family["skills"] == {k: sum(v) for k, v in stored[name]["skills"].items()}


def test_buckets_sum_to_jobs():
    for family in ml.aggregate(ROWS, TAKEN)["families"].values():
        assert sum(family["seniority"].values()) == family["jobs"]


def test_titles_and_ads_carry_no_ad_text():
    out = ml.aggregate(ROWS, TAKEN)
    assert SECRET not in json.dumps(out)
    backend = out["families"]["backend"]
    assert ["Junior Backend Developer, C# .Net - Paris", "Shift", "junior"] in backend["titles"]
    assert all(len(t) == 3 and t[2] in ml.LEVELS for t in backend["titles"])
    for ad in backend["ads"]:
        assert set(ad) == AD_KEYS


def test_ads_need_a_url_and_two_required_skills():
    backend = ml.aggregate(ROWS, TAKEN)["families"]["backend"]
    assert {ad["company"] for ad in backend["ads"]} == {"Shift", "Beta"}   # Acme: one skill; Gamma: no url
    shift = next(ad for ad in backend["ads"] if ad["company"] == "Shift")
    assert shift == {"lvl": "junior", "title": "Junior Backend Developer, C# .Net - Paris", "company": "Shift",
                     "location": "Paris", "remote": False, "posted": "2026-10-03",
                     "url": "https://jobs.example.com/1", "years": 2, "req": ["c#", ".net"], "pref": ["azure"]}
    beta = next(ad for ad in backend["ads"] if ad["company"] == "Beta")
    assert beta["lvl"] == "senior" and beta["years"] is None      # "ideally 5 years" is not asked


def test_every_skill_key_has_a_display_name():
    out = ml.aggregate(ROWS, TAKEN)
    keys = {k for f in out["families"].values() for k in f["skills"]}
    keys |= {k for f in out["families"].values() for ad in f["ads"] for k in ad["req"] + ad["pref"]}
    assert set(out["skills"]) == keys
    assert out["skills"]["c#"] == "C#" and out["skills"][".net"] == ".NET"


def test_titles_spread_over_companies_and_stop_at_fourteen_a_level():
    rows = [row("Bigco", f"Junior Dev {i}", url=f"https://x/{i}") for i in range(30)]
    rows += [row(f"Small {i}", f"Junior Engineer {i}", url=f"https://y/{i}") for i in range(5)]
    backend = ml.aggregate(rows, TAKEN)["families"]["backend"]
    companies = [t[1] for t in backend["titles"]]
    assert len(companies) == ml.TITLES_PER_LEVEL
    assert set(f"Small {i}" for i in range(5)) <= set(companies)
    assert len(backend["ads"]) == ml.ADS_PER_LEVEL and len({ad["company"] for ad in backend["ads"]}) == 6


def test_skills_stop_at_the_top_150():
    rows = [row(f"C{i}", f"Backend {i}", required=[f"skill{i}", f"skill{i + 1}"] + ["python"] * (i == 0))
            for i in range(200)]
    skills = ml.aggregate(rows, TAKEN)["families"]["backend"]["skills"]
    assert len(skills) == ml.SKILLS_PER_FAMILY and next(iter(skills)) in ("skill1", "skill2")


@pytest.fixture(autouse=True)
def _nothing_published(monkeypatch):
    """These tests are about the live count, the fallback before the first publication: none is published."""
    monkeypatch.setattr(ml, "published", lambda known=None: None)


def _never_build_here(monkeypatch):
    """Background rebuilds run inline, and are counted, so a test can see when one starts."""
    started = []
    monkeypatch.setattr(ml, "_refresh_in_background", lambda: started.append(1))
    return started


def test_a_warm_cache_is_served_without_building(monkeypatch):
    calls, clock = [], [1000.0]
    monkeypatch.setattr(ml, "compute", lambda: calls.append(1) or {"look": {"n": len(calls)}, "pages": {}})
    started = _never_build_here(monkeypatch)
    ml.forget()
    assert ml.refresh(now=lambda: clock[0]) and len(calls) == 1
    first = ml.look(now=lambda: clock[0])
    for _ in range(50):
        assert ml.look(now=lambda: clock[0]) is first
    assert len(calls) == 1 and not started                     # no request built anything
    clock[0] += ml.CACHE_SECONDS + 1
    assert ml.look(now=lambda: clock[0]) is first               # stale is served at once...
    assert len(calls) == 1 and started == [1]                   # ...while a rebuild starts beside it
    ml.forget()


def test_a_failed_refresh_keeps_the_last_good_count(monkeypatch):
    _never_build_here(monkeypatch)
    monkeypatch.setattr(ml, "compute", lambda: {"look": {"good": True}, "pages": {}})
    ml.forget()
    ml.refresh()

    def broken():
        raise RuntimeError("database down")
    monkeypatch.setattr(ml, "compute", broken)
    assert ml.refresh() is False
    assert ml.look() == {"good": True}
    ml.forget()


def test_one_rebuild_at_a_time(monkeypatch):
    import threading
    gate, calls = threading.Event(), []
    monkeypatch.setattr(ml, "compute", lambda: calls.append(1) or gate.wait(5) or {"look": {"n": 1}, "pages": {}})
    ml.forget()
    first = threading.Thread(target=ml.refresh)
    first.start()
    while not calls:
        pass
    assert ml.refresh() is False                                # a second one returns at once
    gate.set(); first.join()
    assert len(calls) == 1
    ml.forget()


def test_before_the_first_build_the_route_answers_at_once(monkeypatch):
    def slow():
        raise AssertionError("a request must never build the count")
    monkeypatch.setattr(ml, "compute", slow)
    monkeypatch.setattr(ml, "is_configured", lambda: True)
    started = _never_build_here(monkeypatch)
    ml.forget()
    r = TestClient(main.app).get("/market/look")
    assert r.status_code == 503 and int(r.headers["retry-after"]) > 0
    assert started == [1]                                        # it starts the build it is missing


def test_the_route_sends_cache_control_and_gzip(monkeypatch):
    monkeypatch.setattr(ml, "compute", lambda: {"look": ml.aggregate(ROWS, TAKEN), "pages": {}})
    _never_build_here(monkeypatch)
    ml.forget()
    ml.refresh()
    r = TestClient(main.app).get("/market/look", headers={"Accept-Encoding": "gzip"})
    ml.forget()
    assert r.status_code == 200 and r.headers["cache-control"] == "public, max-age=3600"
    assert r.json()["families"]["backend"]["jobs"] == 5
    assert r.headers.get("content-encoding") == "gzip"


def test_the_app_builds_the_count_at_startup(monkeypatch):
    monkeypatch.setattr(ml, "compute", lambda: {"look": ml.aggregate(ROWS, TAKEN), "pages": {}})
    monkeypatch.setattr(main, "WARM_AFTER_SECONDS", 3600)
    ml.forget()
    with TestClient(main.app) as client:                          # runs the lifespan
        for _ in range(100):
            if client.get("/market/look").status_code == 200:
                break
            import time; time.sleep(0.02)
        assert client.get("/market/look").status_code == 200
    ml.forget()


def test_without_a_database_the_route_says_so(monkeypatch):
    monkeypatch.setattr(ml, "is_configured", lambda: False)
    ml.forget()
    r = TestClient(main.app).get("/market/look")
    assert r.status_code == 503 and r.json()["detail"] == "The count isn't available right now."


# ------------------------------------------------------------ local database

URL = os.getenv("DATABASE_URL", "")


def _is_local(url: str) -> bool:
    parts = urlsplit(url)
    host = parts.hostname or parse_qs(parts.query).get("host", [""])[0]
    return host.startswith("/") or host in ("localhost", "127.0.0.1")


@pytest.mark.skipif(not URL or not _is_local(URL), reason="writes jobs: needs DATABASE_URL on a local Postgres")
def test_reads_the_live_pool_from_the_database(monkeypatch):
    """Relative checks: other modules may leave live jobs, so only differences are asserted."""
    import uuid
    from src.Agent.utils.types import Job
    from src.database.services.ingestion import JobIngestionService
    from src.database.session import connection

    provider = f"t{uuid.uuid4().hex[:8]}"
    monkeypatch.setattr(snapshot, "DAILY_SOURCES", frozenset({provider, provider + "b"}))
    now = datetime.now(timezone.utc).isoformat()
    company = f"Look Test {provider}"

    def job(n, title, text, source=provider):
        return Job(provider=source, external_id=str(n), title=title, company=company, description=text,
                   location="Paris", url=f"https://jobs.test/{provider}/{n}", posted_at=now, posted_at_utc=now, raw={})

    jobs = [job(1, "Junior Backend Developer", "Requirements: C#, .NET and SQL. " + "We ship. " * 100),
            job(2, "Junior Backend Developer", "Requirements: C#, .NET and SQL. " + "We ship. " * 100, provider + "b"),
            job(3, "Senior Backend Engineer", "Requirements: 6+ years. Go and Kubernetes. " + "We ship. " * 100)]
    try:
        ml.forget()
        ml.refresh()
        before = ml.look()["families"].get("backend", {"jobs": 0, "seniority": {"junior": 0, "senior": 0}})
        entry_before = ml.page("entry-level-software")["jobs"]
        ingestion = JobIngestionService()
        ids = list(ingestion.persist_jobs(None, jobs, observe=False, profile=False).values())
        ingestion.refresh_profiles(ids)
        ml.refresh()
        after = TestClient(main.app).get("/market/look").json()["families"]["backend"]
        assert after["jobs"] - before["jobs"] == 2                       # the cross-posted role once
        assert after["seniority"]["junior"] - before["seniority"]["junior"] == 1
        assert after["seniority"]["senior"] - before["seniority"]["senior"] == 1
        assert sum(after["seniority"].values()) == after["jobs"]
        # The market page is built from the same read: the junior role once, the senior one not.
        assert TestClient(main.app).get("/market/page/entry-level-software").json()["jobs"] - entry_before == 1
        mine = [ad for ad in after["ads"] if ad["company"] == company]
        assert all(set(ad) == AD_KEYS for ad in after["ads"]) and "We ship" not in json.dumps(after)
        assert not mine or {"c#", ".net"} <= set(mine[0]["req"]) or {"go", "kubernetes"} <= set(mine[0]["req"])
    finally:
        ml.forget()
        with connection() as conn, conn.cursor() as cur:
            cur.execute("delete from jobs where provider in (%s, %s)", (provider, provider + "b"))
