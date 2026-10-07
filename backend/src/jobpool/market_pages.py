"""
Public market pages: one question each, answered from the live pool.

    build(rows, taken_at)            every page's body, from one read of the pool (market_look.compute)
    entry_level_software(rows, ...)  GET /market/page/entry-level-software
    role(family, rows, ...)          GET /market/page/{software-engineering, ai, machine-learning, devops}
                                     (each page's `story`, the editorial sections' counts: market_story.py)
    is_entry_level(row)              the page's definition of entry level
    place(location)                  "us", "elsewhere" or "unknown" for a job's location text

Counted exactly as the landing count and the daily snapshot count
(snapshot.counted: daily sources only, one role once), with the profiles and
families the profiler stored, so a fix to those rules reaches these pages with
the next PROFILER_VERSION. Skills are counted over readable (not thin) jobs.

Never returned: a job's text. Titles carry the title and company only.
decisions/market-pages.md
"""
import re
from collections import Counter
from datetime import datetime, timezone
from functools import partial
from statistics import median

from src.Agent.utils.location import country_named
from src.jobpool import market_story, snapshot
from src.jobpool.opportunities import duplicate_key
from src.matching.requirements import PROFILER_VERSION
from src.matching.skills import display

# "Software, broadly": the families where software engineers are filed.
SOFTWARE = ("software_engineering", "backend", "frontend", "full_stack", "mobile")
# Below this many readable jobs a share says more about a few employers than
# about the market, so the page shows counts and says so instead.
MIN_READABLE = 100
ENTRY_YEARS = 2
TOP_SKILLS = 15
TITLES = 40
# A role page: one job family each, by page name.
ROLES = {"software-engineering": "software_engineering", "ai": "ai",
         "machine-learning": "machine_learning", "devops": "devops"}
ROLE_TITLES = 30
# "Jobs that name X also name": for the role's top few skills, the skills named beside them most.
TOGETHER_LEADS = 3
TOGETHER_EACH = 5
# The contrast chart: skills where entry level and senior jobs differ most.
CONTRAST_EACH_WAY = 4
CONTRAST_POOL = 40
CONTRAST_MIN_POINTS = 3.0

_JUNIOR_LEVELS = frozenset({"intern", "entry", "junior"})
_SENIOR_LEVELS = frozenset({"senior", "lead", "principal"})

# The page's title rule, the one place it lives. An internship is entry level
# whatever else the title says ("Senior Year Intern"); the other words only
# when no senior word sits beside them ("Graduate Program Manager" is not).
_INTERN_TITLE = re.compile(r"\b(?:intern|interns|internship|co-?op|werkstudent\w*|working student|praktik\w*|"
                           r"apprentice\w*)\b", re.I)
_EARLY_TITLE = re.compile(r"\b(?:graduate|new grad|grad|entry[- ]level|early[- ]career|junior|jr)\b", re.I)
_SENIOR_TITLE = re.compile(r"\b(?:senior|sr|staff|lead|principal|manager|director|head|architect|chief|vp)\b", re.I)
_PLACES = re.compile(r";|\||/|\bor\b|\n")


def is_internship(row: dict) -> bool:
    return row["profile"].get("seniority") == "intern" or bool(_INTERN_TITLE.search(row.get("title") or ""))


def entry_title(title: str | None) -> bool:
    """Whether a title says intern, graduate, new grad, entry level, early career or junior."""
    title = title or ""
    if _INTERN_TITLE.search(title):
        return True
    return bool(_EARLY_TITLE.search(title)) and not _SENIOR_TITLE.search(title)


def is_entry_level(row: dict) -> bool:
    """
    The product's junior level (intern, entry, junior), or an early career
    title, or a job that requires 2 years or less and isn't judged senior.
    """
    profile = row["profile"]
    level = profile.get("seniority")
    if level in _JUNIOR_LEVELS or entry_title(row.get("title")):
        return True
    years = profile.get("years")
    return (profile.get("years_kind") == "required" and years is not None and years <= ENTRY_YEARS
            and level not in _SENIOR_LEVELS)


def place(location: str | None) -> str:
    """
    "us" when any place a job lists is in the US, "elsewhere" when it names
    only other countries, "unknown" when it names none ("Remote", "Hybrid").
    """
    named = {country_named(part.strip()) for part in _PLACES.split(location or "") if part.strip()}
    named.discard(None)
    if "us" in named:
        return "us"
    return "elsewhere" if named else "unknown"


