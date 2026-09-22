"""
Fit matching, as behaviour a user would notice: tiers, order and the reasons
given. Internals can be retuned without rewriting these. Most cases come from
jobhunt's test suite, where the rules were proven on a real job search first.
"""
from datetime import date
from types import SimpleNamespace

import pytest

from src.Agent.utils.location import LocationPreferences
from src.matching.candidate import Candidate
from src.matching.matcher import BLOCKED_CEILING, match
from src.matching.requirements import profile_job

KE = LocationPreferences(country_code="ke", city="Nairobi")
TODAY = date(2026, 9, 22)


def job(title, description, location="Nairobi, Kenya", remote=False, eligibility=None, level=None):
    return SimpleNamespace(title=title, description=description, location=location, remote=remote,
                           remote_eligibility=eligibility, experience_level=level, employment_type=None)


def fit(candidate, posting):
    return match(candidate, profile_job(posting), posting)


def cv(title, skills, positions=(), education=(), prefs=KE):
    experience = [{"role": role, "start_date": start, "end_date": end} for role, start, end in positions]
    return Candidate.from_cv({"title": title, "skills": list(skills), "experience": experience,
                              "education": [{"course_title": c} for c in education]}, prefs, TODAY)


# jobhunt's candidate: an early-career software engineer building toward ML.
SWE = cv("Software Engineer",
         ["Python", "JavaScript", "TypeScript", "React", "Next.js", "Node.js", "Express", "HTML", "CSS",
          "PostgreSQL", "REST APIs", "Git", "Docker", "FastAPI", "Machine Learning", "scikit-learn", "PyTorch",
          "pandas", "NLP", "LLMs", "RAG", "vector databases"],
         [("Software Engineer", "Sep 2025", "Present")], ["BSc Data Science"])


# ------------------------------------------------------------ the brief's cases

def test_case_a_senior_react_role_is_not_a_match_for_one_year_of_react():
    react_dev = cv("Frontend Developer", ["React", "TypeScript", "Next.js"], [("Frontend Developer", "Sep 2025", "Present")])
    senior = fit(react_dev, job("Senior React Engineer", "Requirements: 5+ years of professional experience with "
                                "React and TypeScript. Next.js experience.", "Remote", True, "Worldwide"))
    junior = fit(react_dev, job("Junior Frontend Developer", "Requirements: 0-1 years of experience. React and TypeScript."))
    assert senior.tier == "unlikely" and senior.score <= BLOCKED_CEILING
    assert senior.dimensions["required"] == 1.0          # the overlap is real, and still not enough
    assert any("Senior role" in b for b in senior.blockers)
    assert any("Asks 5+ years" in b for b in senior.blockers)
    assert junior.tier == "strong" and junior.score > 90


def test_case_b_ml_internship_is_judged_differently_from_a_professional_ml_role():
    learner = cv("Data Science Graduate", ["Python", "Machine Learning", "scikit-learn", "PyTorch", "pandas"],
                 [("Software Engineering Intern", "Jan 2025", "Jun 2025")], ["BSc Data Science"])
    intern = fit(learner, job("Machine Learning Intern", "What we're looking for: pursuing a degree in Data "
                              "Science or similar. Python, scikit-learn and PyTorch. Exposure to NLP is a plus."))
    engineer = fit(learner, job("Machine Learning Engineer", "Requirements: 3+ years of experience building "
                                "production machine learning systems. Python, PyTorch, MLOps."))
    assert intern.tier == "strong" and not intern.blockers
    assert engineer.tier == "unlikely"
    assert any("professional ML experience" in b for b in engineer.blockers)


