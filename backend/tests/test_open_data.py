"""
The open dataset (open_data.py, decisions/open-data.md, GitHub issue #7): each
published week as tidy CSV files, and the job step that adds it to the public
repository.

The exporter runs on a publication built by the real page code from fixture
rows, so the files are checked against the shapes publish.py stores. The
workflow step runs here with git and docker faked. One test reads
market_publications on a LOCAL database and is skipped without one.
"""
import csv
import json
import os
import re
import subprocess
from datetime import date, datetime, timezone
from pathlib import Path

import pytest

from src.jobpool import daily, market_look, open_data, publish

AS_OF = datetime(2026, 10, 12, 6, 0, tzinfo=timezone.utc)
COMPANIES = [f"Northwind {i}" for i in range(12)]          # 12 employers: python passes the breadth rule
FEW = ["Initech", "Globex"]                                 # 2 employers: rust doesn't
SENIOR = "Staff Platform Wizard"
JUNIOR = "Junior Backend Gardener"
AD = "The whole ad, which never leaves the server"


def row(company, title, family="ai", seniority="senior", skills=("python",), years=None):
    return {"provider": "greenhouse", "company": company, "title": title, "location": "Austin, TX",
            "remote": None, "url": f"https://jobs.example.com/{company}/{title}", "description": AD,
            "posted_at": AS_OF,
            "profile": {"family": family, "seniority": seniority, "thin": False, "years": years,
                        "years_kind": "required" if years is not None else "unstated",
                        "required": list(skills), "preferred": [], "mentioned": []}}


def pool() -> list[dict]:
    rows = [row(COMPANIES[i % 12], f"{SENIOR} {i}") for i in range(110)]
    rows += [row(FEW[i % 2], f"{SENIOR} rust {i}", skills=("python", "rust")) for i in range(30)]
    rows += [row(COMPANIES[i % 12], f"{JUNIOR} {i}", family="backend", seniority="junior",
                 years=i % 3 if i % 2 else None) for i in range(40)]
    return rows


def publication(week=date(2026, 10, 12)) -> dict:
    return {"week": week, "pages": market_look.bodies(pool(), AS_OF)["pages"]}


def read(path: Path) -> list[dict]:
    with path.open(encoding="utf-8") as f:
        return list(csv.DictReader(f))


@pytest.fixture
def out(tmp_path):
    open_data.export(tmp_path, [publication()])
    return tmp_path


def test_each_file_has_its_columns_in_the_week_and_combined(out):
    for name, columns in open_data.FILES.items():
        for path in (out / "2026-10-12" / f"{name}.csv", out / f"{name}.csv"):
            with path.open(encoding="utf-8") as f:
                assert next(csv.reader(f)) == [c for c, _, _ in columns]
    package = json.loads((out / "datapackage.json").read_text())
    assert [r["path"] for r in package["resources"]] == ["job_types.csv", "skills.csv", "experience.csv"]
    assert package["licenses"][0]["name"] == "CC-BY-4.0"
    assert (out / "README.md").read_text().startswith("# Glassbox weekly job counts")


def test_job_types_are_the_published_counts(out):
    ai = next(r for r in read(out / "job_types.csv") if r["job_type"] == "ai")
    page = publication()["pages"]["ai"]
    assert (int(ai["jobs_counted"]), int(ai["jobs_readable"]), int(ai["employers"])) == (140, 140, 14)
    assert (page["jobs"], page["readable"], page["employers"]) == (140, 140, 14)


def test_only_skills_named_at_ten_employers_or_more(out):
    ai = [r for r in read(out / "skills.csv") if r["job_type"] == "ai"]
    assert [r["skill"] for r in ai] == ["Python"]               # Rust: 30 jobs, but only 2 employers
    python = ai[0]
    assert (python["jobs_naming"], python["jobs_requiring"], python["jobs_readable"]) == ("140", "140", "140")
    assert python["share_naming"] == "1.0" and python["employers"] == "14"


def test_a_page_under_the_readable_rule_gives_counts_but_no_skills(out):
    # 40 entry level jobs: under market_pages.MIN_READABLE, so the site shows no shares for it.
    assert any(r["job_type"] == "entry-level-software" for r in read(out / "job_types.csv"))
    assert not any(r["job_type"] == "entry-level-software" for r in read(out / "skills.csv"))


def test_no_company_name_title_or_link_anywhere(out):
    text = "\n".join(p.read_text() for p in out.rglob("*") if p.is_file())
    for secret in (*COMPANIES, *FEW, SENIOR, JUNIOR, "jobs.example.com", AD):
        assert secret not in text


