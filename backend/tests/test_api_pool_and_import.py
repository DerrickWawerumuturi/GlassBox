"""
The daily pool's profiles, the opportunities list and spreadsheet import, end
to end: HTTP, services and SQL together against a real Postgres.

These tests write jobs into the pool, so they run only against a LOCAL database
— DATABASE_URL on a unix socket or localhost — never the production URL in .env.
"""
import io
import os
import time
import uuid
from datetime import datetime, timedelta, timezone
from urllib.parse import parse_qs, urlsplit

import pytest

URL = os.getenv("DATABASE_URL", "")


def _is_local(url: str) -> bool:
    parts = urlsplit(url)
    host = parts.hostname or parse_qs(parts.query).get("host", [""])[0]
    return host.startswith("/") or host in ("localhost", "127.0.0.1")


if not URL or not _is_local(URL):
    pytest.skip("writes jobs: needs DATABASE_URL pointing at a local Postgres", allow_module_level=True)

import jwt  # noqa: E402
from fastapi.testclient import TestClient  # noqa: E402
from openpyxl import Workbook  # noqa: E402

import main  # noqa: E402
from src.Agent.utils.types import Job, ProcessedJob  # noqa: E402
from src.database.services.ingestion import JobIngestionService  # noqa: E402
from src.database.session import connection  # noqa: E402

SUB = f"8{int(time.time() * 1000)}{uuid.uuid4().int % 1000:03d}"
PROVIDER = f"t{uuid.uuid4().hex[:8]}"
NOW = datetime.now(timezone.utc)
CV = {"name": "Test", "title": "Full Stack Developer", "location": "Nairobi, Kenya", "phone_number": None,
      "email": None, "portfolio": None, "linkedIn": None, "professional_summary": None,
      "skills": ["React", "Node.js", "PostgreSQL", "TypeScript"],
      "experience": [{"company": "Acme", "role": "Full Stack Developer", "start_date": "Mar 2025",
                      "end_date": "Present", "description": None}],
      "experience_level": "Mid Level", "education": []}


def token(sub):
    now = int(time.time())
    return jwt.encode({"sub": sub, "name": "Pool test", "iat": now, "exp": now + 900},
                      os.environ["API_JWT_SECRET"], algorithm="HS256")


def posting(n, title, description, days_old, location="Nairobi, Kenya", remote=False, eligibility=None,
            company="Acme", provider=PROVIDER):
    return Job(provider=provider, external_id=f"{n}", title=title, company=company, description=description,
               location=location, remote=remote, remote_eligibility=eligibility, url=f"https://jobs.test/{provider}/{n}",
               posted_at=(NOW - timedelta(days=days_old)).isoformat(),
               posted_at_utc=(NOW - timedelta(days=days_old)).isoformat(), raw={"n": n})


POOL = [
    posting(1, "Junior Full-Stack Engineer", "Requirements: 1-2 years. React, Node.js and PostgreSQL.", 1),
    posting(2, "Senior React Engineer", "Requirements: 5+ years of professional React and TypeScript.", 0),
    posting(3, "Full Stack Engineer", "Requirements: React, Node.js. 1+ years.", 2, "Remote - US", True),
    posting(4, "Frontend Developer", "Requirements: 1+ years. React and TypeScript.", 10),
    # The same role cross-posted on a second board: one row, with the other kept as "also".
    posting(5, "Junior Full-Stack Engineer", "Requirements: 1-2 years. React, Node.js and PostgreSQL.", 3,
            provider=PROVIDER + "b"),
]


@pytest.fixture(scope="module")
def client():
    with TestClient(main.app) as c:
        c.headers["Authorization"] = f"Bearer {token(SUB)}"
        yield c
    with connection() as conn, conn.cursor() as cur:
        cur.execute("delete from users where sub = %s", (SUB,))
        cur.execute("delete from jobs where provider in (%s, %s)", (PROVIDER, PROVIDER + "b"))


@pytest.fixture(scope="module")
def pool(client):
    ingestion = JobIngestionService()
    stored = ingestion.persist_jobs(None, POOL, observe=False, profile=False)
    assert len(stored) == len(POOL)
    return stored


# ------------------------------------------------------------- daily profiles

