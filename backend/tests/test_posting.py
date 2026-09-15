"""The canonical posting-text helpers every job path shares."""
from types import SimpleNamespace

import pytest

from src.jobpool import posting


def test_timestamps_normalise_to_utc():
    assert posting.iso_utc(1711403416463).startswith("2024-03-25T")   # Lever: epoch ms
    assert posting.iso_utc(1789390832).startswith("2026-")            # Arbeitnow: epoch s
    assert posting.iso_utc("2026-09-09T10:50:29-04:00") == "2026-09-09T14:50:29+00:00"
    assert posting.iso_utc("not a date") is None


@pytest.mark.parametrize("raw, expected", [
    ("&lt;p&gt;Python &amp;amp; SQL&lt;/p&gt;", "Python & SQL"),         # Greenhouse: escaped HTML
    ("<p>Python &amp; SQL</p>", "Python & SQL"),
    ("Plain &amp; simple", "Plain & simple"),
    ("<script>x()</script><p>Kept</p>", "Kept"),
    ("&amp;lt;p&amp;gt;Twice escaped&amp;lt;/p&amp;gt;", "Twice escaped"),
    ("<ul><li>Real</li></ul>&lt;li&gt;Escaped inside&lt;/li&gt;", "Real\n\nEscaped inside"),
    ("<p>Kept</p>Cut off <span style=\"font-size:10pt;", "Kept\n\nCut off"),
    ("", ""),
    (None, None),
])
def test_html_to_text(raw, expected):
    assert posting.html_to_text(raw) == expected


def test_html_keeps_paragraphs_for_skill_extraction():
    text = posting.html_to_text("<h3>About</h3><p>We build.</p><h3>Requirements</h3><ul><li>Python</li><li>SQL</li></ul>")
    assert text.split("\n\n") == ["About", "We build.", "Requirements", "Python", "SQL"]


@pytest.mark.parametrize("description, expected", [
    ("Requirements: 3+ years of Python experience.", {"years": 3, "kind": "required"}),
    ("Requirements: Python. Nice to have: 5+ years in fintech.", {"years": 5, "kind": "preferred"}),
    ("We need 2-4 years building web applications.", {"years": 2, "kind": "required"}),
    ("Founded 10 years ago, we build tools.", {"years": None, "kind": "unstated"}),
])
def test_extract_experience(description, expected):
    assert posting.extract_experience("Engineer", description) == expected


def test_display_values():
    job = SimpleNamespace(salary_min=120000, salary_max=150000, salary_currency="USD", salary_period="per-year-salary",
                          raw={"workplaceType": "Hybrid"}, title="Engineer", location="Nairobi", description="", remote=False)
    assert posting.salary_text(job) == "USD 120,000–150,000 / year"
    assert posting.workplace(job) == "hybrid"
    assert [posting.employment_text(v) for v in ("FULL_TIME", "FullTime", "Contract")] == ["Full-time", "Full-time", "Contract"]


def test_match_skills_skips_non_skills_and_soft_skills():
    vocabulary = ["Python (Programming Language)", "Software Engineering", "Collaboration", "SQL (Programming Language)", "R"]
    found = posting.match_skills("Python and SQL. Software engineering, collaboration. R&D.", vocabulary)
    assert found == ["Python (Programming Language)", "SQL (Programming Language)"]