def test_experience_rows_only_when_the_week_has_them(out, tmp_path_factory):
    rows = read(out / "experience.csv")
    titled = {r["years_bucket"]: int(r["jobs"]) for r in rows if r["group"] == "early career titles"}
    assert titled == {"0": 7, "1": 7, "2": 6, "3": 0, "4": 0, "5+": 0, "unstated": 20}
    assert {r["group"] for r in rows} == {"early career titles", "all software"}

    older = publication(date(2026, 10, 5))
    del older["pages"]["entry-level-software"]["experience"]    # published before 12 Oct 2026
    assert open_data.rows(older)["experience"] == []


def test_weeks_append_and_a_week_written_again_is_not_counted_twice(out):
    open_data.export(out, [publication(date(2026, 10, 5))])
    weeks = open_data.export(out, [publication(date(2026, 10, 12))])
    assert weeks == ["2026-10-05", "2026-10-12"]
    rows = read(out / "job_types.csv")
    assert [r["week"] for r in rows].count("2026-10-12") == 5 and [r["week"] for r in rows].count("2026-10-05") == 5
    assert json.loads((out / "datapackage.json").read_text())["temporal"] == {"start": "2026-10-05", "end": "2026-10-12"}


# ------------------------------------------------------------ the job step

WORKFLOW = Path(__file__).resolve().parents[2] / ".github" / "workflows" / "job-pool.yml"
needs_workflow = pytest.mark.skipif(not WORKFLOW.exists(), reason="the .github workflows aren't in this tree")


def _steps() -> dict:
    yaml = pytest.importorskip("yaml")
    return {s.get("id") or s.get("name") or s["uses"]: s for s in yaml.safe_load(WORKFLOW.read_text())["jobs"]["refresh"]["steps"]}


@needs_workflow
def test_the_step_does_nothing_without_its_token(tmp_path):
    step = _steps()["Add the week to the open dataset"]
    assert step["if"] == "steps.collect.outputs.published != ''"           # only after a publication
    called = tmp_path / "called"
    for tool in ("git", "docker"):
        fake = tmp_path / tool
        fake.write_text(f'#!/bin/sh\necho {tool} >> "{called}"\n')
        fake.chmod(0o755)
    env = {"PATH": f"{tmp_path}:{os.environ['PATH']}", "OPEN_DATA_TOKEN": "", "WEEK": "2026-10-12"}
    done = subprocess.run(["bash", "-e", "-c", step["run"]], cwd=tmp_path, env=env, capture_output=True, text=True)
    assert done.returncode == 0, done.stderr
    assert done.stdout.strip().splitlines() == ["OPEN_DATA_TOKEN is not set: the open dataset is not updated"]
    assert not called.exists()


@needs_workflow
def test_the_published_week_is_read_from_the_line_daily_prints(tmp_path, monkeypatch, capsys):
    monkeypatch.setattr(publish, "run", lambda: {"status": "published", "week": date(2026, 10, 12), "jobs": 17_467})
    daily.publish_if_due()
    (tmp_path / "collect.log").write_text("fetched 20,000 postings\n" + capsys.readouterr().out)
    script = _steps()["collect"]["run"]
    command = next(line.strip() for line in script.splitlines() if line.strip().startswith("week=$("))
    output = tmp_path / "out"
    env = {**os.environ, "GITHUB_OUTPUT": str(output)}
    subprocess.run(["bash", "-e", "-c", f'{command}\necho "published=$week" >> "$GITHUB_OUTPUT"'],
                   cwd=tmp_path, env=env, check=True)
    assert output.read_text() == "published=2026-10-12\n"


# ------------------------------------------------------------ local database

URL = os.getenv("DATABASE_URL", "")
local = pytest.mark.skipif(not URL or not re.search(r"@(localhost|127\.0\.0\.1)[:/]", URL),
                           reason="writes publications: needs DATABASE_URL on a local Postgres")


@local
def test_one_row_per_week_the_one_served_last(tmp_path):
    from src.database.repositories import publication_repository as repo
    from src.database.session import connection
    with connection() as conn, conn.cursor() as cur:
        cur.execute("delete from market_publications")
        early = repo.insert(conn, date(2026, 10, 5), AS_OF, "published", "t", 1, [], {}, {"ai": {"jobs": 1}})
        repo.insert(conn, date(2026, 10, 12), AS_OF, "published", "t", 2, [], {}, {"ai": {"jobs": 2}})
        later = repo.insert(conn, date(2026, 10, 12), AS_OF, "published", "t", 3, [], {}, {"ai": {"jobs": 3}})
        repo.insert(conn, date(2026, 10, 19), AS_OF, "rejected", "t", 4, [])
    try:
        with connection() as conn:
            weeks = repo.published_weeks(conn)
            only = repo.published_weeks(conn, date(2026, 10, 12))
        assert [(w["id"], w["week"]) for w in weeks] == [(early, date(2026, 10, 5)), (later, date(2026, 10, 12))]
        assert [w["id"] for w in only] == [later]
    finally:
        with connection() as conn, conn.cursor() as cur:
            cur.execute("delete from market_publications")
