"""
A market page's `story`: the counts its editorial sections are written from,
the breadth rule, and the thresholds that leave a section out. Pure: fixture
rows, no database.
"""
from datetime import datetime, timezone

from src.jobpool import market_pages as mp
from src.jobpool import market_story as ms

TAKEN = datetime(2026, 10, 7, 5, 0, tzinfo=timezone.utc)


def row(company, title="Junior Developer", family="backend", seniority="junior", required=(), mentioned=(),
        thin=False, years=None, kind="unstated"):
    return {"provider": "greenhouse", "company": company, "title": title, "location": "Austin, TX", "remote": None,
            "url": f"https://jobs.example.com/{company}/{title}", "posted_at": TAKEN,
            "profile": {"family": family, "seniority": seniority, "thin": thin, "years": years, "years_kind": kind,
                        "required": list(required), "preferred": [], "mentioned": list(mentioned)}}


def story(jobs, compare=(), edges=ms.ENTRY_YEARS, min_readable=1, levels=None):
    return ms.story(list(jobs), list(compare), mp.employer, mp.is_internship, edges, min_readable, levels)


def test_the_breadth_rule():
    assert ms.broad({"key": "ruby", "employers": ms.BREADTH_EMPLOYERS}) is True
    assert ms.broad({"key": "ruby", "employers": ms.BREADTH_EMPLOYERS - 1}) is False
    assert ms.broad({"key": "ruby"}) is False


def test_employers_per_skill_count_one_employer_however_it_is_spelt():
    jobs = [row("Shift", required=("python",)), row("Shift Ltd", "Junior Dev 2", required=("python",)),
            row("Acme", required=("python",))]
    python = story(jobs)["skills"][0]
    assert (python["key"], python["any"], python["employers"]) == ("python", 3, 2)


def test_one_employer_cannot_lead_the_page():
    # Ruby is named most, but by jobs at one employer; Python by ten employers.
    jobs = ([row("Stripe", f"Junior Dev {i}", required=("ruby",)) for i in range(20)]
            + [row(f"C{i}", required=("python",)) for i in range(ms.BREADTH_EMPLOYERS)])
    out = story(jobs)
    assert out["skills"][0]["key"] == "ruby" and out["skills"][0]["broad"] is False
    assert out["headline"] == "python"
    assert out["squares"] == {"skill": 10, "both": 0, "internship": 0, "neither": 20}


def test_squares_mark_internships_and_the_headline_skill():
    jobs = ([row(f"C{i}", "Software Engineering Intern", seniority="intern", required=("python",)) for i in range(10)]
            + [row(f"D{i}", required=("go",)) for i in range(4)]
            + [row("E", "Data Intern", seniority="intern", thin=True, required=("python",))])   # thin: names nothing
    assert story(jobs)["squares"] == {"skill": 0, "both": 10, "internship": 1, "neither": 4}


def test_languages_per_job_and_the_language_bars():
    many = [row(f"C{i}", required=("python", "go", "sql"), mentioned=("java",)) for i in range(10)]
    few = [row("Solo", "Junior Dev 1", required=("rust",)), row("Solo", "Junior Dev 2", required=("aws",))]
    out = story(many + few)
    assert out["languages"]["per_job"] == [1, 1, 0, 10]                   # none, one, two, three or more
    assert out["languages"]["bars"] == ["go", "java", "python", "sql"]     # Rust: one employer, no bar
    assert "languages" in out["sections"]


def test_years_buckets_and_the_years_section():
    jobs = ([row(f"C{i}", years=2, kind="required") for i in range(ms.MIN_YEARS_STATED - 1)]
            + [row("D", years=7, kind="required"), row("E", years=3, kind="preferred"), row("F")])
    years = story(jobs)["years"]
    assert [b["jobs"] for b in years["buckets"]] == [0, 0, ms.MIN_YEARS_STATED - 1, 1]
    assert years["buckets"][-1] == {"from": 3, "to": None, "jobs": 1}
    assert (years["stated"], years["unstated"]) == (ms.MIN_YEARS_STATED, 2)    # "ideally 3 years" is not stated
    assert "years" in story(jobs)["sections"]
    assert "years" not in story(jobs[1:])["sections"]


