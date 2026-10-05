"""Skills discovery: what is suggested, what is never suggested, how it is ranked. Offline."""
import pytest

from src.matching import discover

REAL_REJECTED = discover.rejected       # before the fixture swaps it out
DICTIONARY = {("calligraphy",): "Calligraphy", ("signage", "design"): "Signage Design", ("workflows",): "Workflows",
              ("adobe", "photoshop"): "Adobe Photoshop", ("acme",): "Acme", ("python",): "Python",
              ("product", "design"): "Product Design", ("observability",): "Observability"}


@pytest.fixture(autouse=True)
def small_dictionary(monkeypatch):
    monkeypatch.setattr(discover, "emsi_hard_skills", lambda: DICTIONARY)
    monkeypatch.setattr(discover, "rejected", lambda: frozenset({"workflows"}))


def found(text, company=None):
    return discover.candidates_in(text, company, DICTIONARY, frozenset({"workflows"}))


def test_unknown_dictionary_terms_and_new_tool_names_are_suggested():
    out = found("Requirements: strong calligraphy, signage design and QuuxDB or Gizmo.js.")
    assert out == {"calligraphy": ("Calligraphy", "dictionary"), "signage design": ("Signage Design", "dictionary"),
                   "quuxdb": ("QuuxDB", "shape"), "gizmo.js": ("Gizmo.js", "shape")}


def test_what_the_vocabulary_knows_is_never_suggested():
    # Python is in skills.txt: whatever EMSI calls it, it is already counted.
    assert found("Requirements: Python and Figma") == {}


def test_a_known_skill_left_uncounted_on_purpose_is_not_suggested():
    # "product, design" is two teams and "observability" here a quality: the
    # vocabulary skipped them, and the report must not offer them back.
    assert found("Requirements: work with product, design and engineering on observability and calligraphy") == \
        {"calligraphy": ("Calligraphy", "dictionary")}


def test_the_employers_own_name_is_not_a_skill():
    assert found("Requirements: experience at Acme with calligraphy", company="Acme Inc") == \
        {"calligraphy": ("Calligraphy", "dictionary")}


def test_turned_down_terms_stay_turned_down():
    assert "workflows" not in found("Requirements: own our workflows and calligraphy")


def test_requirement_sections_are_read_and_the_rest_only_without_them():
    text = "About us: we love calligraphy.\n\nRequirements:\n- Adobe Photoshop"
    assert "photoshop" in discover.requirement_text(text).lower()
    assert "calligraphy" not in discover.requirement_text(text).lower()
    assert "calligraphy" in discover.requirement_text("We love calligraphy and Adobe Photoshop.").lower()


def post(family, text, skills=(), thin=False, company="X"):
    return {"family": family, "company": company, "description": "Requirements:\n" + text,
            "profile": {"thin": thin, "required": list(skills), "preferred": [], "mentioned": []}}


def test_coverage_counts_readable_postings_with_three_or_more_skills():
    posts = [post("design", "", ["figma", "ui/ux design", "html"]), post("design", "", ["figma"]),
             post("design", "", thin=True)]
    [design] = discover.analyse(posts)["families"]
    assert (design["readable"], design["covered_pct"], design["median_skills"]) == (2, 50, 2)


def test_candidates_are_family_specific_and_seen_often_enough():
    posts = ([post("design", "calligraphy and signage design") for _ in range(4)]
             + [post("design", "signage design")]
             + [post("backend", "signage design") for _ in range(5)])
    report = {f["family"]: f for f in discover.analyse(posts)["families"]}
    terms = [c["term"] for c in report["design"]["candidates"]]
    # Calligraphy lives in design only. Signage design is as common in backend
    # postings here, so it says nothing about design and stays out.
    assert terms == ["calligraphy"]
    assert report["design"]["candidates"][0]["postings"] == 4


def test_families_outside_the_audience_are_measured_but_not_mined():
    posts = [post("non_tech", "calligraphy") for _ in range(5)] + [post("design", "x") for _ in range(5)]
    report = {f["family"]: f for f in discover.analyse(posts)["families"]}
    assert report["non_tech"]["readable"] == 5 and report["non_tech"]["candidates"] == []
    named = {f["family"]: f for f in discover.analyse(posts, families={"non_tech"})["families"]}
    assert [c["term"] for c in named["non_tech"]["candidates"]] == ["calligraphy"]


def test_the_rejected_file_reads_terms_and_ignores_comments(tmp_path):
    path = tmp_path / "rejected.txt"
    path.write_text("# header\nWorkflows  # generic\n\nCuriosity\n")
    assert REAL_REJECTED(path) == frozenset({"workflows", "curiosity"})


def test_each_family_carries_its_own_bar():
    report = {f["family"]: f for f in discover.analyse([post("product", "x"), post("design", "x")])["families"]}
    assert (report["product"]["bar"], report["design"]["bar"]) == (60, 80)
