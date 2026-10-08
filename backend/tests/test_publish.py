"""
The weekly market publication: each gate, publishing, serving only the latest
publication, and the live count before the first one (decisions/market-publication.md).

The gates and the serving rules run everywhere, with the database calls faked.
The end to end tests write market_publications and source_runs to a LOCAL
database and are skipped without one.
"""
import os
from datetime import datetime, timedelta, timezone
from urllib.parse import parse_qs, urlsplit

import pytest
from fastapi.testclient import TestClient

import main
from src.jobpool import market_look as ml
from src.jobpool import publish

NOW = datetime(2026, 10, 12, 0, 20, tzinfo=timezone.utc)         # a Monday, just after midnight
RUN = {"run_at": NOW - timedelta(minutes=5), "finished": NOW - timedelta(minutes=3), "ok": 270, "sources": 274}


def page(readable, publishable=True):
    return {"jobs": readable, "readable": readable, "publishable": publishable}


def cand(jobs=17_000, collection=RUN, pages=None):
    return {"collection": collection, "as_of": NOW, "jobs": jobs, "look": {}, "pages": pages or {"ai": page(400)}}


PREVIOUS = {"jobs": 16_000, "pages": {"ai": page(380), "devops": page(90, publishable=False)}}


@pytest.fixture
def healthy(monkeypatch):
    """Every database read a gate makes, healthy; a test breaks one."""
    state = {"stale": [], "coverage": {"total": 10_000, "healthy": 9_800}}
    monkeypatch.setattr(publish.profile_repository, "stale", lambda *a: state["stale"])
    monkeypatch.setattr(publish.publication_repository, "coverage", lambda conn, now: state["coverage"])
    return state


def checks(candidate=None, previous=PREVIOUS, accept=False):
    return {g["gate"]: g for g in publish.gates(None, candidate or cand(), previous, NOW, accept)}


def test_a_healthy_week_passes_every_gate(healthy):
    out = checks()
    assert list(out) == list(publish.GATES) and all(g["ok"] for g in out.values())


def test_no_successful_collection_in_the_last_day_fails(healthy):
    out = checks(cand(collection=None))
    assert not out["fresh"]["ok"] and out["fresh"]["detail"] == "no successful collection in the last 24 hours"


def test_jobs_not_yet_read_by_the_current_rules_fail(healthy):
    healthy["stale"] = [{"id": 1}]
    assert not checks()["profiles"]["ok"]


def test_healthy_sources_must_carry_ninety_percent_of_last_weeks_jobs(healthy):
    healthy["coverage"] = {"total": 10_000, "healthy": 8_900}
    out = checks()
    assert not out["coverage"]["ok"] and "89%" in out["coverage"]["detail"]
    healthy["coverage"] = {"total": 0, "healthy": 0}                  # no history yet: nothing to compare
    assert checks()["coverage"]["ok"]


def test_fewer_than_five_thousand_jobs_fail(healthy):
    assert not checks(cand(jobs=4_999))["jobs"]["ok"]
    assert checks(cand(jobs=5_000, pages={"ai": page(400)}), previous=None)["jobs"]["ok"]


def test_every_page_live_last_week_needs_a_hundred_readable_jobs(healthy):
    out = checks(cand(pages={"ai": page(99), "devops": page(50)}))
    # devops wasn't publishable last week, so its count doesn't hold the week back.
    assert not out["pages"]["ok"] and out["pages"]["detail"] == "readable jobs under 100: ai 99"


def test_a_swing_beyond_the_band_waits_for_the_founder(healthy):
    assert not checks(cand(jobs=11_900))["swing"]["ok"]               # -26%
    assert checks(cand(jobs=12_000))["swing"]["ok"]                   # -25%
    assert checks(cand(jobs=25_600))["swing"]["ok"]                   # +60%
    out = checks(cand(jobs=25_700))
    assert not out["swing"]["ok"] and "+61%" in out["swing"]["detail"]
    accepted = checks(cand(jobs=25_700), accept=True)["swing"]
    assert accepted["ok"] and accepted["detail"].endswith("accepted by the founder")


