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


def test_the_first_write_says_it_created_the_account():
    sub = f"8{int(time.time() * 1000)}{uuid.uuid4().int % 1000:03d}"
    fresh = TestClient(main.app)
    fresh.headers["Authorization"] = f"Bearer {token(sub)}"
    try:
        assert fresh.get("/cv").status_code == 404  # a read creates nothing
        first = fresh.put("/cv", json=CV)
        assert first.status_code == 200 and first.headers.get("x-account-created") == "1"
        assert "x-account-created" not in fresh.put("/cv", json=CV).headers
    finally:
        with connection() as conn, conn.cursor() as cur:
            cur.execute("delete from users where sub = %s", (sub,))


def test_cv_and_analysis_round_trip(client):
    assert client.get("/cv").status_code == 404
    assert client.put("/cv", json=CV).status_code == 200
    assert client.get("/cv").json()["skills"] == ["Python"]
    analysis = {"market": {"skill_coverage": {}}, "ranked_jobs": []}
    assert client.put("/analysis", json={"analysis": analysis, "file_name": "cv.pdf"}).status_code == 200
    assert client.get("/analysis").json()["file_name"] == "cv.pdf"


def test_the_stored_cv_keeps_no_personal_details(client):
    full = {**CV, "name": "Jane Wanjiru", "email": "jane@example.com", "phone_number": "+254 700 000 000",
            "linkedIn": "https://linkedin.com/in/jane", "professional_summary": "Builds things at Acme Corp.",
            "experience": [{"company": "Acme Corp", "role": "Backend Engineer", "start_date": "Jan 2021",
                            "end_date": "Present", "description": "Python"}],
            "education": [{"school_name": "University of Nairobi", "course_title": "BSc Computer Science"}]}
    assert client.put("/cv", json=full).status_code == 200
    with connection() as conn, conn.cursor() as cur:
        cur.execute("select c.data from cvs c join users u on u.id = c.user_id where u.sub = %s", (SUB,))
        stored = str(cur.fetchone()["data"])
    assert not [t for t in ("Jane", "jane@", "+254", "linkedin", "Acme", "University of Nairobi", "Jan 2021") if t in stored]
    shown = client.get("/cv").json()
    assert shown["name"] is None and shown["experience"] == [] and shown["skills"] == ["Python"]
    assert shown["derived"]["years"]["software"] > 4


def test_latest_cv_is_one_row_replaced_then_deleted(client):
    from src.Agent.utils.types import ParsedQuery
    from src.database.services.users import user_service
    claims = {"sub": SUB}
    assert client.get("/cv/latest").status_code == 404
    assert client.post("/analyze/reuse").status_code == 404
    user_service.store_latest_cv(claims, ParsedQuery(skills=["Python"]), "old.pdf", "first text")
    user_service.store_latest_cv(claims, ParsedQuery(skills=["Go", "SQL"]), "new.pdf", "second text")
    with connection() as conn, conn.cursor() as cur:
        cur.execute("select count(*) as n from latest_cvs l join users u on u.id = l.user_id where u.sub = %s", (SUB,))
        assert cur.fetchone()["n"] == 1
    latest = client.get("/cv/latest").json()
    assert latest["file_name"] == "new.pdf" and latest["skills"] == ["Go", "SQL"] and latest["reusable"] is True
    assert user_service.profile_for_text(claims, "second text").skills == ["Go", "SQL"]
    assert user_service.profile_for_text(claims, "first text") is None
    assert client.delete("/cv/latest").json() == {"deleted": True}
    assert client.get("/cv/latest").status_code == 404
    # Wiping the user's data takes the kept profile with it.
    user_service.store_latest_cv(claims, ParsedQuery(skills=["Python"]), "cv.pdf", "text")
    assert client.delete("/account/data").json() == {"deleted": True}
    assert client.get("/cv/latest").status_code == 404
    assert client.put("/cv", json=CV).status_code == 200                # the tests below match against it


def test_location_preferences(client):
    first = client.get("/profile/location-preferences").json()
    assert first["saved"] is False and first["source"] == "default"
    saved = client.put("/profile/location-preferences", json={"country_code": "ng", "city": "Lagos"})
    assert saved.status_code == 200 and saved.json()["country_code"] == "ng"
    assert client.get("/profile/location-preferences").json()["saved"] is True
    assert client.put("/profile/location-preferences", json={"country_code": "zz"}).status_code == 422
    assert client.delete("/profile/location-preferences").json() == {"saved": False}


def test_application_lifecycle(client, job_ids):
    snapshot = {**CV, "name": "Jane Wanjiru", "email": "jane@example.com",
                "experience": [{"company": "Acme Corp", "role": "Engineer", "start_date": "2021", "end_date": "2023"}]}
    manual = client.post("/dashboard/applications/manual",
                         json={"title": "Typed", "company": "Co", "status": "applied", "cv_snapshot": snapshot})
    assert manual.status_code == 200
    manual_id = manual.json()["application_id"]
    with connection() as conn, conn.cursor() as cur:
        cur.execute("select cv_snapshot from application where id = %s", (manual_id,))
        kept = str(cur.fetchone()["cv_snapshot"])
    assert "Jane" not in kept and "jane@" not in kept and "Acme" not in kept and "Python" in kept
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

    # The applied date, corrected on a calendar: a day, kept at noon UTC.
    r = client.post(f"/dashboard/applications/{kept_id}/applied", json={"applied_on": "2026-09-14"})
    assert r.status_code == 200 and r.json()["applied_at"].startswith("2026-09-14T12:00")
    row = next(a for a in client.get("/dashboard/applications").json() if a["id"] == kept_id)
    assert row["applied_at"].startswith("2026-09-14") and row["status"] == "interview"
    assert client.post(f"/dashboard/applications/{kept_id}/applied", json={"applied_on": "2999-01-01"}).status_code == 422
    assert client.post("/dashboard/applications/999999999/applied", json={"applied_on": "2026-09-14"}).status_code == 404
    saved = client.post("/dashboard/applications", json={"job_id": job_ids[1], "title": "Only saved"}).json()["application_id"]
    assert client.post(f"/dashboard/applications/{saved}/applied", json={"applied_on": "2026-09-14"}).status_code == 422
    other = TestClient(main.app)
    other.headers["Authorization"] = f"Bearer {token(str(uuid.uuid4().int % 10**12))}"
    assert other.post(f"/dashboard/applications/{kept_id}/applied", json={"applied_on": "2026-09-01"}).status_code in (401, 404)


def test_delete_data_then_account(client):
    assert client.delete("/account/data").json() == {"deleted": True}
    assert client.get("/dashboard/applications").json() == []
    assert client.get("/cv").status_code == 404
    assert client.delete("/account").json() == {"deleted": True}