def test_role_years_buckets():
    jobs = [row("A", years=0, kind="required"), row("B", years=4, kind="required"), row("C", years=12, kind="required")]
    buckets = story(jobs, edges=ms.ROLE_YEARS)["years"]["buckets"]
    assert [(b["from"], b["to"], b["jobs"]) for b in buckets] == [(0, 2, 1), (3, 4, 1), (5, 7, 0), (8, None, 1)]


def test_the_contrast_needs_breadth_both_directions_and_a_comparison_set():
    page = ([row(f"C{i}", required=("javascript",)) for i in range(10)]
            + [row(f"D{i}", required=("kubernetes",)) for i in range(10)]
            + [row("Stripe", f"Junior Dev {i}", required=("ruby",)) for i in range(10)])
    senior = [row(f"S{i}", "Senior Dev", seniority="senior", required=("kubernetes",)) for i in range(100)]
    out = story(page, senior)
    assert out["contrast"] == ["javascript", "kubernetes"]      # Ruby leans to the page too, but one employer names it
    assert "contrast" in out["sections"] and out["compare"] == {"jobs": 100, "readable": 100}
    assert story(page, senior[:99])["contrast"] == []            # too few senior jobs to compare with
    only_one_way = [row(f"S{i}", "Senior Dev", seniority="senior") for i in range(100)]
    assert story(page[:10], only_one_way)["contrast"] == []      # nothing leans the other way: no contrast


def test_categories_beyond_the_languages():
    jobs = [row(f"C{i}", required=("aws", "gcp", "python")) for i in range(ms.MIN_CATEGORY_JOBS)]
    cats = story(jobs)["categories"]
    assert cats == [{"category": "cloud", "jobs": ms.MIN_CATEGORY_JOBS, "skills": ["aws", "gcp"]}]
    assert story(jobs[:-1])["categories"] == []                  # one job short


def test_levels_section_only_on_a_page_that_counts_them():
    jobs = [row(f"C{i}") for i in range(10)]
    assert "levels" not in story(jobs)["sections"]
    assert "levels" in story(jobs, levels={"junior": 50, "mid": 0, "senior": 0, "unstated": 9})["sections"]
    assert "levels" not in story(jobs, levels={"junior": 49, "mid": 0, "senior": 0, "unstated": 90})["sections"]


def test_under_the_100_rule_no_section_and_no_headline():
    jobs = [row(f"C{i}", required=("python", "go", "sql", "java")) for i in range(20)]
    out = story(jobs, min_readable=100)
    assert out["sections"] == [] and out["headline"] is None
    assert story(jobs)["sections"][0] == "hiring"


def test_every_page_carries_its_story_and_names_its_skills():
    rows = [row(f"C{i}", required=("python",)) for i in range(12)] + [
        row(f"M{i}", "ML Engineer", family="machine_learning", seniority="senior", required=("pytorch",)) for i in range(12)]
    pages = mp.build(rows, TAKEN)
    assert pages["entry-level-software"]["story"]["headline"] is None              # 12 jobs: under the 100 rule
    assert pages["machine-learning"]["story"]["compare"] == {"jobs": 12, "readable": 12}   # senior jobs, same family
    assert pages["machine-learning"]["internships"] == 0
    for page in pages.values():
        assert {s["key"] for s in page["story"]["skills"]} <= set(page["names"])


# ------------------------------------------------------------ the lead finding (the page's H1)

def lead(*shares, readable=100):
    """Skills that may lead, most named first, each named by `share` of `readable` jobs."""
    return [{"key": f"s{i}", "any": share, "employers": ms.BREADTH_EMPLOYERS} for i, share in enumerate(shares)]


NO_YEARS = {"buckets": [], "stated": 0, "unstated": 0}


def years(*counts):
    """Entry level buckets 0, 1, 2, 3+ with these job counts."""
    edges = ms.ENTRY_YEARS
    buckets = [{"from": e, "to": (edges[i + 1] - 1 if i + 1 < len(edges) else None), "jobs": n}
               for i, (e, n) in enumerate(zip(edges, counts))]
    return {"buckets": buckets, "stated": sum(counts), "unstated": 0}


def test_a_fraction_only_where_it_is_honest():
    assert ms.fraction(66.6) == [2, 3] and ms.fraction(60.0) == [3, 5] and ms.fraction(91.0) == [9, 10]
    assert ms.fraction(65.0) == [2, 3]                       # 1.7 points under two in three
    assert ms.fraction(63.0) is None                         # between three in five and two in three: say 63%
    assert ms.fraction(85.0) is None


