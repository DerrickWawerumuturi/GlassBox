"""
What we keep of a CV (src/matching/kept_cv.py, decisions/cv-storage.md): no
name, contact details, links, summary, companies, dates or schools, and yet
matching reads exactly what it read from the full CV.
"""
import json
from datetime import date

from src.Agent.utils.location import LocationPreferences
from src.Agent.utils.types import ParsedQuery
from src.matching.candidate import Candidate
from src.matching.kept_cv import PERSONAL, education_level, kept_cv, kept_profile

TODAY = date(2026, 10, 5)
FULL_CV = {
    "name": "Jane Wanjiru", "title": "Senior Frontend Developer", "location": "Nairobi, Kenya",
    "phone_number": "+254 700 000 000", "email": "jane@example.com", "portfolio": "https://jane.dev",
    "linkedIn": "https://linkedin.com/in/jane", "professional_summary": "Builds things at Acme Corp.",
    "skills": ["React", "TypeScript", "Node.js", "PostgreSQL", "Swahili"],
    "experience": [
        {"company": "Acme Corp", "role": "Frontend Developer", "start_date": "Jan 2021", "end_date": "Present",
         "description": "React and TypeScript at Acme."},
        {"company": "Beta Ltd", "role": "Software Engineering Intern", "start_date": "Jun 2020", "end_date": "Dec 2020",
         "description": "Node.js services."},
    ],
    "experience_level": "Senior", "education": [{"school_name": "University of Nairobi", "course_title": "BSc Computer Science"}],
}
# Things that must never reach the database, as they appear on the CV.
TELLTALES = ("Jane", "jane@", "+254", "linkedin", "jane.dev", "Acme", "Beta Ltd", "University of Nairobi", "Jan 2021")


def _same_matching(a: Candidate, b: Candidate):
    assert (a.skills, a.families, a.titles, a.years, a.phd, a.languages) == \
           (b.skills, b.families, b.titles, b.years, b.phd, b.languages)


def test_the_kept_cv_holds_no_personal_details():
    kept = kept_cv(FULL_CV, TODAY)
    assert not set(kept) & set(PERSONAL)
    text = json.dumps(kept)
    assert not [t for t in TELLTALES if t.lower() in text.lower()]
    assert kept["skills"] == FULL_CV["skills"] and kept["location"] == "Nairobi, Kenya"
    assert kept["education_level"] == "bachelors"


def test_matching_reads_the_same_from_the_kept_cv():
    prefs = LocationPreferences(country_code="ke", city="Nairobi")
    full = Candidate.from_cv(FULL_CV, prefs, TODAY)
    _same_matching(full, Candidate.from_cv(kept_cv(FULL_CV, TODAY), prefs, TODAY))
    assert full.years["software"] > 5          # years came from the dates that are no longer kept


def test_saving_a_kept_cv_again_keeps_what_was_derived():
    kept = kept_cv(FULL_CV, TODAY)
    again = kept_cv({**kept, "skills": [*kept["skills"], "Go"]}, date(2030, 1, 1))
    assert again["derived"] == kept["derived"]
    assert "Go" in again["skills"]


def test_the_kept_profile_drops_positions_education_and_notes_and_still_matches():
    query = ParsedQuery(primary_role="Frontend Developer", skills=["React", "TypeScript"], experience_level="Senior",
                        experience=[{"role": "Frontend Developer", "company": "Acme Corp", "start_date": "Jan 2021",
                                     "end_date": "Present"}],
                        education="BSc Computer Science, University of Nairobi", notes="Jane Wanjiru, jane@example.com",
                        job_requirements="Wants a role like the one at Acme", company_preferences=["Acme Corp"])
    kept = kept_profile(query.model_dump(mode="json"), TODAY)
    assert {"experience", "education", "notes", "job_requirements", "company_preferences"}.isdisjoint(kept)
    assert not [t for t in TELLTALES if t.lower() in json.dumps(kept).lower()]
    assert kept["primary_role"] == "Frontend Developer"          # the search still knows what to look for
    reused = ParsedQuery.model_validate(kept)                    # what /analyze/reuse matches with
    prefs = LocationPreferences()
    _same_matching(Candidate.from_cv(query.model_dump(), prefs, TODAY), Candidate.from_cv(reused.model_dump(), prefs, TODAY))


def test_education_level():
    assert education_level({"education": "PhD in Statistics"}) == "doctorate"
    assert education_level({"education": [{"course_title": "MSc Data Science"}]}) == "masters"
    assert education_level({"education": [{"course_title": "Diploma in IT"}]}) == "diploma"
    assert education_level({"education": []}) is None
