"""Reading both sides of a match: a posting's requirements, a CV's skills and years. Offline."""
from datetime import date
from types import SimpleNamespace

import pytest

from src.Agent.utils.location import LocationPreferences
from src.matching import skills as S
from src.matching.candidate import Candidate, position_months
from src.matching.requirements import content_hash, experience_level_years, extract_experience, profile_job, split_sections
from src.matching.roles import classify_family, classify_seniority

TODAY = date(2026, 9, 22)


def posting(title, description, level=None, employment=None):
    return profile_job(SimpleNamespace(title=title, description=description, experience_level=level,
                                       employment_type=employment))


# ------------------------------------------------------------------ skills

@pytest.mark.parametrize("name, key", [
    ("React", "react"), ("React.js", "react"), ("ReactJS", "react"), ("react", "react"),
    ("Postgres", "postgresql"), ("PostgreSQL", "postgresql"), ("Python (Programming Language)", "python"),
    ("Docker (Software)", "docker"), ("golang", "go"), ("Go", "go"), ("C#", "c#"), ("C++", "c++"),
    (".NET", ".net"), ("ASP.NET Core", ".net"), ("k8s", "kubernetes"), ("Scikit-learn", "scikit-learn"),
    ("Amazon Web Services", "aws"), ("REST APIs", "rest api"), ("M-Pesa", "payments"), ("Communication", None),
])
def test_one_key_per_skill_however_it_is_spelled(name, key):
    assert S.canonical(name) == key


def test_ordinary_words_are_not_skills_in_prose():
    # Known limit: "React" opening a sentence as a verb would still match; the
    # capital cannot be told apart without parsing, and postings rarely say it.
    text = "Go to market fast. Our R&D team works with C-level execs who react quickly to incidents."
    assert S.find_skills(text) == []


def test_short_language_names_count_where_a_language_is_named():
    assert S.find_skills("We use Python, Go and Rust. You must know Go. Knowledge of R and C.") == \
        ["python", "go", "rust", "r", "c"]


def test_the_longest_alias_wins():
    assert S.find_skills("React Native and Objective-C, CI/CD, A/B testing") == \
        ["react native", "objective-c", "ci/cd", "statistics"]


def test_related_credit_is_partial_and_directional():
    assert S.credit({"next.js"}, "react") == 0.8 and S.credit({"react"}, "next.js") == 0.7
    assert S.credit({"react"}, "react") == 1.0 and S.credit({"react"}, "kafka") == 0.0


def test_a_cv_list_keeps_what_the_vocabulary_does_not_know():
    known, unknown = S.resolve_all(["React & Next.js", "postgres", "Problem Solving", ""])
    assert known == {"react", "next.js", "postgresql"} and unknown == ["Problem Solving"]


def _skills_at(company, title, text):
    p = profile_job(SimpleNamespace(title=title, description=text, experience_level=None, employment_type=None,
                                    company=company))
    return {*p.required, *p.preferred, *p.mentioned}


def test_the_employers_own_name_is_not_a_skill():
    # Every Datadog posting says "Datadog"; it made Observability a skill of
    # their recruiters (2026-10-05). The same words elsewhere are a real ask.
    about = "About Datadog: Datadog is the monitoring platform for cloud applications. We build Datadog."
    assert _skills_at("Datadog", "Recruiter", about) == set()
    assert _skills_at("Acme", "Recruiter", about) == {"observability"}
    assert _skills_at("GitLab Inc.", "Backend Engineer", "Join GitLab. Requirements: Ruby and PostgreSQL.") == \
        {"ruby", "postgresql"}


def test_a_tool_the_employer_does_not_make_still_counts_at_the_employer():
    text = "About Datadog: Datadog is a cloud company.\nRequirements: Go, and experience with Grafana."
    assert _skills_at("Datadog", "Backend Engineer", text) == {"go", "observability"}


# --------------------------------------------------------- sections, years

def test_only_headings_open_sections():
    sections = split_sections("Requirements: Python, AWS is a plus.\nNice to have:\nDocker\nBenefits:\nfree lunch")
    assert "AWS is a plus" in sections["required"] and "Docker" in sections["preferred"]
    assert "lunch" not in " ".join(sections.values())


