"""
Who is looking: the candidate side of matching, read from their CV.

    Candidate.from_cv(cv, prefs)   the saved CV — or an analysis' ParsedQuery,
                                   which carries the same fields

Cheap enough to rebuild on every request, so an edited CV changes every match
at once and nothing about the candidate is stored.

Years are counted from the dates of each position, per track, rather than taken
from the LLM's "experience level": both CVs in the database came back "Mid Level"
for early-career profiles, and a label cannot tell software years from ML years.
A Data Science degree and ML projects are not professional ML experience, and
conflating them is exactly what recommends "ML Engineer, 4+ years" to a learner.
"""
import re
from dataclasses import dataclass, field
from datetime import date

from src.Agent.utils.location import LocationPreferences
from src.matching.requirements import LANGUAGES
from src.matching.roles import ML_FAMILIES, TECH_FAMILIES, classify_family, normalise_title, track
from src.matching.skills import category, resolve_all

# ---------------------------------------------------------------- dates

_MONTHS = {m: i for i, m in enumerate(
    "jan feb mar apr may jun jul aug sep oct nov dec".split(), start=1)}
_SEASONS = {"spring": 4, "summer": 7, "autumn": 10, "fall": 10, "winter": 1}
_NOW = re.compile(r"\b(?:present|current(?:ly)?|now|ongoing|to date|till date|today)\b", re.I)
_RANGE_SPLIT = re.compile(r"\s+(?:-|–|—|to|until)\s+|\s*[–—]\s*")


def month_index(text: str | None, today: date, end: bool = False) -> int | None:
    """
    "Jan 2024", "01/2024", "2024-01", "2024", "Present" -> months since year 0.

    A bare year is taken as mid-year so "2022 - 2023" reads as about a year,
    the way a CV means it, rather than as two.
    """
    text = (text or "").strip().lower()
    if not text:
        return None
    if _NOW.search(text):
        return today.year * 12 + today.month
    year = re.search(r"\b(19[89]\d|20\d\d)\b", text)
    if not year:
        return None
    y = int(year.group(1))
    word = re.search(r"\b(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\.?\b", text)
    numeric = re.search(r"\b(\d{1,2})\s*[/.-]\s*(?:19|20)\d\d\b|\b(?:19|20)\d\d\s*[/.-]\s*(\d{1,2})\b", text)
    season = next((m for s, m in _SEASONS.items() if s in text), None)
    if word:
        month = _MONTHS[word.group(1)]
    elif numeric and 1 <= int(numeric.group(1) or numeric.group(2)) <= 12:
        month = int(numeric.group(1) or numeric.group(2))
    else:
        month = season or (6 if end else 7)
    return y * 12 + month


def position_months(start: str | None, end: str | None, today: date) -> range | None:
    """The months a position covers, inclusive. None when its dates are unreadable."""
    if start and not end:
        # "Jan 2023 - Mar 2024" written into one field.
        parts = _RANGE_SPLIT.split(start, maxsplit=1)
        if len(parts) == 2:
            start, end = parts
    first = month_index(start, today)
    last = month_index(end, today, end=True) if end else None
    if first is None:
        return None
    if last is None:
        # A start with no end is a current role, as CVs write them.
        last = today.year * 12 + today.month
    if last < first:
        return range(first, first + 6) if last // 12 == first // 12 else None
    return range(first, last + 1)


# ------------------------------------------------------------- candidate

_INTERN = re.compile(r"\b(?:intern|internship|attachment|apprentice\w*|trainee|student|werkstudent)\b", re.I)
_PHD = re.compile(r"\bph\.?\s?d\b|\bdoctor|\bdoctorate\b", re.I)
# Nominal years for the LLM's label, used only when no position has usable dates.
_LABEL_YEARS = {"intern": 0.0, "entry": 0.5, "junior": 1.0, "mid": 3.0, "senior": 6.0, "manage": 8.0, "lead": 8.0}
# Countries' own languages, so a Nairobi CV is not asked to prove Swahili.
_COUNTRY_LANGUAGES = {"ke": {"sw"}, "tz": {"sw"}, "ug": {"sw"}, "de": {"de"}, "at": {"de"}, "ch": {"de", "fr"},
                      "fr": {"fr"}, "be": {"fr", "nl"}, "nl": {"nl"}, "es": {"es"}, "mx": {"es"}, "pt": {"pt"},
                      "br": {"pt"}, "it": {"it"}, "pl": {"pl"}, "eg": {"ar"}, "ma": {"ar", "fr"}, "sn": {"fr"}}
# Skill categories that say which kinds of role a CV is aimed at.
_SKILL_FAMILIES = {"frontend": ("frontend", 2), "backend": ("backend", 2), "mobile": ("mobile", 1),
                   "ml": ("machine_learning", 2), "devops": ("devops", 3), "cloud": ("devops", 3)}