def test_the_first_publication_has_nothing_to_compare_with(healthy):
    out = checks(previous=None)
    assert out["pages"]["ok"] and out["swing"]["ok"]


def test_weeks_start_on_monday_utc():
    assert ml.week_of(datetime(2026, 10, 11, 23, 59, tzinfo=timezone.utc)).isoformat() == "2026-10-05"
    assert ml.week_of(NOW).isoformat() == "2026-10-12"
    assert publish.parse_week("2026-W42").isoformat() == "2026-10-12"
    assert publish.parse_week("2026-10-14").isoformat() == "2026-10-12"


def test_only_this_weeks_swing_can_be_accepted(monkeypatch):
    monkeypatch.setattr(publish, "is_configured", lambda: True)
    with pytest.raises(ValueError):
        publish.run(now=NOW, accept=publish.parse_week("2026-10-05"))


# ------------------------------------------------------------ serving

def _published(monkeypatch, store):
    """market_look.published() over a fake table: `store` holds (id, bodies) or None."""
    def published(known=None):
        if store["row"] is None:
            return None
        row_id, bodies = store["row"]
        return (known, {}) if known == row_id else (row_id, bodies)
    monkeypatch.setattr(ml, "published", published)


def _never_count(monkeypatch):
    def compute():
        raise AssertionError("counted the pool on a request or a refresh")
    monkeypatch.setattr(ml, "compute", compute)


def test_once_published_the_api_serves_the_publication_and_never_counts(monkeypatch):
    store = {"row": (7, {"look": {"families": {"ai": {"jobs": 400}}, "week": "2026-10-12"},
                         "pages": {"ai": {"jobs": 400, "week": "2026-10-12"}}})}
    _published(monkeypatch, store)
    _never_count(monkeypatch)
    ml.forget()
    assert ml.refresh()
    client = TestClient(main.app)
    assert client.get("/market/look").json()["week"] == "2026-10-12"
    assert client.get("/market/page/ai").json()["jobs"] == 400
    store["row"] = (8, {"look": {"families": {"ai": {"jobs": 410}}}, "pages": {}})   # next week's
    assert ml.refresh() and client.get("/market/look").json()["families"]["ai"]["jobs"] == 410
    ml.forget()


def test_a_newer_check_with_nothing_new_keeps_the_body(monkeypatch):
    store = {"row": (7, {"look": {"n": 1}, "pages": {}})}
    _published(monkeypatch, store)
    _never_count(monkeypatch)
    ml.forget()
    ml.refresh()
    first = ml.look()
    assert ml.refresh() and ml.look() is first
    ml.forget()


def test_a_publication_that_cant_be_read_keeps_the_last_one(monkeypatch):
    store = {"row": (7, {"look": {"n": 1}, "pages": {}})}
    _published(monkeypatch, store)
    _never_count(monkeypatch)
    ml.forget()
    ml.refresh()

    def down(known=None):
        raise RuntimeError("database down")
    monkeypatch.setattr(ml, "published", down)
    assert ml.refresh() is False and ml.look() == {"n": 1}
    store["row"] = None
    _published(monkeypatch, store)                                    # and a vanished one
    assert ml.refresh() is False and ml.look() == {"n": 1}
    ml.forget()


def test_before_the_first_publication_it_counts_the_live_pool(monkeypatch):
    # So a deploy before the first publication can't empty /market.
    _published(monkeypatch, {"row": None})
    monkeypatch.setattr(ml, "compute", lambda: {"look": {"live": True}, "pages": {}})
    ml.forget()
    assert ml.refresh() and ml.look() == {"live": True}
    ml.forget()


def test_bodies_carry_when_the_jobs_were_collected():
    from test_market_look import ROWS
    as_of = datetime(2026, 10, 13, 6, 17, tzinfo=timezone.utc)
    out = ml.bodies(ROWS, as_of)
    assert (out["look"]["taken_at"], out["look"]["week"]) == ("2026-10-13T06:17:00Z", "2026-10-12")
    assert {body["week"] for body in out["pages"].values()} == {"2026-10-12"}
    assert {body["taken_at"] for body in out["pages"].values()} == {"2026-10-13T06:17:00Z"}


