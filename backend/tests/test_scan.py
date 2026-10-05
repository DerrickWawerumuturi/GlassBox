"""
A scan reads each posting once: skills and requirement profiles stored by an
earlier run are reused, and only postings nothing has read yet are read here.
"""
from src.Agent.utils import parser
from src.Agent.utils.types import Job, ParsedQuery, ProcessedJob
from src.Agent.utils.location import LocationPreferences
from src.matching.requirements import profile_job

KE = LocationPreferences(country_code="ke", city="Nairobi")


def posting(db_id, title, description="Requirements: Python and PostgreSQL."):
    return Job(title=title, description=description, location="Nairobi, Kenya", db_id=db_id)


READABLE = "About the team. " * 60 + "Requirements: Python, PostgreSQL and Docker."


def test_a_scans_skills_come_from_profiles_stored_ones_reused(monkeypatch):
    reads = []
    monkeypatch.setattr(parser, "profile_job", lambda job: reads.append(job.title) or profile_job(job))
    stored = posting(1, "Backend Engineer", "Stored before.")
    stored_profile = profile_job(posting(1, "Backend Engineer", READABLE.replace("Python", "Go")))
    unread = posting(2, "Data Engineer", READABLE)
    unstored = posting(None, "ML Engineer", "Requirements: Python and PyTorch.")       # short: thin
    empty = posting(4, "Nothing to read", "")

    jobs, readable = parser.parse_retrieved_jobs([stored, unread, unstored, empty], {1: stored_profile})

    assert reads == ["Data Engineer", "ML Engineer"]                     # the stored one is not read again
    assert [(p.job.title, p.skills) for p in jobs] == [
        ("Backend Engineer", ["Go", "PostgreSQL", "Docker"]),
        ("Data Engineer", ["Python", "PostgreSQL", "Docker"]),
        ("ML Engineer", ["Machine Learning", "Python", "PyTorch"]),     # the title names one too
    ]
    # Market statistics count readable postings only; the thin one is still ranked.
    assert [p.job.title for p in readable] == ["Backend Engineer", "Data Engineer"]


def test_a_scan_of_only_thin_postings_still_has_a_market():
    jobs, readable = parser.parse_retrieved_jobs([posting(1, "Analyst", "Requirements: SQL.")])
    assert readable == jobs and jobs[0].skills == ["SQL"]


def test_cv_skills_are_named_like_posting_skills():
    # "React.js" and "react" are one skill; a name the vocabulary does not know is kept.
    assert parser.cv_skill_names(["react.js", "Postgres", "Underwater basket weaving"]) == \
        {"React", "PostgreSQL", "Underwater basket weaving"}


def test_the_scan_path_no_longer_loads_skillner():
    import subprocess
    import sys
    out = subprocess.run([sys.executable, "-c", "import sys, src.Agent.utils.parser; "
                          "print('src.Agent.utils.skill_extractor' in sys.modules)"],
                         capture_output=True, text=True, check=True)
    assert out.stdout.strip() == "False"


def test_a_stored_profile_is_scored_and_only_unstored_jobs_are_read(monkeypatch):
    from src.Agent.Framework import JobRadarAgent as agent_module

    reads = []
    monkeypatch.setattr(agent_module, "profile_job", lambda job: reads.append(job.title) or profile_job(job))
    query = ParsedQuery(primary_role="Backend Engineer", skills=["Python", "PostgreSQL"])
    stored = posting(7, "Backend Engineer")
    unstored = posting(None, "Junior Backend Engineer")
    # The stored profile is what Opportunities scores; it wins over re-reading the text.
    principal = profile_job(stored).__class__(**{**profile_job(stored).to_dict(), "seniority": "principal"})

    ranked = agent_module.JobRadarAgent.score_jobs(
        query, [ProcessedJob(stored, []), ProcessedJob(unstored, [])], KE, {7: principal})

    assert reads == ["Junior Backend Engineer"]
    by_title = {r["job"].job.title: r["match"] for r in ranked}
    assert any("Principal" in b for b in by_title["Backend Engineer"]["blockers"])
    assert by_title["Junior Backend Engineer"]["tier"] != "unlikely"