@pytest.mark.parametrize("description, expected", [
    ("Requirements: 3+ years of Python experience.", {"years": 3, "kind": "required"}),
    ("Requirements: Python.\nNice to have: 5+ years in fintech.", {"years": 5, "kind": "preferred"}),
    ("We need 2-4 years building web applications.", {"years": 2, "kind": "required"}),
    ("Founded 10 years ago, we build tools.", {"years": None, "kind": "unstated"}),
    # Conjunctive: both figures are required, so the gate is the higher one.
    ("Requirements: 4+ years shipping Go in production. 2+ years on distributed systems.", {"years": 4, "kind": "required"}),
    ("Requirements: 3+ years of experience is a plus.", {"years": 3, "kind": "preferred"}),
    ("Requirements: 3+ years of Python, ideally 5+ years.", {"years": 3, "kind": "required"}),
    ("Requirements: two (2) years of experience with React.", {"years": 2, "kind": "required"}),
    ("We have 10+ years in business. You need 2+ years of experience.", {"years": 2, "kind": "required"}),
    ("Requirements: 0-2 years of professional experience.", {"years": 0, "kind": "required"}),
    # Real phrasings, 2026-10-07. A range after "experience" read its upper end.
    ("- Experience: 5-7+ years in data center commissioning, construction, or critical infrastructure delivery",
     {"years": 5, "kind": "required"}),
    ("Experience and Skills: 0-2+ years of experience reading and interpreting mechanical drawings",
     {"years": 0, "kind": "required"}),
    # The overall figure is the highest; the "including" figure sits inside it.
    ("You Have: 8+ years of software engineering experience, with at least 2 years working directly with LLMs",
     {"years": 8, "kind": "required"}),
    ("Capability over Tenure: No prior experience required.", {"years": 0, "kind": "required"}),
    ("Your data is kept for up to 2 years in our candidate pool. Read our Privacy Notice.",
     {"years": None, "kind": "unstated"}),
])
def test_extract_experience(description, expected):
    assert extract_experience("Engineer", description) == expected


def test_required_and_preferred_skills_are_separated_per_clause():
    p = posting("Software Engineer", "Requirements: 3+ years of Python experience, AWS is a plus. "
                "Strong SQL skills (Django a plus).\nNice to have: Docker, Redis.")
    assert p.required == ("python", "sql") and set(p.preferred) == {"aws", "django", "docker", "redis"}


def test_a_posting_without_headings_is_its_own_requirement_list():
    assert set(posting("Backend Engineer", "You will build APIs in Python and PostgreSQL.").required) == \
        {"python", "postgresql", "rest api"}


def test_a_skill_in_the_title_is_required():
    assert "react" in posting("React Developer", "Requirements: TypeScript.").required


# --------------------------------------------------------- family, level

@pytest.mark.parametrize("title, family", [
    ("Senior React Engineer", "frontend"), ("Backend Engineer (Python)", "backend"), ("Full-Stack Developer", "full_stack"),
    ("Machine Learning Engineer", "machine_learning"), ("Data Scientist", "data_science"),
    ("Data Engineer", "data_engineering"), ("Site Reliability Engineer", "devops"), ("iOS Engineer", "mobile"),
    ("QA Automation Engineer", "qa"), ("Software Engineer, Finance", "software_engineering"),
    ("Member of Technical Staff", "software_engineering"), ("Softwareentwickler (m/w/d)", "software_engineering"),
    ("AI Tutor - Chemistry", "ai_data"), ("Product Designer", "design"), ("AI Product Manager", "product"),
    ("Sales Engineer", "solutions"), ("Business Developer", "non_tech"), ("Mechanical Engineer", "non_tech"),
    ("Finance Manager", "non_tech"), ("ICT Officer", "it_support"), ("Graduate Trainee Programme", "other"),
    ("Accountant", "non_tech"), ("Security Guard", "non_tech"), ("Security Engineer", "security"),
    ("Customer Success Engineer", "solutions"), ("Forward Deployed Engineer EMEA", "solutions"),
    ("Security Operations Engineer", "security"), ("SecOps Analyst", "security"),
])
def test_role_family_from_the_title(title, family):
    assert classify_family(title) == family