# ------------------------------------------------------------ local database

URL = os.getenv("DATABASE_URL", "")


def _is_local(url: str) -> bool:
    parts = urlsplit(url)
    host = parts.hostname or parse_qs(parts.query).get("host", [""])[0]
    return host.startswith("/") or host in ("localhost", "127.0.0.1")


local = pytest.mark.skipif(not URL or not _is_local(URL), reason="writes publications: needs DATABASE_URL on a local Postgres")


@pytest.fixture
def clean_publications():
    """A local test database only: every publication and test source run removed before and after."""
    from src.database.session import connection

    def wipe():
        with connection() as conn, conn.cursor() as cur:
            cur.execute("delete from market_publications")
            cur.execute("delete from source_runs where source like 'publish-test:%'")
    wipe()
    yield
    wipe()
    ml.forget()


def _collected(now, ok=True):
    from src.database.repositories import source_repository
    from src.database.session import connection
    with connection() as conn:
        for i in range(4):
            source_repository.record(conn, now - timedelta(minutes=10), f"publish-test:{i}", ok=ok, jobs=10)


@local
def test_publish_when_due_then_serve_it_and_never_count(clean_publications, monkeypatch):
    from src.database.services.ingestion import JobIngestionService
    now = datetime.now(timezone.utc)
    JobIngestionService().refresh_profiles()                          # the profiles gate reads the whole table
    monkeypatch.setattr(publish, "MIN_JOBS", 0)                       # the test pool is small
    _collected(now)
    first = publish.run(now=now)
    assert first["status"] == "published", publish.held_back(first)
    assert publish.run(now=now) is None                               # this week's is done: not due
    _never_count(monkeypatch)
    ml.forget()
    assert ml.refresh()
    body = TestClient(main.app).get("/market/look").json()
    assert body["week"] == ml.week_of(now).isoformat()
    assert TestClient(main.app).get("/market/page/entry-level-software").json()["week"] == body["week"]


@local
def test_a_rejected_week_is_stored_with_its_reasons_and_last_weeks_stays(clean_publications, monkeypatch):
    from src.database.repositories import publication_repository
    from src.database.services.ingestion import JobIngestionService
    from src.database.session import connection
    now = datetime.now(timezone.utc)
    JobIngestionService().refresh_profiles()
    monkeypatch.setattr(publish, "MIN_JOBS", 0)
    _collected(now)
    good = publish.run(now=now)
    monkeypatch.setattr(publish, "MIN_JOBS", 10 ** 9)
    held = publish.run(now=now, force=True)
    assert held["status"] == "rejected" and "jobs:" in publish.held_back(held)
    with connection() as conn:
        assert publication_repository.latest(conn)["id"] == good["id"]
        rejected = next(r for r in publication_repository.recent(conn) if r["id"] == held["id"])
    assert rejected["published_at"] is None and not next(g for g in rejected["gates"] if g["gate"] == "jobs")["ok"]


@local
def test_a_week_without_a_fresh_collection_is_held_back(clean_publications, monkeypatch):
    monkeypatch.setattr(publish, "MIN_JOBS", 0)
    now = datetime.now(timezone.utc)
    _collected(now - timedelta(hours=30))
    held = publish.run(now=now)
    assert held["status"] == "rejected" and held["gates"][0] == {
        "gate": "fresh", "ok": False, "detail": "no successful collection in the last 24 hours"}


@local
def test_the_status_command_lists_publications(clean_publications, monkeypatch, capsys):
    monkeypatch.setattr(publish, "MIN_JOBS", 10 ** 9)
    _collected(datetime.now(timezone.utc))
    assert publish.main([]) == 1                                      # held back: the command says so, red
    publish.main(["--status"])
    out = capsys.readouterr().out
    assert "FAIL jobs:" in out and "rejected" in out