def test_case_c_junior_full_stack_with_the_same_stack_is_strong():
    developer = cv("Full Stack Developer", ["React", "Node.js", "PostgreSQL"],
                   [("Full Stack Developer", "Mar 2025", "Present"), ("Web Developer Intern", "Jun 2024", "Dec 2024")])
    result = fit(developer, job("Junior Full-Stack Engineer", "Requirements: 1-2 years of experience. "
                                "React, Node.js and PostgreSQL."))
    assert result.tier == "strong" and result.score >= 90
    assert result.required == {"matched": ["React", "Node.js", "PostgreSQL"], "partial": [], "missing": []}
    assert not result.blockers


@pytest.mark.parametrize("posting, blocker", [
    (job("Full Stack Engineer", "Requirements: React, Node.js.", "Remote - US", True), "Not open to candidates in Kenya"),
    (job("Full Stack Engineer", "Requirements: React, Node.js. You must be authorized to work in the United States.",
         "Remote", True), "Requires US work authorisation"),
    (job("Full Stack Engineer", "Requirements: React, Node.js.", "Remote", True, "USA"), "Not open to candidates in Kenya"),
])
def test_case_d_location_eligibility_is_a_gate_not_a_weight(posting, blocker):
    result = fit(SWE, posting)
    assert result.tier == "unlikely" and blocker in result.blockers and result.score <= BLOCKED_CEILING


def test_case_d_the_same_job_open_to_africa_is_strong():
    result = fit(SWE, job("Full Stack Engineer", "Requirements: 1+ years. React, Node.js.", "Remote", True, "Africa"))
    assert result.tier == "strong" and result.facts["location_tier"] == "remote_region"


# ------------------------------------------------------------- jobhunt's tiers

JUNIOR_SWE = job("Junior Software Engineer", "Requirements: 0-2 years of professional experience. Strong Python, "
                 "React and PostgreSQL required. You will build REST APIs. Nice to have: Docker, Redis.")
SWE_INTERN = job("Software Engineering Intern", "Qualifications: currently pursuing a degree in Computer Science or "
                 "related. Familiarity with Python and React. You will work with our web team.")
MID_SWE = job("Software Engineer", "Requirements: 2-3 years of experience building web applications. Python and "
              "React required. PostgreSQL experience useful.")
SENIOR_SWE = job("Senior Software Engineer", "Minimum qualifications: 5+ years of professional software engineering "
                 "experience. Strong Python. You will mentor junior engineers and own the architecture.")
WRONG_STACK = job("Software Engineer", "Minimum qualifications: 5+ years experience. Must have C++, Rust, CUDA, "
                  "Kubernetes, Kafka, Spark and Terraform. Deep distributed systems background essential.")
AI_WEB_ROLE = job("AI Engineer", "Requirements: 2 years of engineering experience. Build production web "
                  "applications powered by LLMs. Strong React, TypeScript, Node and REST API skills. You will own "
                  "the frontend and backend, ship features fast and design database schemas.")
ML_RESEARCH = job("AI Engineer", "Requirements: 3+ years. You will train models, handle distributed training, "
                  "fine-tuning and model architecture work. Production ML and hyperparameter search at scale.")
PREFERRED_FIVE = job("Software Engineer", "Requirements: strong Python and React. Preferred qualifications: "
                     "5+ years of experience, Kubernetes is a plus.")


@pytest.mark.parametrize("posting, tiers", [
    (JUNIOR_SWE, {"strong"}),
    (SWE_INTERN, {"strong"}),
    (MID_SWE, {"strong", "good"}),
    (AI_WEB_ROLE, {"strong", "good"}),
    (SENIOR_SWE, {"unlikely"}),
    (WRONG_STACK, {"unlikely"}),
    (ML_RESEARCH, {"unlikely"}),
])
def test_tiers(posting, tiers):
    result = fit(SWE, posting)
    assert result.tier in tiers, (result.tier, result.score, result.reasons)


def test_one_year_short_is_a_stretch_on_the_right_track():
    mid, junior = fit(SWE, MID_SWE), fit(SWE, JUNIOR_SWE)
    assert mid.score < junior.score
    assert mid.facts["track"] == "software" and 0.6 <= mid.dimensions["experience"] < 1.0