@dataclass(frozen=True)
class Candidate:
    skills: frozenset
    unmatched_skills: tuple = ()
    # family -> how strongly the CV points at it (1.0 = its stated title)
    families: dict = field(default_factory=dict)
    titles: tuple = ()
    # professional years: "software", "ml" and "any"
    years: dict = field(default_factory=lambda: {"software": 0.0, "ml": 0.0, "any": 0.0})
    languages: frozenset = frozenset({"en"})
    phd: bool = False
    prefs: LocationPreferences = field(default_factory=LocationPreferences)

    def level(self, track_name: str) -> str:
        years = self.years.get(track_name, self.years["any"])
        return "entry" if years < 1 else "junior" if years < 2.5 else "mid" if years < 5 \
            else "senior" if years < 8 else "lead"

    @classmethod
    def from_cv(cls, cv: dict, prefs: LocationPreferences, today: date | None = None) -> "Candidate":
        """
        `cv` is CVQuery-shaped: title, skills, experience[{role, start_date,
        end_date, description}], experience_level, education. A ParsedQuery dump
        works too — primary_role and secondary_roles stand in for the title.
        """
        today = today or date.today()
        known, unknown = resolve_all(cv.get("skills"))
        title = cv.get("title") or cv.get("primary_role")
        roles = [title, *(cv.get("secondary_roles") or [])]
        positions = [p for p in (cv.get("experience") or []) if isinstance(p, dict)]

        families: dict[str, float] = {}

        def point(family: str, strength: float):
            if family in TECH_FAMILIES or family == "ai_data":
                families[family] = max(families.get(family, 0.0), strength)

        for role in filter(None, roles):
            point(classify_family(role), 1.0)
        for position in positions:
            point(classify_family(position.get("role"), position.get("description")), 0.9)
        counts: dict[str, int] = {}
        for skill in known:
            counts[category(skill)] = counts.get(category(skill), 0) + 1
        for skill_category, (family, needed) in _SKILL_FAMILIES.items():
            if counts.get(skill_category, 0) >= needed:
                point(family, 0.8)
        if "frontend" in families and "backend" in families:
            point("full_stack", 0.8)
        for course in _education(cv):
            if re.search(r"data science|machine learning|artificial intelligence|statistic", course, re.I):
                point("data_science", 0.6)
                point("machine_learning", 0.6)
            if re.search(r"computer|software|information technology|informatics", course, re.I):
                point("software_engineering", 0.6)

        languages = {"en"} | _COUNTRY_LANGUAGES.get(prefs.country_code or "", set())
        for name in [*(cv.get("skills") or []), *(cv.get("languages") or [])]:
            for word in re.findall(r"[a-z]+", str(name or "").lower()):
                if word in LANGUAGES:
                    languages.add(LANGUAGES[word])

        return cls(
            skills=frozenset(known),
            unmatched_skills=tuple(unknown),
            families=families,
            titles=tuple(t for t in (_role_phrase(r) for r in roles if r) if t),
            years=_years(positions, cv.get("experience_level"), families, today),
            languages=frozenset(languages),
            phd=any(_PHD.search(course) for course in _education(cv)),
            prefs=prefs,
        )


def _education(cv: dict) -> list[str]:
    education = cv.get("education")
    if isinstance(education, str):
        return [education]
    return [" ".join(filter(None, (e.get("course_title"), e.get("school_name"))))
            for e in education or [] if isinstance(e, dict)]


_LEVEL_WORDS = re.compile(r"\b(?:senior|sr|junior|jr|lead|principal|staff|intern|internship|graduate|trainee|"
                          r"associate|mid|level|i|ii|iii|iv)\b")


def _role_phrase(role: str) -> str:
    """"Senior Frontend Developer" -> "frontend developer": the role without its level."""
    return " ".join(_LEVEL_WORDS.sub(" ", normalise_title(role)).split())


def _years(positions: list[dict], label: str | None, families: dict, today: date) -> dict:
    """
    Professional years per track, from position dates.

    Overlapping positions count once. Internships count half: most postings
    that ask for years mean years of employment, but an internship is not
    nothing. Machine-learning and AI engineering roles also count as software
    years — they ship production code — while data-science roles do not.
    """
    full = {"software": set(), "ml": set(), "any": set()}
    partial = {"software": set(), "ml": set(), "any": set()}
    dated = False
    for position in positions:
        months = position_months(position.get("start_date"), position.get("end_date"), today)
        if months is None:
            continue
        dated = True
        family = classify_family(position.get("role"), position.get("description"))
        tracks = {"any"}
        if track(family) == "software" or family in ("machine_learning", "ai"):
            tracks.add("software")
        if family in ML_FAMILIES:
            tracks.add("ml")
        bucket = partial if _INTERN.search(position.get("role") or "") else full
        for name in tracks:
            bucket[name].update(months)

    if dated:
        return {name: round((len(full[name]) + 0.5 * len(partial[name] - full[name])) / 12, 1) for name in full}

    # No usable dates: fall back to the label, on the track the CV points at.
    nominal = next((y for key, y in _LABEL_YEARS.items() if key in (label or "").lower()), 0.0)
    ml = any(f in ML_FAMILIES for f, s in families.items() if s >= 1.0)
    return {"software": 0.0 if ml else nominal, "ml": nominal if ml else 0.0, "any": nominal}