def test_profiles_are_computed_once_and_again_only_on_change(pool):
    ingestion = JobIngestionService()
    ids = list(pool.values())
    assert ingestion.refresh_profiles(ids) == len(ids)
    assert ingestion.refresh_profiles(ids) == 0          # unchanged: nothing to redo
    edited = posting(4, "Frontend Developer", "Requirements: 1+ years. React and TypeScript. Next.js a plus.", 10)
    ingestion.persist_jobs(None, [edited], observe=False, profile=False)
    assert ingestion.refresh_profiles(ids) == 1          # the edited posting only
    with connection() as conn, conn.cursor() as cur:
        cur.execute("select profile from job_profiles where job_id = %s", (pool[next(k for k in pool if k.external_id == "4")],))
        assert "next.js" in cur.fetchone()["profile"]["preferred"]


def test_updated_at_moves_only_when_the_stored_posting_changes(pool):
    job_id = next(v for k, v in pool.items() if k.external_id == "1")

    def stamps():
        with connection() as conn, conn.cursor() as cur:
            cur.execute("select updated_at, last_seen_at, first_seen_at from jobs where id = %s", (job_id,))
            return cur.fetchone()

    before = stamps()
    JobIngestionService().persist_jobs(None, [POOL[0]], observe=False, profile=False)   # seen again, unchanged
    after = stamps()
    assert after["updated_at"] == before["updated_at"] and after["first_seen_at"] == before["first_seen_at"]
    assert after["last_seen_at"] > before["last_seen_at"]


# ---------------------------------------------------------------- opportunities

def test_no_cv_no_opportunities(client, pool):
    stranger = TestClient(main.app)
    stranger.headers["Authorization"] = f"Bearer {token('7' + SUB[1:])}"
    assert stranger.get("/dashboard/opportunities").status_code == 404


def test_opportunities_newest_first_with_reasons_and_dates(client, pool):
    JobIngestionService().refresh_profiles(list(pool.values()))
    assert client.put("/cv", json=CV).status_code == 200
    body = client.get("/dashboard/opportunities").json()
    mine = [o for o in body["opportunities"] if o["provider"].startswith(PROVIDER)]
    by_title = {o["title"]: o for o in mine}

    listed = [o["listed_at"] for o in mine]
    assert listed == sorted(listed, reverse=True)                       # newest first
    assert all(o["date_basis"] == "posted" for o in mine)

    junior = by_title["Junior Full-Stack Engineer"]
    assert junior["match"]["tier"] == "strong" and junior["match"]["reasons"]
    assert len([o for o in mine if o["title"] == "Junior Full-Stack Engineer"]) == 1
    assert junior["also"] and junior["also"][0]["provider"].startswith(PROVIDER)

    assert by_title["Senior React Engineer"]["match"]["tier"] == "unlikely"
    us_only = by_title["Full Stack Engineer"]["match"]
    assert us_only["tier"] == "unlikely" and "Not open to candidates in Kenya" in us_only["blockers"]
    assert body["profile"]["level"] == "junior" and body["pool"]["refreshed_at"]

    best_first = client.get("/dashboard/opportunities?sort=match").json()["opportunities"]
    tiers = [o["match"]["tier"] for o in best_first if o["provider"].startswith(PROVIDER)]
    assert tiers[0] == "strong" and tiers[-1] == "unlikely"


def test_a_cv_edit_changes_the_matches_at_once(client, pool):
    senior_cv = {**CV, "experience": [{"company": "Acme", "role": "Senior Frontend Engineer",
                                       "start_date": "Jan 2018", "end_date": "Present", "description": None}]}
    assert client.put("/cv", json=senior_cv).status_code == 200
    mine = {o["title"]: o for o in client.get("/dashboard/opportunities").json()["opportunities"]
            if o["provider"].startswith(PROVIDER)}
    assert mine["Senior React Engineer"]["match"]["tier"] != "unlikely"
    assert client.put("/cv", json=CV).status_code == 200


# ------------------------------------------------------------------ scans

