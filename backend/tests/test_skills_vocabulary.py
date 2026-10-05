"""The vocabulary as data: no spelling claimed twice, no contradiction with the rejected list, and the 2026-10-01 additions read."""
from collections import defaultdict

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
