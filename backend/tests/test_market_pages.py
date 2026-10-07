"""
GET /market/page/entry-level-software: what entry level software jobs ask for.

Pure: fixture rows, no database. The live read is covered by the local
database test in test_market_look.py, which builds both from one read.
"""
import json
from datetime import datetime, timezone

import pytest
from fastapi.testclient import TestClient

import main
from src.jobpool import market_look as ml
from src.jobpool import market_pages as mp

TAKEN = datetime(2026, 10, 7, 9, 0, tzinfo=timezone.utc)
SECRET = "The whole ad, which never leaves the server"


def row(company, title, family="backend", seniority="junior", thin=False, required=("python",), preferred=(),
        mentioned=(), provider="greenhouse", location="Austin, TX", remote=None, years=None, years_kind="unstated"):
    return {"provider": provider, "company": company, "title": title, "location": location, "remote": remote,
            "url": f"https://jobs.example.com/{company}/{title}", "description": SECRET,
            "posted_at": datetime(2026, 10, 6, tzinfo=timezone.utc),
            "profile": {"family": family, "seniority": seniority, "thin": thin, "years": years,
                        "years_kind": years_kind, "required": list(required), "preferred": list(preferred),
                        "mentioned": list(mentioned)}}


# ------------------------------------------------------------ definitions

@pytest.mark.parametrize("title, expected", [
    ("Software Engineering Intern", True),
    ("Summer 2027 Internship - Backend", True),
    ("Werkstudent Softwareentwicklung", True),
    ("Senior Year Intern, Platform", True),               # an internship whatever else it says
    ("New Grad Software Engineer", True),
    ("Graduate Software Engineer", True),
    ("Entry Level Developer", True),
    ("Entry-level Developer", True),
    ("Early Career Engineer", True),
    ("Junior Frontend Developer", True),
    ("Jr. iOS Engineer", True),
    ("Graduate Program Manager", False),                 # a manager of a graduate programme
    ("Senior Software Engineer", False),
    ("Staff Engineer, Junior Talent Platform", False),
    ("Software Engineer", False),
    ("Internal Tools Engineer", False),                  # "internal" is not "intern"
    (None, False),
])
def test_the_title_rule(title, expected):
    assert mp.entry_title(title) is expected


@pytest.mark.parametrize("seniority, title, years, kind, expected", [
    ("junior", "Software Engineer", None, "unstated", True),     # the product's level
    ("intern", "Software Engineer", None, "unstated", True),
    ("entry", "Software Engineer", None, "unstated", True),
    ("unknown", "Junior Developer", None, "unstated", True),     # the title
    ("mid", "Software Engineer II", 2, "required", True),        # asks 2 years
    ("unknown", "Software Engineer", 0, "required", True),
    ("mid", "Software Engineer", 3, "required", False),
    ("mid", "Software Engineer", 2, "preferred", False),         # "ideally 2 years" is not what it asks
    ("senior", "Software Engineer", 2, "required", False),       # judged senior: years don't override
    ("unknown", "Software Engineer", None, "unstated", False),
])
def test_entry_level(seniority, title, years, kind, expected):
    assert mp.is_entry_level(row("A", title, seniority=seniority, years=years, years_kind=kind)) is expected


@pytest.mark.parametrize("location, expected", [
    ("Austin, TX", "us"),
    ("New York City Office", "us"),
    ("Remote - US", "us"),
    ("London, UK", "elsewhere"),
    ("Berlin, Germany", "elsewhere"),
    ("Westlands, Nairobi", "elsewhere"),
    ("London; San Francisco, CA", "us"),                 # any US place counts as US
    ("Toronto / Vancouver", "elsewhere"),
    ("Remote", "unknown"),
    ("Hybrid", "unknown"),
    ("", "unknown"),
    (None, "unknown"),
])
def test_place(location, expected):
    assert mp.place(location) == expected


# ------------------------------------------------------------ the page

ROWS = [
    row("Shift", "Junior Backend Developer", required=("c#", ".net"), preferred=("azure",), remote=True),
    row("Shift Ltd", "Junior Backend Developer", required=("c#", ".net")),                # cross-posted: once
    row("Shift", "Software Engineering Intern", family="software_engineering", seniority="intern",
        required=("python", "java"), location="London, UK"),
    row("Acme", "Software Engineer", family="software_engineering", seniority="mid", years=1,
        years_kind="required", required=("javascript", "react"), location="Remote"),
    row("Beta", "New Grad Mobile Engineer", family="mobile", seniority="entry", thin=True, required=("swift",)),
    row("Gamma", "Senior Backend Engineer", seniority="senior", required=("python", "kubernetes", "go")),
    row("Delta", "Staff Engineer", family="software_engineering", seniority="lead",
        required=("kubernetes", "distributed_systems")),
    row("Eps", "Principal Engineer", family="full_stack", seniority="principal", thin=True, required=("go",)),
    row("Zeta", "Software Engineer", family="software_engineering", seniority="mid"),   # neither
    row("Eta", "Junior Data Scientist", family="data_science"),                         # not software
    row("Theta", "Junior Developer", provider="url"),                                   # someone's pasted link
]