def test_a_scan_reuses_what_is_stored_until_the_posting_changes(pool):
    ingestion = JobIngestionService()
    job = posting(7, "Backend Engineer", "Requirements: 2+ years. Python and PostgreSQL.", 1)
    stored = ingestion.persist_jobs(None, [job], observe=False)          # profiled as it is stored
    job_id = next(iter(stored.values()))
    ingestion.persist_skills(stored, [ProcessedJob(job=job, skills=["Python (Programming Language)", "PostgreSQL"])])

    skills = ingestion.stored_skills([job_id])
    assert {s.lower() for s in skills[job_id]} == {"python (programming language)", "postgresql"}
    assert set(ingestion.stored_profiles([job_id])[job_id].required) == {"python", "postgresql"}

    edited = posting(7, "Backend Engineer", "Requirements: 2+ years. Python, PostgreSQL and Redis.", 1)
    ingestion.persist_jobs(None, [edited], observe=False, profile=False)
    assert ingestion.stored_skills([job_id]) == {}                       # changed: read it again
    assert ingestion.stored_profiles([job_id]) == {}


def test_a_scan_shows_its_jobs_in_opportunities_at_once(client, pool, monkeypatch):
    found = posting(6, "Junior React Developer", "Requirements: 1+ years. React and TypeScript.", 0)

    class Scan:
        def run(self, cv_text, preferences):
            JobIngestionService().persist_jobs(None, [found])            # what a scan stores
            return {"market": {}, "ranked_jobs": [], "search": {}}

    async def pdf_text(file):
        return "cv text"

    def titles():
        return {o["title"] for o in client.get("/dashboard/opportunities").json()["opportunities"]
                if o["provider"].startswith(PROVIDER)}

    assert client.put("/cv", json=CV).status_code == 200
    assert "Junior React Developer" not in titles()                      # the list is now cached
    monkeypatch.setattr(main, "_agent", Scan)
    monkeypatch.setattr(main, "_pdf_text", pdf_text)
    assert client.post("/analyze", files={"file": ("cv.pdf", b"%PDF-1.4", "application/pdf")}).status_code == 200
    assert "Junior React Developer" in titles()


# ------------------------------------------------------------------ import

def tracker_xlsx() -> bytes:
    """The shape of a real tracker: header row, outcomes in "Next Action", a Read Me sheet."""
    book = Workbook()
    sheet = book.active
    sheet.title = "Applications"
    sheet.append(["Job Title", "Company", "Date", "Job Posting URL", "Location", "Source", "Status",
                  "Next Action", "Resume/Cover Letter (FOLDER)"])
    sheet.append(["Software Engineering Intern", "Deeptrack", datetime(2026, 7, 14), "https://www.deeptrack.io/career/1",
                  "Remote", "LinkedIn", "Applied", "Rejected", "Deeptrack"])
    sheet.append(["Platform Engineering Internship", "TechGetAfrica", datetime(2026, 7, 15), "techgetafrica.com/jobs/2",
                  "Onsite", "LinkedIn", "Applied", "No response", "TGA"])
    sheet.append(["Full-Stack Developer", "Softgic", datetime(2026, 7, 20), "Softgic", "Remote", "LinkedIn",
                  "Applied", "Interview", "Deeptrack"])
    sheet.append([None, "Nameless Co", datetime(2026, 7, 21), None, "Remote", "LinkedIn", "Applied", None, None])
    sheet.append(["Typed Before", "Co", datetime(2026, 7, 22), None, "Remote", "Referral", "Applied", None, None])
    sheet.append(["Software Engineering Intern", "Deeptrack", datetime(2026, 7, 14), "https://deeptrack.io/career/1/",
                  "Remote", "LinkedIn", "Applied", "Rejected", None])
    readme = book.create_sheet("Read Me")
    readme.append(["How to use this tracker", None])
    out = io.BytesIO()
    book.save(out)
    return out.getvalue()


def preview(client, data=None, name="tracker.xlsx", **form):
    return client.post("/dashboard/applications/import/preview",
                       files={"file": (name, data if data is not None else tracker_xlsx())}, data=form)