def employer(company: str | None) -> str:
    """One employer however it is spelt ("Shift" and "Shift Ltd"), as the duplicate rule sees it."""
    return duplicate_key(company, "").split("|")[0]


def _skill_counts(rows: list[dict]) -> tuple[Counter, Counter, list[int]]:
    """(any, required, required per job) over readable rows."""
    any_, required, per_job = Counter(), Counter(), []
    for row in rows:
        profile = row["profile"]
        for kind in snapshot.KINDS:
            any_.update(profile.get(kind) or ())
        required.update(profile.get("required") or ())
        per_job.append(len(profile.get("required") or ()))
    return any_, required, per_job


def _ranked(counts: Counter) -> list[str]:
    return [key for key, _ in sorted(counts.items(), key=lambda kv: (-kv[1], kv[0]))]


def _contrast(entry: Counter, entry_n: int, senior: Counter, senior_n: int) -> list[dict]:
    """Up to four skills entry level jobs name more often than senior ones, then up to four the other way."""
    if not entry_n or not senior_n:
        return []
    pool = set(_ranked(entry)[:CONTRAST_POOL]) | set(_ranked(senior)[:CONTRAST_POOL])
    gap = {key: 100 * entry[key] / entry_n - 100 * senior[key] / senior_n for key in pool}
    early = sorted((k for k in pool if gap[k] >= CONTRAST_MIN_POINTS), key=lambda k: (-gap[k], k))
    later = sorted((k for k in pool if gap[k] <= -CONTRAST_MIN_POINTS), key=lambda k: (gap[k], k))
    return [{"key": k, "any": entry[k], "senior_any": senior[k]}
            for k in early[:CONTRAST_EACH_WAY] + later[:CONTRAST_EACH_WAY]]


def _median(values: list[int]) -> float | None:
    return float(median(values)) if values else None


def _hiring(rows: list[dict]) -> dict:
    """Employers, the largest one, remote and places: the counts every page's "who is hiring" shows."""
    employers = Counter(employer(row.get("company")) for row in rows)
    largest_key, largest_jobs = employers.most_common(1)[0] if employers else (None, 0)
    # The employer's name as most of its jobs spell it ("OpenAI", not one board's "Openai").
    spellings = Counter(row.get("company") or "" for row in rows if employer(row.get("company")) == largest_key)
    largest_name = spellings.most_common(1)[0][0] if spellings else None
    places = Counter(place(row.get("location")) for row in rows)
    return {
        "employers": len(employers),
        "remote": sum(bool(row.get("remote")) for row in rows),
        "places": {name: places[name] for name in ("us", "elsewhere", "unknown")},
        "largest_employer": {"name": largest_name, "jobs": largest_jobs} if largest_name is not None else None,
    }


def _titles(rows: list[dict], limit: int = TITLES) -> list[list]:
    # One per employer first: forty titles from one company describe that company.
    # Imported here: market_look builds these pages, so it imports this module first.
    from src.jobpool.market_look import _varied
    out = []
    for row in _varied(rows, limit):
        profile = row["profile"]
        years = profile.get("years") if profile.get("years_kind") == "required" else None
        level = "intern" if is_internship(row) else profile.get("seniority") or "unknown"
        out.append([row.get("title") or "", row.get("company") or "", level, years])
    return out