# Real titles from the pool that were filed wrong (families audit, 2026-10-05).
@pytest.mark.parametrize("title, family", [
    # "AI" names the domain; a non-technical job stays non-technical.
    ("Legal AI Counsel (Berlin or Leipzig)", "non_tech"), ("Enterprise Account Executive - AI Native Companies", "non_tech"),
    ("Principal Technical Product Marketing Manager — AI", "non_tech"), ("Finance Intern - (AI x Greentech) (m/f/d)", "non_tech"),
    ("Global Public Policy Manager, Compute, Infrastructure & Sovereign AI", "non_tech"),
    ("Senior SEO & AI Search Manager (Expert Level) | SEO, GEO & E-Commerce", "non_tech"),
    # ...and a technical function in the title beats the domain.
    ("iOS Developer - AI Finance Agent", "mobile"), ("Mobile Application Developer - AI Neobank App", "mobile"),
    ("Senior Software Engineer, Backend - Platform (Core AI Automation)", "backend"), ("AI Security Engineer", "security"),
    ("AI Support Engineer - Toronto (Weekend Shift)", "it_support"), ("Senior AI-Native Data Engineer (f/m/x)", "data_engineering"),
    ("AI Engineer", "ai"), ("Staff Applied AI Engineer", "ai"), ("Engineering Manager, Applied AI", "ai"),
    # Quality and test work on physical products is not software QA.
    ("Manufacturing Quality Engineer – Datacenter Infrastructure", "non_tech"), ("Propulsion Test Engineer", "non_tech"),
    ("Dimensional Quality Engineer, Metrology", "non_tech"), ("NPI Hardware Quality Engineer, Accessories", "embedded"),
    ("Staff Hardware Test Engineer (Manufacturing)", "embedded"),
    ("Senior QA Automation Engineer", "qa"), ("Principal Software Development Engineer in Test (SDET)", "qa"),
    ("Quality Engineer, Mobile", "qa"), ("Senior Localisation Quality Engineer", "qa"),
    # Small misses.
    ("Product Design Intern (2027)", "design"), ("Systemadministrator Linux (m/w/d)", "it_support"),
])
def test_role_family_audit_cases(title, family):
    assert classify_family(title) == family


# Real titles from the live pool, 2026-10-07 (publishable counts audit).
@pytest.mark.parametrize("title, family", [
    # Engineering of physical things reached software only through "engineer".
    ("Facilities Engineer - Memphis", "non_tech"), ("Fire Protection Engineer - Memphis", "non_tech"),
    ("Fluids Engineer (Power Generation) - Memphis", "non_tech"), ("Optical Engineer (Data Center)", "non_tech"),
    ("Rack Design Engineer (Data Center)", "non_tech"), ("Controls Engineer, Supercomputer Infrastructure - Memphis", "non_tech"),
    ("Associate Construction Engineer - Power Infrastructure", "non_tech"), ("Commissioning Engineer II", "non_tech"),
    ("Power Systems Engineer, Data Center Infrastructure - Memphis", "non_tech"),
    # Chip and electronics design is hardware.
    ("Physical Design Engineer", "embedded"), ("Lead RTL Design Engineer", "embedded"),
    ("Staff Design Verification Engineer", "embedded"), ("Senior Radio Frequency Engineer", "embedded"),
    # A job function named first: the technical word is its subject.
    ("Tax Information Reporting Intern", "non_tech"), ("Legal Engineer (In-House)", "non_tech"),
    ("Tutorial Fellow, School Of Computing & Informatics- Nairobi Campus", "non_tech"),
    ("Recruiter, Field Engineering & FDE", "non_tech"), ("Executive Assistant to Head of Engineering", "non_tech"),
    ("Copywriter, Developer", "non_tech"), ("Developer Community Manager", "non_tech"),
    ("(Senior) Account Executive - Software Sales (d/f/m)", "non_tech"), ("GTM Engineer", "non_tech"),
    ("Senior HR Business Partner - Engineering, Product, and Design", "non_tech"),
    ("Technical Account Manager", "solutions"),
    # Customer-facing engineering, security specialisms, IT and systems work.
    ("Manager, Field Engineering", "solutions"), ("Deployed Engineer (Early Career- SF)", "solutions"),
    ("Consulting Engineer", "solutions"), ("Senior Professional Services Engineer - West", "solutions"),
    ("Detection and Response Engineer", "security"), ("Staff Identity Governance and Access Engineer", "security"),
    ("Head of Product Security", "security"), ("IT Ops Engineer", "it_support"), ("Technical Services Engineer", "it_support"),
    ("Senior System Engineer", "devops"), ("Director, Site Reliability Engineering", "devops"),
    ("Intern, Data Engineering", "data_engineering"),
    # Tech titles that sat in `other`.
    ("Product Management - Interns", "product"), ("Director of Product Management, Fintech", "product"),
    ("VP, Product", "product"), ("Director of Product Design", "design"), ("IT Intern", "it_support"),
    ("ICT & Database Intern", "it_support"), ("Intern, Business Technology", "it_support"),
    ("Werkstudent:in (m/w/d) IT Workplace Management & Deployment", "it_support"),
    ("Tech Lead Manager, Agent Runtime Platform", "software_engineering"),
    # ...and what must not move: the department-IT rule reads capitals only.
    ("Confidential Executive Search in Kenya: When Should Employers Use It?", "other"),
    ("IT Sales Representative", "non_tech"), ("Software Engineer, Stripe Tax", "software_engineering"),
    ("Engineering Manager, Accounting Products", "software_engineering"),
    ("Senior Software Engineer, Battery Management", "software_engineering"),
    ("Kernel Engineer - New Grad", "software_engineering"), ("Engineering Intern (Summer 2027)", "software_engineering"),
    ("Senior Distribution Engineer, Gitlab: Build", "software_engineering"), ("Founding Engineer", "software_engineering"),
    ("Unity Developer", "game"), ("Unity Catalog Engineer", "software_engineering"),
])
def test_role_family_publishable_counts_cases(title, family):
    assert classify_family(title) == family