def test_preview_reads_the_tracker_and_writes_nothing(client):
    client.post("/dashboard/applications/manual", json={"title": "Typed Before", "company": "Co", "status": "applied"})
    before = client.get("/dashboard/applications").json()
    result = preview(client)
    assert result.status_code == 200, result.text
    body = result.json()
    assert body["sheet"] == "Applications" and body["sheets"] == ["Applications", "Read Me"] and body["header_row"] == 1
    fields = {c["header"]: (c["field"], c["how"]) for c in body["columns"]}
    assert fields["Next Action"] == ("outcome", "values") and fields["Date"] == ("applied_at", "header")
    rows = {r["row"]: r for r in body["rows"]}
    assert rows[2]["values"]["status"] == "rejected" and rows[2]["values"]["workplace"] == "remote"
    assert rows[3]["values"]["url"] == "https://techgetafrica.com/jobs/2" and "No response" in rows[3]["values"]["notes"]
    assert rows[4]["values"]["url"] is None and "Link: Softgic" in rows[4]["values"]["notes"]
    assert rows[5]["status"] == "error" and not rows[5]["include"]                       # no title
    # Typed in today, applied in July per the sheet: flagged, left unticked, the user decides.
    assert rows[6]["duplicate"]["kind"] == "existing" and not rows[6]["duplicate"]["certain"]
    assert rows[6]["status"] == "warning" and not rows[6]["include"]
    assert rows[7]["status"] == "duplicate" and rows[7]["duplicate"] == {**rows[7]["duplicate"], "kind": "file", "row": 2}
    assert body["summary"]["rows"] == 6
    assert client.get("/dashboard/applications").json() == before


def test_a_corrected_mapping_is_applied(client):
    body = preview(client, mapping='{"7": null}').json()           # "Next Action" is not an outcome
    assert next(c for c in body["columns"] if c["header"] == "Next Action")["field"] is None
    assert {r["row"]: r for r in body["rows"]}[2]["values"]["status"] == "applied"


def test_commit_imports_confirmed_rows_newest_added_first(client):
    rows = [r["values"] for r in preview(client).json()["rows"] if r["include"]]
    result = client.post("/dashboard/applications/import", json={"file_name": "tracker.xlsx", "rows": rows})
    assert result.status_code == 200, result.text
    assert result.json()["created"] == 3 and result.json()["skipped"] == []

    again = client.post("/dashboard/applications/import", json={"file_name": "tracker.xlsx", "rows": rows}).json()
    assert again["created"] == 0 and len(again["skipped"]) == 3                        # never twice
    assert {s["reason"] for s in again["skipped"]} <= {"Same job link", "Same company and role"}

    listed = client.get("/dashboard/applications").json()
    added = [r["added_at"] for r in listed]
    assert added == sorted(added, reverse=True)
    imported = [r["title"] for r in listed[:3]]
    # Same import moment: its own application dates order it, newest first.
    assert imported == ["Full-Stack Developer", "Platform Engineering Internship", "Software Engineering Intern"]
    deeptrack = next(r for r in listed if r["company"] == "Deeptrack")
    assert deeptrack["status"] == "rejected" and deeptrack["applied_at"].startswith("2026-07-14")
    assert deeptrack["source"] == "linkedin"
    trail = client.get(f"/dashboard/applications/{deeptrack['id']}/history").json()
    assert [(e["from_status"], e["to_status"]) for e in reversed(trail)] == \
        [(None, "saved"), ("saved", "applied"), ("applied", "rejected")]
    assert listed[-1]["title"] == "Typed Before"                                         # added earlier, listed last


def test_an_import_without_a_date_keeps_it_unknown(client):
    csv = b"Role,Employer,Stage\nData Analyst,Undated Co,Interviewing\n"
    rows = [r["values"] for r in preview(client, csv, "tracker.csv").json()["rows"]]
    assert rows[0]["status"] == "interview" and rows[0]["applied_at"] is None
    assert client.post("/dashboard/applications/import", json={"rows": rows}).json()["created"] == 1
    row = next(r for r in client.get("/dashboard/applications").json() if r["company"] == "Undated Co")
    assert row["status"] == "interview" and row["applied_at"] is None


@pytest.mark.parametrize("data, name, message", [
    (b"\xd0\xcf\x11\xe0 old excel", "tracker.xls", "old Excel .xls"),
    (b"PK\x03\x04 not really a zip", "tracker.xlsx", "couldn't be read"),
    (b"   ", "tracker.csv", "empty"),
    (b"Role,Company\n", "tracker.csv", "No rows"),
])
def test_unreadable_files_say_why(client, data, name, message):
    result = preview(client, data, name)
    assert result.status_code == 422 and message in result.json()["detail"]


def test_commit_refuses_malformed_rows(client):
    bad = client.post("/dashboard/applications/import", json={"rows": [{"title": "", "status": "applied"}]})
    assert bad.status_code == 422
    bad_link = client.post("/dashboard/applications/import", json={"rows": [{"title": "X", "url": "javascript:alert(1)"}]})
    assert bad_link.status_code == 422
