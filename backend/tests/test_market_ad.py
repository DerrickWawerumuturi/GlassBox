"""POST /market/ad: a pasted ad's asks. Offline: links are served by a fake fetch."""
import time

import pytest
from fastapi.testclient import TestClient

import main
from src.database import session
from src.api import rate_limit
from src.jobpool import ad_reader, safe_fetch

AD = """Junior Backend Developer

We build payments software in Paris.

Requirements:
- C# and .NET
- SQL and REST APIs

Nice to have:
- Azure
- Docker
"""


@pytest.fixture
def client(monkeypatch):
    # Reading an ad never touches the database: any attempt fails the test.
    def no_database(*a, **k):
        raise AssertionError("POST /market/ad must not use the database")
    monkeypatch.setattr(session, "connection", no_database)
    monkeypatch.setattr(session, "get_pool", no_database)
    rate_limit.ads.reset()
    return TestClient(main.app)


def asks(body):
    return {a["key"]: a["kind"] for a in body["asks"]}


def test_text_returns_required_and_optional_asks(client):
    r = client.post("/market/ad", json={"text": AD})
    assert r.status_code == 200
    body = r.json()
    assert set(body) == {"title", "family", "level", "asks"}
    assert (body["title"], body["family"], body["level"]) == ("Junior Backend Developer", "backend", "junior")
    kinds = asks(body)
    assert kinds["c#"] == kinds[".net"] == kinds["sql"] == "req"
    assert kinds["azure"] == kinds["docker"] == "opt"
    assert {"key": "c#", "name": "C#", "kind": "req"} in body["asks"]


def test_levels_are_the_landing_page_buckets(client):
    levels = {title: client.post("/market/ad", json={"text": f"{title}\nRequirements: Python, SQL"}).json()["level"]
              for title in ("Software Engineering Intern", "Graduate Data Analyst", "Lead Platform Engineer",
                            "Data Engineer")}
    assert levels == {"Software Engineering Intern": "junior", "Graduate Data Analyst": "junior",
                      "Lead Platform Engineer": "senior", "Data Engineer": "unstated"}


def test_an_ad_opening_with_prose_has_no_title(client):
    prose = "We are a fast growing company " * 10 + "\nRequirements: Python and SQL."
    assert client.post("/market/ad", json={"text": prose}).json()["title"] == ""


def test_too_long_text_is_refused_without_echoing_it(client):
    text = "Python " * (ad_reader.MAX_CHARS // 7 + 10)
    r = client.post("/market/ad", json={"text": text})
    assert r.status_code == 413
    assert "Python" not in r.text


@pytest.mark.parametrize("text", ["Python " * 7000, "5+ years experience, " * 2300], ids=["words", "commas"])
def test_an_ad_with_no_sentences_is_still_read_quickly(client, text):
    # Unbounded, each of these took 30-40 s of CPU in the profiler.
    start = time.perf_counter()
    assert client.post("/market/ad", json={"text": text[:ad_reader.MAX_CHARS]}).status_code == 200
    assert time.perf_counter() - start < 6


def test_exactly_one_of_text_and_url(client):
    assert client.post("/market/ad", json={}).status_code == 422
    assert client.post("/market/ad", json={"text": AD, "url": "https://jobs.example.com/"}).status_code == 422
    assert client.post("/market/ad", json={"text": "   "}).status_code == 422


def test_the_ad_is_not_logged(client, capsys):
    secret = "Zanzibar Quokka Holdings"
    client.post("/market/ad", json={"text": f"Backend Developer\n{secret}\nRequirements: Go, Postgres"})
    out = capsys.readouterr()
    assert secret not in out.out + out.err


def test_a_link_is_read_with_the_page_title(client, monkeypatch):
    html = "<html><head><title>Data Engineer &amp; Analyst</title></head><body><h2>Requirements</h2>" \
           "<ul><li>Python</li><li>Airflow</li></ul><h2>Nice to have</h2><p>dbt</p></body></html>"
    monkeypatch.setattr(ad_reader, "fetch_page", lambda url: (url, html))
    body = client.post("/market/ad", json={"url": "https://jobs.example.com/1"}).json()
    assert body["title"] == "Data Engineer & Analyst" and body["family"] == "data_engineering"
    assert asks(body) == {"python": "req", "airflow": "req", "dbt": "opt"}


def test_a_hostile_page_is_read_quickly(client, monkeypatch):
    # A page is whatever a stranger's server sends, up to the 2 MB cap.
    page = "<title>" * 50_000 + "<a x " * 300_000
    monkeypatch.setattr(ad_reader, "fetch_page", lambda url: (url, page[:safe_fetch.MAX_BYTES]))
    start = time.perf_counter()
    assert client.post("/market/ad", json={"url": "https://jobs.example.com/1"}).status_code in (200, 422)
    assert time.perf_counter() - start < 10


def test_a_blocked_link_is_400_and_an_unreadable_one_422(client, monkeypatch):
    r = client.post("/market/ad", json={"url": "http://127.0.0.1/admin"})
    assert r.status_code == 400 and r.json()["detail"] == safe_fetch.BLOCKED

    def unreadable(url):
        raise safe_fetch.UnreadableLink(safe_fetch.CANT_READ)
    monkeypatch.setattr(ad_reader, "fetch_page", unreadable)
    r = client.post("/market/ad", json={"url": "https://jobs.example.com/1"})
    assert r.status_code == 422 and r.json()["detail"] == "That link can't be read."