def test_counts_the_way_the_product_counts():
    out = mp.entry_level_software(ROWS, TAKEN)
    assert out["taken_at"] == "2026-10-07T09:00:00Z" and out["families"] == list(mp.SOFTWARE)
    assert (out["jobs"], out["readable"]) == (4, 3)              # Shift once, Beta thin, Eta and Theta out
    assert out["employers"] == 3                                 # Shift and Shift Ltd are one employer
    assert out["largest_employer"] == {"name": "Shift", "jobs": 2}
    assert out["internships"] == 1 and out["remote"] == 1
    assert out["places"] == {"us": 2, "elsewhere": 1, "unknown": 1}
    assert out["senior"] == {"jobs": 3, "readable": 2}


def test_skills_required_and_any_against_senior():
    out = mp.entry_level_software(ROWS, TAKEN)
    skills = {s["key"]: s for s in out["skills"]}
    assert skills["c#"] == {"key": "c#", "any": 1, "required": 1, "senior_any": 0, "senior_required": 0}
    assert skills["azure"]["any"] == 1 and skills["azure"]["required"] == 0      # preferred: asked, not required
    assert skills["python"]["senior_any"] == 1
    assert "swift" not in skills                                                 # thin jobs say nothing of skills
    assert out["required_median"] == {"entry": 2.0, "senior": 2.5}
    assert set(out["names"]) >= set(skills) and out["names"]["c#"] == "C#"


def test_contrast_takes_both_directions():
    out = mp.entry_level_software(ROWS, TAKEN)
    keys = [c["key"] for c in out["contrast"]]
    assert "kubernetes" in keys and "c#" in keys
    assert keys.index("c#") < keys.index("kubernetes")           # entry leaning first
    assert len(keys) <= 2 * mp.CONTRAST_EACH_WAY


def test_titles_carry_no_ad_text():
    out = mp.entry_level_software(ROWS, TAKEN)
    assert SECRET not in json.dumps(out)
    assert ["Software Engineering Intern", "Shift", "intern", None] in out["titles"]
    assert ["Software Engineer", "Acme", "mid", 1] in out["titles"]
    assert all(len(t) == 4 for t in out["titles"])


def test_titles_stop_at_forty_spread_over_employers():
    rows = [row("Bigco", f"Junior Dev {i}") for i in range(60)] + [row(f"Small {i}", "Junior Dev") for i in range(5)]
    titles = mp.entry_level_software(rows, TAKEN)["titles"]
    assert len(titles) == mp.TITLES and {f"Small {i}" for i in range(5)} <= {t[1] for t in titles}


def test_publishable_only_from_100_readable_jobs():
    def jobs(n):
        return [row(f"C{i}", "Junior Developer") for i in range(n)] + [row("T", "Junior Dev", thin=True)]
    assert mp.entry_level_software(jobs(99), TAKEN)["publishable"] is False      # 100 jobs, 99 readable
    assert mp.entry_level_software(jobs(100), TAKEN)["publishable"] is True


def test_an_empty_pool():
    out = mp.entry_level_software([], TAKEN)
    assert (out["jobs"], out["publishable"], out["largest_employer"], out["contrast"]) == (0, False, None, [])
    assert out["required_median"] == {"entry": None, "senior": None}


# ------------------------------------------------------------ the route

def _built(monkeypatch):
    monkeypatch.setattr(ml, "_refresh_in_background", lambda: None)
    monkeypatch.setattr(ml, "compute", lambda: {"look": ml.aggregate(ROWS, TAKEN), "pages": mp.build(ROWS, TAKEN)})
    ml.forget()
    ml.refresh()


def test_the_route_serves_the_built_page(monkeypatch):
    _built(monkeypatch)
    r = TestClient(main.app).get("/market/page/entry-level-software", headers={"Accept-Encoding": "gzip"})
    ml.forget()
    assert r.status_code == 200 and r.json()["jobs"] == 4
    assert r.headers["cache-control"] == "public, max-age=3600"


def test_the_page_and_the_count_come_from_one_read(monkeypatch):
    _built(monkeypatch)
    look, page = ml.look(), ml.page("entry-level-software")
    ml.forget()
    assert look["taken_at"] == page["taken_at"]
    software_junior = sum(look["families"][f]["seniority"]["junior"] for f in mp.SOFTWARE if f in look["families"])
    assert page["jobs"] >= software_junior                       # the product's junior level is inside the page's


def test_an_unknown_page_is_404_without_reading_anything(monkeypatch):
    def never():
        raise AssertionError("an unknown page must not read the count")
    monkeypatch.setattr(ml, "_built", never)
    client = TestClient(main.app)
    assert client.get("/market/page/nope").status_code == 404
    assert client.get("/market/page/" + "x" * 500).status_code == 404


def test_before_the_first_build_the_page_says_wait(monkeypatch):
    monkeypatch.setattr(ml, "is_configured", lambda: True)
    monkeypatch.setattr(ml, "_refresh_in_background", lambda: None)
    ml.forget()
    r = TestClient(main.app).get("/market/page/entry-level-software")
    assert r.status_code == 503 and int(r.headers["retry-after"]) > 0
