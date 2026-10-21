"""
look["ai_titles"]: jobs with AI in the title, in every family, sorted by what
the title says the job is for. Pure; no database.
"""
from datetime import datetime, timezone

import pytest

from src.jobpool import ai_titles
from src.jobpool import market_look as ml

SECRET = "This is the full ad text and must never leave the server"


def row(title, company="Acme", family="ai", seniority="senior", provider="greenhouse"):
    return {"provider": provider, "company": company, "title": title, "description": SECRET,
            "url": "https://jobs.example.com/1", "posted_at": datetime(2026, 10, 3, tzinfo=timezone.utc),
            "profile": {"family": family, "seniority": seniority, "thin": False, "required": [], "preferred": [],
                        "mentioned": []}}


@pytest.mark.parametrize("title", [
    "AI Product Counsel", "Senior ML Engineer", "KI-Compliance-Manager:in (m/w/d)", "Werkstudent AI Engineer (all genders)",
    "Agentic Operator, Growth Marketing", "Strategist, Agent Development", "LLM Trainer", "GenAI Platform Engineer",
    "Software Engineer (AI)", "Data & A.I. Consultant", "Machine Learning Research Intern"])
def test_titles_that_name_ai(title):
    assert ai_titles.names_ai(title)


@pytest.mark.parametrize("title", [
    "Customer Service Agent (Live Chat)", "VIP Corporate Travel Agent", "Email Marketing Manager", "HTML Developer",
    "Maintenance Engineer", "Kitchen Assistant", "Senior Backend Engineer"])
def test_titles_that_do_not(title):
    assert not ai_titles.names_ai(title)


@pytest.mark.parametrize("title, kind", [
    ("Senior Research Scientist - AI Security", "research"),
    ("Forward Deployed AI Engineer", "customers"),
    ("AI Product Counsel", "bounds"),
    ("AI Enablement and Learning Specialist", "teach"),
    ("Graduate Machine Learning Engineer 2027", "build"),
    ("Agent Experience Designer", "product"),
    ("AI Transformation Strategist", "change"),
    ("Staff Software Engineer, AI Platform", "infra"),
    ("Applied AI Engineer", "build"),
    ("AI Video Content Creator", "other"),
])
def test_the_first_matching_kind_wins(title, kind):
    assert ai_titles.kind(title) == kind


ROWS = [
    row("AI Product Counsel", "Handshake", family="non_tech"),
    row("Forward Deployed AI Engineer", "Palantir", family="solutions", seniority="junior"),
    row("Forward Deployed AI Engineer", "Palantir Inc", family="solutions", seniority="junior"),  # cross-posted
    row("Applied AI Engineer", "OpenAI"),
    row("Applied AI Engineer", "Mistral", seniority="intern"),
    row("AI Engineer", "Someone", provider="url"),                       # a user's pasted link: not counted
    row("Senior Backend Engineer", "Beta", family="backend"),
    row("Customer Service Agent", "Gamma", family="non_tech"),
]


def test_counts_every_family_once_per_role_and_daily_fetch_only():
    body = ai_titles.count(ROWS)
    assert (body["jobs"], body["of"], body["early"], body["internships"]) == (4, 6, 2, 1)
    assert body["families"] == [["ai", 2, 2], ["non_tech", 1, 2], ["solutions", 1, 1]]


def test_kinds_keep_their_order_sum_to_jobs_and_sample_one_title_per_employer():
    body = ai_titles.count(ROWS + [row("Applied AI Engineer, Startups", "OpenAI")])
    assert [k["key"] for k in body["kinds"]] == [key for key, _ in ai_titles.KINDS] + ["other"]
    assert sum(k["jobs"] for k in body["kinds"]) == body["jobs"]
    build = next(k for k in body["kinds"] if k["key"] == "build")
    assert (build["jobs"], build["early"], build["internships"]) == (3, 1, 1)
    assert [t[1] for t in build["titles"]] == ["OpenAI", "Mistral"]


def test_titles_stop_at_eight_a_kind():
    rows = [row("Applied AI Engineer", f"Company {i}") for i in range(12)]
    build = next(k for k in ai_titles.count(rows)["kinds"] if k["key"] == "build")
    assert build["jobs"] == 12 and len(build["titles"]) == ai_titles.TITLES_PER_KIND


def test_the_publication_carries_it_without_ad_text():
    body = ml.bodies(ROWS, datetime(2026, 10, 19, 4, 45, tzinfo=timezone.utc))
    assert body["look"]["ai_titles"] == ai_titles.count(ROWS)
    assert SECRET not in str(body["look"]["ai_titles"])
