"""The cap on POST /market/ad: 20 an hour per client, keyed on the address we can trust."""
import pytest
from fastapi.testclient import TestClient

import main
from src.api import rate_limit
from src.api.rate_limit import RateLimit, client_key


class Clock:
    def __init__(self): self.now = 1000.0
    def __call__(self): return self.now


def test_the_21st_call_in_an_hour_waits():
    clock = Clock()
    limit = RateLimit(20, 3600, clock)
    assert all(limit.allow("a") == 0 for _ in range(20))
    wait = limit.allow("a")
    assert 0 < wait <= 3600
    assert limit.allow("b") == 0  # each client has its own count


def test_the_window_slides():
    clock = Clock()
    limit = RateLimit(2, 3600, clock)
    limit.allow("a"); clock.now += 1800; limit.allow("a")
    assert limit.allow("a") > 0
    clock.now += 1801  # the first call has left the window
    assert limit.allow("a") == 0
    assert limit.allow("a") > 0


def test_refused_calls_do_not_extend_the_wait():
    clock = Clock()
    limit = RateLimit(1, 100, clock)
    limit.allow("a")
    for _ in range(50):
        limit.allow("a")
    clock.now += 100
    assert limit.allow("a") == 0


def test_memory_is_bounded(monkeypatch):
    monkeypatch.setattr(rate_limit, "MAX_CLIENTS", 3)
    limit = RateLimit(5, 100, Clock())
    for key in "abcdef":
        limit.allow(key)
    assert len(limit._hits) <= 3


@pytest.mark.parametrize("peer, xff, key", [
    ("100.100.0.4", "203.0.113.9", "203.0.113.9"),            # from the ingress: the hop it appended
    ("10.0.0.7", "6.6.6.6, 203.0.113.9", "203.0.113.9"),      # a spoofed first entry is ignored
    ("8.8.4.4", "203.0.113.9", "8.8.4.4"),          # a public peer is the client; its header is not trusted
    ("10.0.0.7", "not an address", "10.0.0.7"),
    ("10.0.0.7", None, "10.0.0.7"),
    (None, None, "unknown"),
])
def test_client_key_trusts_only_the_ingress(peer, xff, key):
    assert client_key(peer, xff) == key


def test_the_route_answers_429_with_the_friendly_line(monkeypatch):
    monkeypatch.setattr(rate_limit.ads, "limit", 2)
    rate_limit.ads.reset()
    client = TestClient(main.app)
    body = {"text": "Backend Engineer\nRequirements: Python and SQL."}
    assert [client.post("/market/ad", json=body).status_code for _ in range(2)] == [200, 200]
    r = client.post("/market/ad", json=body)
    assert r.status_code == 429
    assert r.json()["detail"] == "That's a lot of ads for one hour. Try again soon."
    assert int(r.headers["Retry-After"]) > 0
    rate_limit.ads.reset()
