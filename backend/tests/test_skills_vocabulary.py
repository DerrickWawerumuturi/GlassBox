"""The vocabulary as data: no spelling claimed twice, no contradiction with the rejected list, the 2026-10-01
additions read, and the 2026-10-05 rules for words that are skills only in context."""
from collections import defaultdict

import pytest

from src.matching import discover, skills


def test_every_spelling_belongs_to_one_skill():
    # The loader keeps the last key for a repeated alias without a word, so a
    # spelling added to a second skill would silently move between them.
    owners = defaultdict(set)
    for line in skills.VOCABULARY_FILE.read_text(encoding="utf-8").splitlines():
        if line.strip() and not line.startswith("#"):
            key, _, _, aliases, _ = (part.strip() for part in line.split("|"))
            for alias in filter(None, (a.strip().lower() for a in aliases.split(","))):
                owners[alias].add(key)
    assert {alias: keys for alias, keys in owners.items() if len(keys) > 1} == {}


def test_nothing_turned_down_is_also_a_skill():
    clashes = [term for term in discover.rejected() if skills.canonical(term) or skills.find_skills(term)]
    assert clashes == []


def test_a_design_posting_reads_as_design():
    text = ("Requirements: strong typography and visual design, Adobe Photoshop and Illustrator, "
            "prototyping in Figma, contributing to our design system, and usability testing.")
    assert set(skills.find_skills(text)) >= {"typography", "visual design", "adobe creative suite", "prototyping",
                                             "figma", "design systems", "user research"}


def test_spellings_of_one_skill_land_on_one_key():
    assert {skills.canonical(n) for n in ("Photoshop", "Adobe Illustrator", "InDesign")} == {"adobe creative suite"}
    assert {skills.canonical(n) for n in ("usability testing", "UX research")} == {"user research"}
    assert {skills.canonical(n) for n in ("A/B testing", "experimental design")} == {"statistics"}
    assert {skills.canonical(n) for n in ("PMP", "PRINCE2")} == {"project management"}
    assert skills.canonical("Agentic AI") == "ai agents"


def test_rest_apis_need_building_not_a_passing_mention():
    # "API" alone made REST APIs a top skill in nearly every family (2026-10-01).
    assert "rest api" in skills.find_skills("You will build APIs in Python.")
    assert "rest api" in skills.find_skills("Experience with RESTful services and API design.")
    assert "rest api" not in skills.find_skills("Our APIs serve millions; integrate with the OpenAI API.")


# Real sentences from the live pool, 2026-10-05: Observability topped the backend
# family (50 of 126 jobs) mostly from the word used as a quality in a list.
@pytest.mark.parametrize("text", [
    "Improve debugging, observability, and test coverage using pytest, RSpec, and related frameworks.",
    "Write thoughtful code reviews, solid tests, and pay attention to observability and performance in your work.",
    "Improve the reliability, latency, observability, and quality of production systems.",
    "Set engineering standards around code quality, testing, deployment, observability, and system reliability.",
])
def test_observability_as_a_quality_is_not_a_skill(text):
    assert "observability" not in skills.find_skills(text)


@pytest.mark.parametrize("text", [
    "Experience with observability tools such as Prometheus and Grafana.",
    "Familiarity with observability stacks (logs, metrics, traces) and telemetry systems.",
    "Observability using metrics, logs, traces, dashboards, and alerts.",
    "Experience with observability and telemetry solutions, particularly OpenTelemetry.",
    "Familiarity with LaunchDarkly, feature flagging, or observability tooling is a plus.",
    "Our stack is Go, AWS, Terraform, and Datadog.",
    "You've built monitoring and observability systems that make production health measurable.",
])
def test_observability_tooling_and_practice_still_count(text):
    assert "observability" in skills.find_skills(text)


def test_observability_on_a_cv_is_still_a_skill():
    # The context rule is for prose; a CV's skill list names it on purpose.
    assert skills.canonical("Observability") == "observability"
    assert skills.resolve_all(["Observability", "Grafana"])[0] == {"observability"}


def test_a_spelling_stops_at_a_comma():
    # "product, design and engineering" named Product design in 415 places (2026-10-05).
    assert skills.find_skills("Partner closely with product, design, and engineering.") == []
    assert skills.find_skills("Work with data, analytics and finance teams.") == []
    assert skills.find_skills("Strong product design and data analytics skills.") == ["product design", "data analysis"]
    # Hyphens and slashes still join one spelling.
    assert skills.find_skills("React-Native, CI/CD and infrastructure-as-code.") == ["react native", "ci/cd", "terraform"]


def test_unity_catalog_is_databricks_not_the_game_engine():
    # 103 Databricks solutions jobs counted Unity (2026-10-07 audit).
    assert skills.find_skills("Govern data with Unity Catalog and Delta Lake.") == ["databricks"]
    assert skills.find_skills("unity-catalog permissions") == []
    assert skills.find_skills("Ship games in Unity and C#.") == ["unity", "c#"]
    assert skills.resolve_all(["Unity Catalog", "Unity"]) == ({"unity"}, ["Unity Catalog"])
