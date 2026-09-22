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


def test_only_postings_nothing_has_read_go_to_skillner(monkeypatch):
    sent = []

    def extract_many(descriptions):
        sent.extend(descriptions)
        return [["Python (Programming Language)"] if "Python" in d else None for d in descriptions]

    monkeypatch.setattr(parser.extraction_pool, "extract_many", extract_many)
    read_before = posting(1, "Backend Engineer", "Stored before.")
    unread = posting(2, "Data Engineer", "Requirements: Python.")
    unstored = posting(None, "ML Engineer", "Requirements: Python and PyTorch.")
    failing = posting(3, "Platform Engineer", "SkillNer fails on this one.")
    empty = posting(4, "Nothing to read", "")

    jobs = parser.parse_retrieved_jobs([read_before, unread, unstored, failing, empty],
                                       known={1: ["PostgreSQL"], 4: ["Go"]})

    assert sent == [unread.description, unstored.description, failing.description]
    assert [(p.job.title, p.skills) for p in jobs] == [
        ("Backend Engineer", ["PostgreSQL"]), ("Data Engineer", ["Python (Programming Language)"]),
        ("ML Engineer", ["Python (Programming Language)"]),
    ]


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
