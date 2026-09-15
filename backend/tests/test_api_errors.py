"""How the API fails. No database: services are replaced."""
import time

import jwt
import pytest
from fastapi.testclient import TestClient

import main


@pytest.fixture
def client():
    now = int(time.time())
    token = jwt.encode({"sub": "900000000000000000001", "iat": now, "exp": now + 60},
                       main.current_user.__globals__["SECRET"], algorithm="HS256")
    c = TestClient(main.app, raise_server_exceptions=False)
    c.headers.update({"Authorization": f"Bearer {token}", "Origin": "http://localhost:3000"})
    return c


def test_unexpected_error_is_a_generic_500_with_cors(client, monkeypatch):
    def boom(payload):
        raise RuntimeError("connection to server at ep-secret-host.neon.tech failed")
    monkeypatch.setattr(main.user_service, "fetch_cv", boom)
    response = client.get("/cv")
    assert response.status_code == 500
    assert "neon" not in response.text and "Something went wrong" in response.json()["detail"]
    assert response.headers.get("access-control-allow-origin") == "http://localhost:3000"


def test_expected_errors_keep_their_status_and_message(client, monkeypatch):
    from src.database.services.applications import ApplicationNotFound
    def missing(payload, application_id):
        raise ApplicationNotFound(f"application {application_id}")
    monkeypatch.setattr(main.application_service, "history", missing)
    response = client.get("/dashboard/applications/7/history")
    assert response.status_code == 404 and response.json() == {"detail": "application 7"}
    assert response.headers.get("access-control-allow-origin") == "http://localhost:3000"


def test_missing_token_is_rejected(client):
    del client.headers["Authorization"]
    assert client.get("/dashboard/applications").status_code == 422


def test_routes(client):
    paths = {(sorted(r.methods)[0], r.path) for r in main.app.routes if hasattr(r, "methods")}
    assert ("POST", "/auth/provision") not in paths
    for expected in (("POST", "/analyze"), ("POST", "/cv/parse"), ("GET", "/cv"), ("PUT", "/cv"),
                     ("GET", "/dashboard/applications"), ("POST", "/dashboard/applications/extract"),
                     ("POST", "/dashboard/applications/from-url"), ("DELETE", "/account")):
        assert expected in paths, expected
