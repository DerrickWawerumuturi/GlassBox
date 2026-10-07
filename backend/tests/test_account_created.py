"""
The API says, once, when a request created the user's account: the frontend
sends analytics' signed_up on it. No database: the repository is replaced.
The real upsert's "created" is checked in test_api_user_data.py.
"""
import time
from contextlib import nullcontext

import jwt
import pytest
from fastapi.testclient import TestClient

import main
from src.database.repositories import user_repository
from src.database.services import users

CV = {"name": "Test", "title": None, "location": "Nairobi", "phone_number": None, "email": None,
      "portfolio": None, "linkedIn": None, "professional_summary": None, "skills": ["Python"],
      "experience": [], "experience_level": None, "education": []}


@pytest.fixture
def client(monkeypatch):
    now = int(time.time())
    token = jwt.encode({"sub": "900000000000000000002", "iat": now, "exp": now + 60},
                       main.current_user.__globals__["SECRET"], algorithm="HS256")
    known = set()

    def upsert(conn, sub, *_):
        created = sub not in known
        known.add(sub)
        return 7, created
    monkeypatch.setattr(users, "connection", lambda: nullcontext(None))
    monkeypatch.setattr(user_repository, "upsert_user", upsert)
    monkeypatch.setattr(user_repository, "save_cv", lambda conn, user_id, data: None)
    c = TestClient(main.app, raise_server_exceptions=False)
    c.headers.update({"Authorization": f"Bearer {token}", "Origin": "http://localhost:3000"})
    return c


def test_only_the_request_that_created_the_account_says_so(client):
    first = client.put("/cv", json=CV)
    assert first.status_code == 200 and first.headers.get("x-account-created") == "1"
    # The browser can read it only if CORS exposes it.
    assert "x-account-created" in first.headers.get("access-control-expose-headers", "").lower()
    again = client.put("/cv", json=CV)
    assert again.status_code == 200 and "x-account-created" not in again.headers


def test_a_failed_request_says_nothing(client, monkeypatch):
    def broken(conn, user_id, data):
        raise RuntimeError("write failed, the transaction rolls back")
    monkeypatch.setattr(user_repository, "save_cv", broken)
    response = client.put("/cv", json=CV)
    assert response.status_code == 500 and "x-account-created" not in response.headers