def entry_level_software(rows: list[dict], taken_at: datetime | None = None) -> dict:
    """Pool rows (newest first) -> what entry level software jobs ask for, against senior ones."""
    software = [row for row in snapshot.counted(rows) if row["profile"].get("family") in SOFTWARE]
    entry = [row for row in software if is_entry_level(row)]
    senior = [row for row in software if not is_entry_level(row)
              and row["profile"].get("seniority") in _SENIOR_LEVELS]
    entry_read = [row for row in entry if not row["profile"].get("thin")]
    senior_read = [row for row in senior if not row["profile"].get("thin")]

    entry_any, entry_req, entry_per_job = _skill_counts(entry_read)
    senior_any, senior_req, senior_per_job = _skill_counts(senior_read)
    top = _ranked(entry_any)[:TOP_SKILLS]
    contrast = _contrast(entry_any, len(entry_read), senior_any, len(senior_read))

    hiring = _hiring(entry)
    keys = set(top) | {c["key"] for c in contrast}
    taken_at = taken_at or datetime.now(timezone.utc)
    return {
        "taken_at": taken_at.astimezone(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ"),
        "profiler_version": PROFILER_VERSION,
        "families": list(SOFTWARE),
        "min_readable": MIN_READABLE,
        "publishable": len(entry_read) >= MIN_READABLE,
        "jobs": len(entry),
        "readable": len(entry_read),
        "employers": hiring["employers"],
        "internships": sum(is_internship(row) for row in entry),
        "remote": hiring["remote"],
        "places": hiring["places"],
        "largest_employer": hiring["largest_employer"],
        "skills": [{"key": k, "any": entry_any[k], "required": entry_req[k],
                    "senior_any": senior_any[k], "senior_required": senior_req[k]} for k in top],
        "contrast": contrast,
        "senior": {"jobs": len(senior), "readable": len(senior_read)},
        "required_median": {"entry": _median(entry_per_job), "senior": _median(senior_per_job)},
        "titles": _titles(entry),
        "story": (story := market_story.story(entry, senior, employer, is_internship, market_story.ENTRY_YEARS,
                                              MIN_READABLE)),
        "names": _names(keys, story),
    }


def _names(keys: set[str], story: dict) -> dict:
    """Display names for every skill key the page returns."""
    keys = keys | {s["key"] for s in story["skills"]}
    return {key: display(key) for key in sorted(keys)}


def _together(rows: list[dict], leads: list[str]) -> list[dict]:
    """For each lead skill: how many readable jobs name it, and the skills those jobs name most beside it."""
    out = []
    for lead in leads:
        beside, jobs = Counter(), 0
        for row in rows:
            named = {key for kind in snapshot.KINDS for key in row["profile"].get(kind) or ()}
            if lead in named:
                jobs += 1
                beside.update(named - {lead})
        out.append({"key": lead, "any": jobs,
                    "with": [{"key": k, "jobs": beside[k]} for k in _ranked(beside)[:TOGETHER_EACH]]})
    return out


def role(family: str, rows: list[dict], taken_at: datetime | None = None) -> dict:
    """Pool rows (newest first) -> what one job family's jobs ask for: skills, levels, places, skills named together."""
    # Imported here, as in _titles: market_look imports this module first.
    from src.jobpool.market_look import LEVELS, bucket
    jobs = [row for row in snapshot.counted(rows) if row["profile"].get("family") == family]
    senior = [row for row in jobs if row["profile"].get("seniority") in _SENIOR_LEVELS]
    readable = [row for row in jobs if not row["profile"].get("thin")]
    any_, required, _ = _skill_counts(readable)
    top = _ranked(any_)[:TOP_SKILLS]
    together = _together(readable, top[:TOGETHER_LEADS])
    levels = Counter({name: 0 for name in (*LEVELS, "unstated")})
    levels.update(bucket(row["profile"].get("seniority")) for row in jobs)

    keys = set(top) | {w["key"] for t in together for w in t["with"]}
    taken_at = taken_at or datetime.now(timezone.utc)
    return {
        "taken_at": taken_at.astimezone(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ"),
        "profiler_version": PROFILER_VERSION,
        "families": [family],
        "min_readable": MIN_READABLE,
        "publishable": len(readable) >= MIN_READABLE,
        "jobs": len(jobs),
        "readable": len(readable),
        **_hiring(jobs),
        "internships": sum(is_internship(row) for row in jobs),
        "levels": dict(levels),
        "skills": [{"key": k, "any": any_[k], "required": required[k]} for k in top],
        "together": together,
        "titles": _titles(jobs, ROLE_TITLES),
        "story": (story := market_story.story(jobs, senior, employer, is_internship, market_story.ROLE_YEARS,
                                              MIN_READABLE, dict(levels))),
        "names": _names(keys, story),
    }


PAGES = {"entry-level-software": entry_level_software,
         **{name: partial(role, family) for name, family in ROLES.items()}}


def build(rows: list[dict], taken_at: datetime) -> dict:
    """Every page, from the rows the landing count was built from."""
    return {name: page(rows, taken_at) for name, page in PAGES.items()}
