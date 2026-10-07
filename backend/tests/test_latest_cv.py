"""
The kept profile of a signed-in user's latest CV: a rescan reuses it without an
LLM call, the same CV is never parsed twice, and anonymous scans keep nothing.

No database: the repository is an in-memory dict, so the service's own rules
(hash, parser version, what is kept) run for real. The Groq client is a fake
that counts calls; the search-and-rank step is replaced. The database-backed
round trip is in test_api_user_data.py.
"""
import json
import time
from contextlib import nullcontext
from types import SimpleNamespace

import jwt
import pytest
from fastapi.testclient import TestClient

import main
from src.Agent.utils import llm_client
from src.database.repositories import user_repository
from src.database.services import users

SUB = "900000000000000000042"
PARSED = {"primary_role": "Backend Engineer", "skills": ["Python", "PostgreSQL"],
          "notes": "Jane Doe, jane@example.com",
          "experience": [{"role": "Backend Engineer", "company": "Acme Corp", "start_date": "Jan 2021", "end_date": "Present"}],
          "education": "BSc Computer Science, University of Nairobi"}


class FakeGroq:
    """Stands in for groq.Groq: every completion is recorded and returns PARSED."""
    def __init__(self):
        self.calls = 0
        self.chat = SimpleNamespace(completions=SimpleNamespace(create=self.create))

    def create(self, **_):
        self.calls += 1
        return SimpleNamespace(choices=[SimpleNamespace(message=SimpleNamespace(content=json.dumps(PARSED)))])


def token(sub=SUB):
    now = int(time.time())
    return jwt.encode({"sub": sub, "iat": now, "exp": now + 60}, main.current_user.__globals__["SECRET"],
                      algorithm="HS256")


@pytest.fixture
def world(monkeypatch):
    groq, rows, matched = FakeGroq(), {}, []
    interpreter = llm_client.GroqModel("user")
    interpreter.client = groq

    def match(query, preferences):
        matched.append(query)
        return {"market": {"skill_coverage": {}}, "ranked_jobs": [], "search": {}}

    monkeypatch.setattr(main, "_agent", lambda: SimpleNamespace(parse=interpreter.parse, match=match))

    async def text(data):
        return data.decode().removeprefix(PDF)
    monkeypatch.setattr(main, "_pdf_text", text)

    monkeypatch.setattr(users, "connection", lambda: nullcontext(None))
    monkeypatch.setattr(user_repository, "upsert_user", lambda conn, sub, *_: (sub, False))
    monkeypatch.setattr(user_repository, "get_user_id", lambda conn, sub: sub)
    monkeypatch.setattr(user_repository, "get_location_preferences", lambda conn, user_id: None)

    def save(conn, user_id, profile, file_name, sha, version):
        rows[user_id] = {"profile": profile, "file_name": file_name, "text_sha256": sha,
                         "parser_version": version, "parsed_at": "2026-10-05T12:00:00Z"}
    monkeypatch.setattr(user_repository, "save_latest_cv", save)
    monkeypatch.setattr(user_repository, "get_latest_cv", lambda conn, user_id: rows.get(user_id))
    monkeypatch.setattr(user_repository, "delete_latest_cv", lambda conn, user_id: rows.pop(user_id, None) is not None)

    client = TestClient(main.app)
    client.headers["Authorization"] = f"Bearer {token()}"
    return SimpleNamespace(client=client, groq=groq, rows=rows, matched=matched)


PDF = "%PDF-1.4\n"   # the server reads only what starts as a PDF (src/cv/upload.py)


def upload(client, text, name="cv.pdf", **kwargs):
    return client.post("/analyze", files={"file": (name, (PDF + text).encode(), "application/pdf")}, **kwargs)


