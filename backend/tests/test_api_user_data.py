"""
Applications, CV, analysis and preference endpoints end to end: HTTP, auth,
services and SQL together, as a throwaway user. Needs a database and the API
secret, so it is skipped where they are absent (CI).
"""
import os
import time
import uuid

import pytest
from dotenv import load_dotenv

load_dotenv(os.path.join(os.path.dirname(__file__), "..", ".env"))
if not os.getenv("DATABASE_URL"):
    pytest.skip("needs DATABASE_URL and API_JWT_SECRET", allow_module_level=True)

import jwt  # noqa: E402
from fastapi.testclient import TestClient  # noqa: E402

import main  # noqa: E402
from src.database.session import connection  # noqa: E402

CV = {"name": "Test", "title": None, "location": "Nairobi", "phone_number": None, "email": None,
      "portfolio": None, "linkedIn": None, "professional_summary": None, "skills": ["Python"],
      "experience": [], "experience_level": None, "education": []}

SUB = f"9{int(time.time() * 1000)}{uuid.uuid4().int % 1000:03d}"


def token(sub=SUB):
    now = int(time.time())
    return jwt.encode({"sub": sub, "name": "API test", "iat": now, "exp": now + 900},
                      os.environ["API_JWT_SECRET"], algorithm="HS256")


@pytest.fixture(scope="module")
def client():
    with TestClient(main.app) as c:
        c.headers["Authorization"] = f"Bearer {token()}"
        yield c
    with connection() as conn, conn.cursor() as cur:
        cur.execute("delete from users where sub = %s", (SUB,))


@pytest.fixture(scope="module")
def job_ids():
    with connection() as conn, conn.cursor() as cur:
        cur.execute("select id from jobs where archived_at is null order by id desc limit 3")
        ids = [r["id"] for r in cur.fetchall()]
    if len(ids) == 3:
        yield ids
        return
    # An empty database (a fresh local one): bring three postings of our own.
    from src.Agent.utils.types import Job
    from src.database.services.ingestion import JobIngestionService
    seeded = JobIngestionService().persist_jobs(None, [
        Job(provider="test-seed", external_id=f"{SUB}-{i}", title=f"Seed role {i}", description="Python.", raw={})
        for i in range(3)], observe=False)
    yield sorted(seeded.values())
    with connection() as conn, conn.cursor() as cur:
        cur.execute("delete from users where sub = %s", (SUB,))
        cur.execute("delete from jobs where provider = 'test-seed'")


def test_stale_non_numeric_session_is_refused_everywhere():
    stale = TestClient(main.app)
    stale.headers["Authorization"] = f"Bearer {token(str(uuid.uuid4()))}"
    for method, path, body in (("get", "/dashboard/applications", None), ("put", "/cv", CV),
                               ("get", "/analysis", None), ("get", "/profile/location-preferences", None)):
        response = getattr(stale, method)(path, **({"json": body} if body is not None else {}))
        assert response.status_code == 401, (path, response.status_code, response.text)


def test_cv_and_analysis_round_trip(client):
    assert client.get("/cv").status_code == 404
    assert client.put("/cv", json=CV).status_code == 200
    assert client.get("/cv").json()["skills"] == ["Python"]
    analysis = {"market": {"skill_coverage": {}}, "ranked_jobs": []}
    assert client.put("/analysis", json={"analysis": analysis, "file_name": "cv.pdf"}).status_code == 200
    assert client.get("/analysis").json()["file_name"] == "cv.pdf"


def test_location_preferences(client):
    first = client.get("/profile/location-preferences").json()
    assert first["saved"] is False and first["source"] == "default"
    saved = client.put("/profile/location-preferences", json={"country_code": "ng", "city": "Lagos"})
    assert saved.status_code == 200 and saved.json()["country_code"] == "ng"
    assert client.get("/profile/location-preferences").json()["saved"] is True
    assert client.put("/profile/location-preferences", json={"country_code": "zz"}).status_code == 422
    assert client.delete("/profile/location-preferences").json() == {"saved": False}


def test_application_lifecycle(client, job_ids):
    manual = client.post("/dashboard/applications/manual", json={"title": "Typed", "company": "Co", "status": "applied"})
    assert manual.status_code == 200
    manual_id = manual.json()["application_id"]
    events = client.get(f"/dashboard/applications/{manual_id}/history").json()
    assert sorted((e["from_status"] or "", e["to_status"]) for e in events) == [("", "saved"), ("saved", "applied")]

    from_url = client.post("/dashboard/applications/from-url", json={
        "url": "https://jobs.example.com/1", "title": "Reviewed", "job_id": job_ids[0],
        "location": "Nairobi (hybrid)", "workplace": "hybrid", "salary": "KES 1", "source": "company_site"})
    assert from_url.status_code == 200
    assert client.post("/dashboard/applications/from-url", json={
        "url": "https://jobs.example.com/1", "title": "Again", "job_id": job_ids[0]}).status_code == 409

    toggled = client.post("/dashboard/applications", json={"job_id": job_ids[1], "title": "Bookmark", "match_score": 61})
    assert toggled.json()["bookmarked"] is True
    assert client.post("/dashboard/applications", json={"job_id": job_ids[1]}).json() == {"bookmarked": False, "application_id": None}
    assert client.post("/dashboard/applications", json={"job_id": 999999999}).status_code == 404

    kept = client.post("/dashboard/applications", json={"job_id": job_ids[2], "title": "Kept", "match_score": 70}).json()
    kept_id = kept["application_id"]
    assert client.post(f"/dashboard/applications/{kept_id}/transition", json={"to_status": "interview"}).status_code == 200
    assert client.post("/dashboard/applications", json={"job_id": job_ids[2]}).status_code == 409
    assert client.delete(f"/dashboard/applications/{kept_id}").status_code == 409

    rows = {r["title"]: r for r in client.get("/dashboard/applications").json()}
    assert set(rows) == {"Typed", "Reviewed", "Kept"}
    assert rows["Typed"]["status"] == "applied" and rows["Typed"]["provider"] == "manual"
    assert rows["Reviewed"]["location"] == "Nairobi (hybrid)" and rows["Reviewed"]["workplace"] == "hybrid"
    # A pasted pool job is scored against the saved CV by the one matcher.
    assert rows["Reviewed"]["match_score"] is not None and rows["Reviewed"]["match_method"] == "jobradar-fit-v2"
    assert rows["Kept"]["status"] == "interview" and rows["Kept"]["match_method"] == "jobradar-fit-v2"
    assert client.get("/dashboard/applications/999999999/history").status_code == 404


def test_delete_data_then_account(client):
    assert client.delete("/account/data").json() == {"deleted": True}
    assert client.get("/dashboard/applications").json() == []
    assert client.get("/cv").status_code == 404
    assert client.delete("/account").json() == {"deleted": True}
