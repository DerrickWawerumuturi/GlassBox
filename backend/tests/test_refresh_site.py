"""
After a publication the site is refreshed at once, not on its next visit
(refresh_site.py, GitHub issue #1). Offline: the HTTP layer and the database are faked.

On 12 Oct 2026 the week was published at 06:02 UTC and seeglassbox.com served the
5 October week for 11 more hours: its pages only rebuild on a visit, and a visit's
rebuild timed out on the sleeping API.
"""
from contextlib import nullcontext
from datetime import datetime, timezone

import httpx
import pytest

from src.jobpool import publish, refresh_site

NOW = datetime(2026, 10, 12, 6, 2, tzinfo=timezone.utc)
ENV = {"REVALIDATE_SECRET": "test-secret", "SITE_URL": "https://site.test/", "API_BASE_URL": "https://api.test"}


class FakeHttp:
    """httpx.Client's get and post, answering from `codes` ({url: status or exception, or a list of them})."""

    def __init__(self, codes=None):
        self.codes, self.calls = codes or {}, []

    def __enter__(self):
        return self

    def __exit__(self, *exc):
        return False

    def _answer(self, method, url, headers=None):
        self.calls.append((method, url, headers))
        code = self.codes.get(url, 200)
        if isinstance(code, list):
            code = code.pop(0) if len(code) > 1 else code[0]
        if isinstance(code, Exception):
            raise code
        return httpx.Response(code)

    def get(self, url):
        return self._answer("GET", url)

    def post(self, url, headers=None):
        return self._answer("POST", url, headers)


class Clock:
    def __init__(self):
        self.now = 0.0

    def __call__(self):
        return self.now

    def sleep(self, seconds):
        self.now += seconds


REFRESH = refresh_site.refresh      # the real one, kept from the hook tests' fake


def refresh(http, env=ENV):
    clock = Clock()
    return REFRESH(env, http, clock.sleep, clock)


def test_without_the_secret_it_says_so_and_calls_nothing(capsys):
    http = FakeHttp()
    assert refresh(http, {"SITE_URL": "https://site.test"}) is False
    assert http.calls == []
    assert "REVALIDATE_SECRET is not set" in capsys.readouterr().out


def test_it_wakes_the_api_then_revalidates_then_opens_every_page(capsys):
    http = FakeHttp({"https://api.test/market/look": [httpx.ReadTimeout("cold"), 503, 200]})
    assert refresh(http) is True
    urls = [(method, url) for method, url, _ in http.calls]
    assert urls[:3] == [("GET", "https://api.test/market/look")] * 3        # woken: timeout, 503, then up
    assert urls[3] == ("POST", "https://site.test/api/revalidate")
    assert http.calls[3][2] == {"Authorization": "Bearer test-secret"}
    assert urls[4:] == [("GET", f"https://site.test{path}") for path in refresh_site.pages()]
    assert {"/", "/market", "/market/devops", "/market/devops/opengraph-image"} <= set(refresh_site.pages())
    assert "site refreshed" in capsys.readouterr().out


def test_an_api_that_never_wakes_leaves_the_site_alone(capsys):
    http = FakeHttp({"https://api.test/market/look": 503})
    assert refresh(http) is False
    assert {method for method, _, _ in http.calls} == {"GET"}                 # never revalidated
    assert len(http.calls) == refresh_site.WAKE_SECONDS // refresh_site.RETRY_SECONDS
    assert "::warning title=Site not refreshed::" in capsys.readouterr().out


@pytest.mark.parametrize("codes", [
    {"https://site.test/api/revalidate": 401},
    {"https://site.test/api/revalidate": httpx.ConnectError("no route")},
    {"https://site.test/market/ai": 500},
])
def test_a_failure_is_one_warning_and_never_raises(codes, capsys):
    assert refresh(FakeHttp(codes)) is False
    out = capsys.readouterr().out
    assert out.count("::warning title=Site not refreshed::") == 1 and "test-secret" not in out


# ------------------------------------------------------------ the hook in publish.run

@pytest.fixture
def fake_db(monkeypatch):
    """publish.run over a faked database; returns the list of refresh calls."""
    monkeypatch.setattr(publish, "is_configured", lambda: True)
    monkeypatch.setattr(publish, "connection", lambda: nullcontext(None))
    monkeypatch.setattr(publish.publication_repository, "published_for", lambda conn, week: False)
    monkeypatch.setattr(publish.publication_repository, "latest", lambda conn: None)
    monkeypatch.setattr(publish.publication_repository, "insert", lambda *a: 42)
    monkeypatch.setattr(publish, "candidate", lambda conn, now: {"as_of": NOW, "jobs": 17_000, "look": {}, "pages": {}})
    calls = []
    monkeypatch.setattr(refresh_site, "refresh", lambda: calls.append("refresh") or True)
    return calls


def test_a_publication_refreshes_the_site(fake_db, monkeypatch):
    monkeypatch.setattr(publish, "gates", lambda *a, **k: [{"gate": "jobs", "ok": True, "detail": ""}])
    assert publish.run(now=NOW)["status"] == "published"
    assert fake_db == ["refresh"]


def test_a_failed_refresh_leaves_the_publication_as_it_is(fake_db, monkeypatch):
    monkeypatch.setattr(publish, "gates", lambda *a, **k: [{"gate": "jobs", "ok": True, "detail": ""}])
    monkeypatch.setattr(refresh_site, "refresh", lambda: refresh(FakeHttp({"https://api.test/market/look": 503})))
    assert publish.run(now=NOW) == {"id": 42, "status": "published", "week": NOW.date(), "jobs": 17_000,
                                    "gates": [{"gate": "jobs", "ok": True, "detail": ""}]}


def test_a_held_back_week_leaves_the_site_alone(fake_db, monkeypatch):
    monkeypatch.setattr(publish, "gates", lambda *a, **k: [{"gate": "jobs", "ok": False, "detail": "few"}])
    assert publish.run(now=NOW)["status"] == "rejected"
    assert fake_db == []