def test_ai_titled_web_work_is_judged_as_software():
    assert fit(SWE, AI_WEB_ROLE).facts["family"] == "software_engineering"


def test_preferred_years_lower_a_match_without_excluding_it():
    result = fit(SWE, PREFERRED_FIVE)
    assert result.tier != "unlikely" and result.score < fit(SWE, JUNIOR_SWE).score


def test_one_matching_skill_does_not_carry_an_unfamiliar_stack():
    result = fit(SWE, WRONG_STACK)
    assert result.dimensions["role"] == 1.0 and result.score <= BLOCKED_CEILING


def test_missing_preferred_skills_do_not_sink_a_good_job():
    result = fit(SWE, job("Software Engineer", "Requirements: Python, React, PostgreSQL and REST APIs.\n"
                          "Nice to have: Docker, Redis, AWS, Kubernetes, Terraform, Kafka."))
    assert result.dimensions["required"] == 1.0 and result.tier in ("strong", "good")


def test_unstated_experience_is_not_a_free_pass():
    result = fit(SWE, job("Software Engineer", "Join our platform team. You will work across the stack on Python "
                          "and React services, owning features end to end and reviewing code with the team."))
    assert result.dimensions["experience"] < 0.8
    assert any("check the posting" in r["text"] for r in result.reasons)


def test_a_junior_title_stands_in_for_unstated_years():
    result = fit(SWE, job("Junior Software Engineer", "Work on Python and React services."))
    assert result.dimensions["experience"] == 1.0


# ------------------------------------------------------------------ relevance

def test_a_non_technical_role_with_a_real_description_is_out_of_reach():
    body = ("We are seeking an enthusiastic intern to support our adult literacy programme across community "
            "centres. You will help deliver classes, track learner attendance and prepare teaching materials. "
            "A background in education or social work is desirable. This is a full time placement based in our "
            "regional office and reporting to the programme lead. ") * 3
    result = fit(SWE, job("Adult Literacy Intern", body))
    assert result.tier == "unlikely" and "Not a technical role" in result.blockers


def test_a_thin_unclear_listing_is_demoted_not_dropped():
    result = fit(SWE, job("Industrial Attachment Opportunities", "Applications are invited. Apply online."))
    assert result.tier == "stretch" and not result.blockers
    assert any("open the posting" in r["text"] for r in result.reasons)


def test_a_thin_technical_internship_survives():
    assert fit(SWE, job("Software Engineering Intern", "Internship for students. Apply now.")).tier != "unlikely"


# ------------------------------------------------------------------- gates

def test_a_posting_in_german_needs_german():
    body = ("Wir suchen einen Softwareentwickler für unser Team. Du hast Erfahrung mit Python und React und "
            "arbeitest gern im Team. Wir bieten dir ein tolles Umfeld und flexible Arbeitszeiten, die mit dir "
            "wachsen. Bewirb dich jetzt und gestalte die Zukunft mit uns in Berlin und über die Grenzen hinaus.")
    result = fit(SWE, job("Softwareentwickler (m/w/d)", body, "Berlin, Germany"))
    assert "Requires German" in result.blockers
    german = cv("Software Engineer", ["Python", "React", "German"], [("Software Engineer", "Sep 2025", "Present")])
    assert "Requires German" not in fit(german, job("Softwareentwickler (m/w/d)", body, "Berlin, Germany")).blockers


def test_a_required_phd_is_a_gate_and_a_preferred_one_is_not():
    required = fit(SWE, job("Research Engineer", "Requirements: PhD in Computer Science. Python, PyTorch."))
    preferred = fit(SWE, job("Software Engineer", "Requirements: Python.\nPreferred: MS or PhD."))
    assert "PhD required" in required.blockers and "PhD required" not in preferred.blockers