def test_a_fresh_upload_is_parsed_once_and_kept_without_the_text(world):
    assert upload(world.client, "CV text one").status_code == 200
    assert world.groq.calls == 1
    kept = world.rows[SUB]
    assert kept["file_name"] == "cv.pdf" and kept["parser_version"] == llm_client.PARSER_VERSION
    assert kept["profile"]["skills"] == ["Python", "PostgreSQL"]
    # Never the text, and not the parser's free-text notes either.
    assert "notes" not in kept["profile"] and "CV text one" not in json.dumps(kept)
    assert kept["text_sha256"] == users.text_sha256("CV text one")


def test_the_same_cv_again_skips_parsing(world):
    upload(world.client, "CV text one")
    assert upload(world.client, "CV text one", name="renamed.pdf").status_code == 200
    assert world.groq.calls == 1
    assert world.matched[1].skills == ["Python", "PostgreSQL"]


def test_a_new_cv_is_parsed_and_replaces_the_kept_one(world):
    upload(world.client, "CV text one")
    upload(world.client, "CV text two", name="new.pdf")
    assert world.groq.calls == 2
    assert list(world.rows) == [SUB]
    assert world.rows[SUB]["file_name"] == "new.pdf"
    assert world.rows[SUB]["text_sha256"] == users.text_sha256("CV text two")


def test_reuse_matches_the_kept_profile_with_no_llm_call(world):
    assert world.client.post("/analyze/reuse").status_code == 404
    upload(world.client, "CV text one")
    calls = world.groq.calls
    response = world.client.post("/analyze/reuse")
    assert response.status_code == 200
    assert set(response.json()) == {"market", "ranked_jobs", "search"}
    assert world.groq.calls == calls
    assert world.matched[-1].primary_role == "Backend Engineer"


def test_a_profile_from_an_older_parser_is_refused_and_reparsed(world):
    upload(world.client, "CV text one")
    world.rows[SUB]["parser_version"] = "query-v0"
    assert world.client.post("/analyze/reuse").status_code == 409
    assert world.client.get("/cv/latest").json()["reusable"] is False
    upload(world.client, "CV text one")
    assert world.groq.calls == 2 and world.rows[SUB]["parser_version"] == llm_client.PARSER_VERSION


def test_latest_cv_shows_and_deletes(world):
    assert world.client.get("/cv/latest").status_code == 404
    upload(world.client, "CV text one")
    latest = world.client.get("/cv/latest").json()
    assert latest == {"file_name": "cv.pdf", "parsed_at": "2026-10-05T12:00:00Z",
                      "skills": ["Python", "PostgreSQL"], "reusable": True}
    assert world.client.delete("/cv/latest").json() == {"deleted": True}
    assert world.client.get("/cv/latest").status_code == 404
    assert world.client.delete("/cv/latest").json() == {"deleted": False}


def test_anonymous_scans_keep_nothing(world):
    anonymous = TestClient(main.app)
    assert upload(anonymous, "CV text one").status_code == 200
    assert upload(anonymous, "CV text one").status_code == 200
    assert world.rows == {} and world.groq.calls == 2
    assert anonymous.post("/analyze/reuse").status_code == 422     # no token: not offered at all


def test_storage_failing_never_costs_the_scan(world, monkeypatch):
    def down(*_):
        raise RuntimeError("database unreachable")
    monkeypatch.setattr(user_repository, "get_latest_cv", down)
    monkeypatch.setattr(user_repository, "save_latest_cv", down)
    assert upload(world.client, "CV text one").status_code == 200
    assert world.groq.calls == 1


def test_the_kept_profile_has_no_companies_dates_education_or_notes(world):
    upload(world.client, "CV text with details")
    profile = world.rows[SUB]["profile"]
    assert {"experience", "education", "notes"}.isdisjoint(profile)
    assert not [t for t in ("Jane", "jane@", "Acme", "Jan 2021", "Nairobi") if t in json.dumps(profile)]
    assert profile["derived"]["years"]["software"] > 4          # worked out from the dates before they went
    assert profile["education_level"] == "bachelors"
    response = world.client.post("/analyze/reuse")               # and a rescan still runs from it
    assert response.status_code == 200 and world.matched[-1].derived == profile["derived"]