@pytest.mark.parametrize("title, level", [
    # "Manager" in a product or project title names the function, not a team.
    ("Senior Product Manager - Product & Experience", "senior"), ("Product Manager", "unknown"),
    ("Technical Project Manager", "unknown"), ("Group Product Manager", "lead"), ("Engineering Manager", "lead"),
    ("Director of Product, Workflows", "principal"),
])
def test_product_titles_are_not_all_leads(title, level):
    assert classify_seniority(title) == level


def test_a_range_after_the_word_experience_is_read_as_a_range():
    # Read as 7 before 2026-10-07: the pattern starting at "Experience" got past
    # the range's mask and took its upper end, so the level was lead, not senior.
    title, text = "Staff Commissioning Engineer, Mechanical", "- Experience: 5-7+ years in data center commissioning."
    assert experience_level_years(title, text) == 6
    assert classify_seniority("Commissioning Engineer", "", None, experience_level_years(title, text)) == "senior"


def test_a_year_range_places_the_level_at_its_middle():
    # Was junior: "2-5 years" gated on 2 and read the level from it too.
    title, text = "Security Engineer, Corporate Security", "Typically 2–5 years of experience in corporate security."
    assert extract_experience(title, text)["years"] == 2
    assert experience_level_years(title, text) == 3
    assert classify_seniority(title, "", None, experience_level_years(title, text)) == "mid"


@pytest.mark.parametrize("title, provider, years, level", [
    ("Senior Software Engineer", None, None, "senior"), ("Sr. Data Engineer", None, None, "senior"),
    ("Software Engineer II", None, None, "mid"), ("Software Engineer I", None, None, "junior"),
    ("Associate Director, Engineering", None, None, "principal"), ("Graduate Software Engineer", None, None, "entry"),
    ("Werkstudent Softwareentwicklung", None, None, "intern"), ("Engineering Manager", None, None, "lead"),
    ("Software Engineer", "Mid-Senior level", None, "mid"), ("Software Engineer", "Entry-Level, Junior", None, "entry"),
    # The brief's case: a plain title that asks for five years is not entry level.
    ("Software Engineer", None, 5, "senior"), ("Software Engineer", None, None, "unknown"),
])
def test_seniority(title, provider, years, level):
    assert classify_seniority(title, "", provider, years) == level


def test_an_internship_named_only_in_the_employment_type():
    assert posting("Platform Developer", "Build our platform.", employment="INTERN").seniority == "intern"


