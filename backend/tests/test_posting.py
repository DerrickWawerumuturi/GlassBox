"""The canonical posting-text helpers every job path shares."""
from datetime import datetime, timedelta, timezone
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


def test_display_values():
    job = SimpleNamespace(salary_min=120000, salary_max=150000, salary_currency="USD", salary_period="per-year-salary",
                          raw={"workplaceType": "Hybrid"}, title="Engineer", location="Nairobi", description="", remote=False)
    assert posting.salary_text(job) == "USD 120,000–150,000 / year"
    assert posting.workplace(job) == "hybrid"
    assert [posting.employment_text(v) for v in ("FULL_TIME", "FullTime", "Contract")] == ["Full-time", "Full-time", "Contract"]


def test_relative_dates_become_labelled_estimates_anchored_where_they_were_read():
    seen = datetime(2026, 9, 15, 8, 30, tzinfo=timezone.utc)
    assert posting.posted_estimate("2 days ago", seen) == seen - timedelta(days=2)
    assert posting.posted_estimate("Posted an hour ago", seen) == seen - timedelta(hours=1)
    assert posting.posted_estimate("30+ days ago", seen) == seen - timedelta(days=30)
    assert posting.posted_estimate("yesterday", seen) == seen - timedelta(days=1)
    assert posting.posted_estimate("2026-09-13T00:00:00Z", seen) is None      # absolute: not an estimate
    assert posting.posted_estimate("3 days ago", None) is None