def test_years_lead_when_one_number_is_most_of_the_jobs_that_state_one():
    assert ms.finding(lead(70), 100, years(7, 10, 55, 0)) == {"kind": "years", "years": 2, "jobs": 55, "of": 72}
    # 60% exactly still leads; just under it, the skills do.
    assert ms.finding(lead(70), 100, years(10, 10, 30, 0))["kind"] == "years"
    assert ms.finding(lead(70), 100, years(11, 10, 29, 0))["kind"] == "share"
    # "3 or more" is a range, not one number; and too few stating years is no section, so no lead.
    assert ms.finding(lead(70), 100, years(0, 0, 0, 40))["kind"] == "share"
    assert ms.finding(lead(70), 100, years(0, 0, ms.MIN_YEARS_STATED - 1, 0))["kind"] == "share"


def test_a_share_from_60_percent_leads_as_a_fraction_or_a_percentage():
    assert ms.finding(lead(67, 45), 100, NO_YEARS) == {"kind": "share", "skills": ["s0"], "jobs": [67], "of": 100,
                                                       "fraction": [2, 3]}
    assert ms.finding(lead(63, 45), 100, NO_YEARS)["fraction"] is None
    assert ms.finding(lead(59, 30), 100, NO_YEARS)["kind"] == "leads"


def test_two_skills_within_two_points_are_almost_tied():
    assert ms.finding(lead(36, 34), 100, NO_YEARS) == {"kind": "tied", "skills": ["s0", "s1"], "jobs": [36, 34], "of": 100}
    assert ms.finding(lead(36, 33), 100, NO_YEARS)["kind"] == "leads"


def test_two_close_skills_near_half_each_appear_in_nearly_or_about_half():
    assert ms.finding(lead(48, 44), 100, NO_YEARS)["approx"] == "nearly"      # both under half
    assert ms.finding(lead(54, 51), 100, NO_YEARS)["approx"] == "about"       # 54% is never "nearly half"
    assert ms.finding(lead(46, 39), 100, NO_YEARS)["kind"] == "half"          # 39% is not near half
    assert ms.finding(lead(58, 54), 100, NO_YEARS)["kind"] == "leads"         # 58% is not about half


def test_half_from_45_to_55_percent_else_the_lead_with_its_count():
    assert ms.finding(lead(55, 20), 100, NO_YEARS)["kind"] == "half"
    assert ms.finding(lead(45, 20), 100, NO_YEARS)["kind"] == "half"
    assert ms.finding(lead(44, 20), 100, NO_YEARS) == {"kind": "leads", "skills": ["s0"], "jobs": [44], "of": 100}
    assert ms.finding(lead(56), 100, NO_YEARS)["kind"] == "leads"


def test_no_skill_that_may_lead_is_no_finding():
    assert ms.finding([], 100, NO_YEARS) is None


def test_the_skill_that_defines_the_job_type_and_a_narrow_skill_never_lead():
    jobs = ([row(f"C{i}", required=("machine learning", "python")) for i in range(10)]
            + [row(f"D{i}", required=("machine learning",)) for i in range(5)]
            + [row("Stripe", f"Junior Dev {i}", required=("ruby",)) for i in range(15)])
    out = ms.story(jobs, [], mp.employer, mp.is_internship, ms.ROLE_YEARS, 1, defining=("machine learning",))
    assert out["headline"] == "python"                                    # not machine learning, not Ruby (one employer)
    assert out["finding"]["skills"] == ["python"]
    assert story(jobs)["headline"] == "machine learning"                   # on a page it doesn't define, it leads
    assert story(jobs, min_readable=100)["finding"] is None                # under the 100 rule: no finding


def test_the_machine_learning_ai_and_devops_pages_skip_their_own_skill():
    assert mp.DEFINING["machine-learning"] == ("machine learning",)
    rows = [row(f"M{i}", "ML Engineer", family="machine_learning", seniority="mid", required=("machine learning", "pytorch"))
            for i in range(mp.MIN_READABLE)]
    page = mp.build(rows, TAKEN)["machine-learning"]
    assert page["story"]["headline"] == "pytorch"
    assert page["inline_names"] == {"machine learning": "machine learning"}   # mid sentence, lower case