# ------------------------------------------------ eligibility, language, PhD

@pytest.mark.parametrize("text, codes", [
    ("You must be authorized to work in the United States.", ["us"]),
    ("Candidates must have the right to work in the UK.", ["gb"]),
    ("You do not need to be authorized to work in the US; we hire globally.", []),
    ("Remote, open worldwide.", []),
])
def test_work_authorisation_in_the_body(text, codes):
    assert list(posting("Engineer", text).work_authorisation) == codes


def test_sponsorship_refusal():
    assert posting("Engineer", "We are unable to sponsor visas for this role.").no_sponsorship
    assert not posting("Engineer", "Visa sponsorship is available.").no_sponsorship


@pytest.mark.parametrize("title, text, languages", [
    ("Frontend Developer", "Requirements: Fluent in English and German.", ("de",)),
    ("AI Tutor - Bulgarian", "Help train models.", ("bg",)),
    ("Engineer", "Requirements: excellent written English.", ()),
    ("Engineer", "Requirements: Python.\nNice to have: German.", ()),
])
def test_working_language(title, text, languages):
    assert posting(title, text).languages == languages


def test_phd_required_only_without_an_alternative():
    assert posting("Research Scientist", "Requirements: PhD in Machine Learning.").phd == "required"
    assert posting("ML Engineer", "Requirements: MS or PhD in Computer Science.").phd == "preferred"


def test_content_hash_mirrors_sql_concat_ws():
    # md5(concat_ws('|', 'T', NULL, 'Senior', NULL)) skips the NULLs.
    assert content_hash("T", None, "Senior", None) == content_hash("T", "Senior", None, None)
    assert content_hash("T", "desc", None, None) != content_hash("T", "desc2", None, None)


# ------------------------------------------------------------------ the CV

@pytest.mark.parametrize("start, end, months", [
    ("Jan 2024", "Mar 2024", 3), ("01/2024", "12/2024", 12), ("2024-06", "Present", 28),
    ("Jan 2023 - Mar 2023", None, 3), ("2022", "2023", 12), ("sometime", "Present", None),
])
def test_position_months(start, end, months):
    covered = position_months(start, end, TODAY)
    assert (len(covered) if covered else None) == months


def test_years_per_track_merge_overlaps_and_halve_internships():
    candidate = Candidate.from_cv({
        "title": "Software Engineer", "skills": ["Python"],
        "experience": [
            {"role": "Software Engineer", "start_date": "Sep 2025", "end_date": "Present"},
            {"role": "Freelance Web Developer", "start_date": "Jan 2026", "end_date": "Present"},   # overlaps
            {"role": "Software Engineering Intern", "start_date": "Jan 2025", "end_date": "Jun 2025"},
            {"role": "Waiter", "start_date": "2020", "end_date": "2022"},
        ]}, LocationPreferences(country_code="ke"), TODAY)
    assert candidate.years["software"] == pytest.approx(1.3, abs=0.05)   # 13 months + half of 6
    assert candidate.years["ml"] == 0.0 and candidate.years["any"] > candidate.years["software"]
    assert candidate.level("software") == "junior" and candidate.level("ml") == "entry"


def test_without_dates_the_label_is_the_fallback():
    candidate = Candidate.from_cv({"title": "Data Scientist", "skills": [], "experience_level": "Senior Level"},
                                  LocationPreferences(country_code="ke"), TODAY)
    assert candidate.years["ml"] == 6.0 and candidate.years["software"] == 0.0


def test_families_come_from_title_skills_and_degree():
    candidate = Candidate.from_cv({"title": "Software Engineer", "skills": ["React", "Next.js", "Node.js", "Express"],
                                   "education": [{"course_title": "BSc Data Science"}]},
                                  LocationPreferences(country_code="ke"), TODAY)
    assert candidate.families["software_engineering"] == 1.0
    assert candidate.families["full_stack"] == 0.8 and candidate.families["machine_learning"] == 0.6


def test_a_kenyan_cv_speaks_english_and_swahili():
    candidate = Candidate.from_cv({"title": "Engineer", "skills": ["French (B2)"]},
                                  LocationPreferences(country_code="ke"), TODAY)
    assert candidate.languages == {"en", "sw", "fr"}