def test_onsite_abroad_without_sponsorship_is_a_gate():
    result = fit(SWE, job("Software Engineer", "Requirements: Python and React. We are unable to sponsor visas.",
                          "Berlin, Germany"))
    assert any("no visa sponsorship" in b for b in result.blockers)


def test_onsite_abroad_with_nothing_said_is_only_discounted():
    result = fit(SWE, job("Junior Software Engineer", "Requirements: Python and React.", "Berlin, Germany"))
    assert not result.blockers and result.facts["location_tier"] == "international"
    assert result.score < fit(SWE, JUNIOR_SWE).score


def test_a_job_with_no_location_is_not_treated_as_abroad():
    result = fit(SWE, job("Junior Software Engineer", "Requirements: Python and React.", None))
    assert result.facts["location_tier"] == "unstated" and not result.blockers


def test_every_score_carries_its_reasons_and_skills():
    result = fit(SWE, JUNIOR_SWE).to_dict()
    assert result["version"] == "jobradar-fit-v2" and result["headline"] == "Strong match"
    assert "Python" in result["required"]["matched"] and result["preferred"]["missing"] == ["Redis"]
    assert {r["tone"] for r in result["reasons"]} <= {"good", "warn", "bad"}


# ------------------------------------------------- found on the real pool

def test_a_full_posting_naming_no_technology_is_not_a_good_fit():
    body = ("You will own relationships with upstream bioprocessing customers across the region, run product "
            "demonstrations of our single-use bioreactor range and support commercial teams in closing deals. ") * 6
    result = fit(SWE, job("Sales Engineer - Upstream Bioprocessing", body, "Remote", True, "EMEA"))
    assert result.tier not in ("strong", "good")
    assert any("names no technical skills" in r["text"] for r in result.reasons)


def test_overlapping_skills_do_not_make_different_work_a_good_match():
    result = fit(SWE, job("Technical CX Specialist", "Requirements: 1+ years. Python, SQL and REST APIs to help "
                          "customers debug their integrations."))
    assert result.dimensions["role"] < 0.35 and result.tier == "stretch"


def test_the_right_role_and_level_do_not_carry_a_foreign_stack():
    result = fit(SWE, job("Postgres Deployment Engineer (Nix)", "Requirements: 1+ years of experience. Nix, "
                          "Ansible, Kubernetes, Terraform, Go, C++, Linux, AWS, CI/CD and Python.", "Remote", True,
                          "Worldwide"))
    assert result.score >= 55 and result.dimensions["role"] == 1.0 and result.dimensions["seniority"] == 1.0
    assert result.dimensions["required"] < 0.4 and result.tier == "stretch"
    assert any(r["tone"] == "bad" and "required skills" in r["text"] for r in result.reasons)


def test_a_job_built_on_a_technology_the_cv_lacks_is_a_stretch():
    body = ("Requirements: 2+ years of healthcare IT development. SQL and REST APIs. Develop Caché ObjectScript "
            "and MUMPS routines on TrakCare.")
    niche = fit(SWE, job("Software Engineer – InterSystems Caché & TrakCare HIS", body, "Remote", True, "Worldwide"))
    assert niche.score >= 55 and niche.tier == "stretch"
    assert any(r["tone"] == "bad" and "InterSystems" in r["text"] for r in niche.reasons)
    python = fit(SWE, job("Python Developer", "Requirements: 1+ years. Python, SQL and REST APIs.", "Remote", True,
                          "Worldwide"))
    assert python.tier == "strong" and not any("Built on" in r["text"] for r in python.reasons)


def test_a_stale_intake_is_out_of_reach_and_a_product_version_is_not():
    stale = fit(SWE, job("Intern: Data Science (Summer 2024)", "Requirements: Python."))
    assert any("2024" in b for b in stale.blockers)
    current = fit(SWE, job("Windows Server 2019 Administrator", "Requirements: PowerShell."))
    assert not any("intake" in b for b in current.blockers)
