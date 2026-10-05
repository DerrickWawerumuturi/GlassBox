"""
What we keep of a CV, for a signed-in user (decisions/cv-storage.md): only
what matching and the UI need. Skills, level, years of experience (derived),
education level, location and spoken languages. Never a name, contact
details, links, a summary, or the companies, dates and schools behind them.

    kept_cv(cv)            the profile's CV (`cvs`) and an application's snapshot
    kept_profile(profile)  the parsed profile of the latest CV (`latest_cvs`)

Both carry `derived` (src/matching/candidate.py `derive`): what the dropped
roles, positions and education told matching, worked out before they go.
"""
import re
from datetime import date

from src.matching.candidate import derive

# The CV's own fields that are kept as they are.
CV_KEEP = ("skills", "experience_level", "location", "languages")
# A parsed profile keeps everything but these: the CV's positions (companies,
# dates), its education details, and the parser's free text.
PROFILE_DROP = ("experience", "education", "notes", "job_requirements", "company_preferences")
# Never stored, whatever shape arrives. The test reads this list too.
PERSONAL = ("name", "email", "phone_number", "portfolio", "linkedIn", "professional_summary",
            "experience", "education", "title")

_LEVELS = [
    ("doctorate", r"\bph\.?\s?d\b|\bdoctor|\bdoctorate\b"),
    ("masters", r"\bmaster\w*|\bm\.?sc\b|\bmba\b|\bm\.?eng\b|\bm\.?a\b|\bm\.?s\b"),
    ("bachelors", r"\bbachelor\w*|\bb\.?sc\b|\bb\.?eng\b|\bb\.?tech\b|\bb\.?a\b|\bb\.?s\b|\bundergraduate\b|\bdegree\b"),
    ("diploma", r"\bdiploma\b|\bcertificate\b|\bassociate\b|\bhnd\b"),
    ("secondary", r"\bhigh school\b|\bsecondary\b|\bkcse\b|\ba[- ]levels?\b"),
]


def education_level(cv: dict) -> str | None:
    """The highest education level a CV names: doctorate … secondary, or None."""
    education = cv.get("education")
    if isinstance(education, str):
        texts = [education]
    else:
        texts = [" ".join(filter(None, (e.get("course_title"), e.get("degree"), e.get("school_name"))))
                 for e in education or [] if isinstance(e, dict)]
    text = " ".join(texts).lower()
    return next((level for level, pattern in _LEVELS if re.search(pattern, text)), cv.get("education_level"))


def _derived(cv: dict, today: date | None) -> dict:
    """A CV that already lost its details keeps what was derived before; a full one is derived now."""
    if isinstance(cv.get("derived"), dict) and not cv.get("experience") and not cv.get("education"):
        return cv["derived"]
    return derive(cv, today)


def kept_cv(cv: dict | None, today: date | None = None) -> dict | None:
    if cv is None:
        return None
    kept = {key: cv.get(key) for key in CV_KEEP if cv.get(key) is not None}
    kept["education_level"] = education_level(cv)
    kept["derived"] = _derived(cv, today)
    return kept


def kept_profile(profile: dict, today: date | None = None) -> dict:
    kept = {key: value for key, value in profile.items() if key not in PROFILE_DROP}
    kept["education_level"] = education_level(profile)
    kept["derived"] = _derived(profile, today)
    return kept


def as_cv_shape(kept: dict | None) -> dict | None:
    """A kept CV with the dropped fields empty, so a client expecting the full shape still reads it."""
    if kept is None:
        return None
    return {"name": None, "title": None, "phone_number": None, "email": None, "portfolio": None,
            "linkedIn": None, "professional_summary": None, "experience": [], "education": [],
            "skills": [], "experience_level": None, "location": None, **kept}
