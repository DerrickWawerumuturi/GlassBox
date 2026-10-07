"""
What a market page's editorial sections are made from: one `story` per page,
built by market_pages from the page's jobs and its comparison set (senior jobs
in the same families).

    story(jobs, compare, year_buckets)   the counts every section needs, and which sections the data supports
    broad(skill)                         the breadth rule: may a skill be highlighted or named in a finding?

The frontend writes every sentence from these numbers with fixed templates
(lib/market-story.ts), so this module decides what may be said and the
frontend only says it. Thresholds are named below; decisions/market-pages.md
explains each one.
"""
from collections import Counter

from src.jobpool import snapshot
from src.matching.skills import category

# The breadth rule: a skill can be highlighted, lead the squares or carry a
# finding only when jobs at this many employers name it. Under it, one
# company's hiring can make a pattern (Spring Boot on 7 Oct: 14 entry level
# jobs, 8 of them at Robinhood). Figures show only broad skills.
BREADTH_EMPLOYERS = 10
# Skills a story considers: the most named over the page's readable jobs.
STORY_SKILLS = 40
# Languages: the bars shown, and the broad languages the section needs.
LANGUAGE_BARS = 7
MIN_LANGUAGES = 3
# The contrast: skills where the page and its comparison set differ by at
# least this many points, up to this many each way, broad only.
CONTRAST_MIN_POINTS = 3.0
CONTRAST_EACH_WAY = 3
MIN_COMPARE_READABLE = 100
# Beyond the languages: other categories, each needing this many broad skills
# and this many jobs naming one of them.
CATEGORIES = 4
CATEGORY_SKILLS = 3
MIN_CATEGORY_BROAD = 2
MIN_CATEGORY_JOBS = 20
# Years: the section needs this many jobs that state a number.
MIN_YEARS_STATED = 30
# Levels (role pages): the section needs this many jobs with a stated level.
MIN_LEVELS_STATED = 50

ENTRY_YEARS = (0, 1, 2, 3)        # 0, 1, 2, 3 or more
ROLE_YEARS = (0, 3, 5, 8)         # 0 to 2, 3 to 4, 5 to 7, 8 or more


def broad(skill: dict) -> bool:
    """The breadth rule, the one place it lives: named by jobs at BREADTH_EMPLOYERS or more employers."""
    return skill.get("employers", 0) >= BREADTH_EMPLOYERS


def _named(row: dict) -> set[str]:
    return {key for kind in snapshot.KINDS for key in row["profile"].get(kind) or ()}


def _required_years(row: dict) -> int | None:
    profile = row["profile"]
    return profile.get("years") if profile.get("years_kind") == "required" else None


def _buckets(rows: list[dict], edges: tuple[int, ...]) -> dict:
    """Jobs by the years they require: one bucket per edge (the last open ended), and the jobs that state none."""
    counts, unstated = [0] * len(edges), 0
    for row in rows:
        years = _required_years(row)
        if years is None:
            unstated += 1
            continue
        counts[max(i for i, edge in enumerate(edges) if years >= edge)] += 1
    buckets = [{"from": edge, "to": (edges[i + 1] - 1 if i + 1 < len(edges) else None), "jobs": counts[i]}
               for i, edge in enumerate(edges)]
    return {"buckets": buckets, "stated": sum(counts), "unstated": unstated}


def _skills(readable: list[dict], compare: list[dict], employer) -> list[dict]:
    """The page's most named skills: jobs naming each (any, required), employers naming it, and the comparison count."""
    any_, required, employers = Counter(), Counter(), {}
    for row in readable:
        named = _named(row)
        any_.update(named)
        required.update(row["profile"].get("required") or ())
        for key in named:
            employers.setdefault(key, set()).add(employer(row.get("company")))
    compare_any = Counter(key for row in compare for key in _named(row))
    top = sorted(any_, key=lambda k: (-any_[k], k))[:STORY_SKILLS]
    return [{"key": k, "category": category(k) or "other", "any": any_[k], "required": required[k],
             "employers": len(employers[k]), "compare_any": compare_any[k]} for k in top]


def _contrast(skills: list[dict], readable: int, compare: int) -> list[str]:
    """Broad skills leaning to the page (largest gap first), then to the comparison set."""
    if not readable or compare < MIN_COMPARE_READABLE:
        return []
    gap = {s["key"]: 100 * s["any"] / readable - 100 * s["compare_any"] / compare for s in skills if broad(s)}
    toward = sorted((k for k in gap if gap[k] >= CONTRAST_MIN_POINTS), key=lambda k: (-gap[k], k))
    away = sorted((k for k in gap if gap[k] <= -CONTRAST_MIN_POINTS), key=lambda k: (gap[k], k))
    if not toward or not away:
        return []
    return toward[:CONTRAST_EACH_WAY] + away[:CONTRAST_EACH_WAY]


def _categories(skills: list[dict], readable: list[dict]) -> list[dict]:
    """Categories beyond the languages, by the jobs naming one of their broad skills."""
    by_category: dict[str, list[dict]] = {}
    for s in skills:
        if broad(s) and s["category"] not in ("language", "other"):
            by_category.setdefault(s["category"], []).append(s)
    out = []
    for name, members in by_category.items():
        if len(members) < MIN_CATEGORY_BROAD:
            continue
        keys = {s["key"] for s in members}
        jobs = sum(bool(keys & _named(row)) for row in readable)
        if jobs >= MIN_CATEGORY_JOBS:
            out.append({"category": name, "jobs": jobs, "skills": [s["key"] for s in members[:CATEGORY_SKILLS]]})
    return sorted(out, key=lambda c: (-c["jobs"], c["category"]))[:CATEGORIES]


def story(jobs: list[dict], compare: list[dict], employer, internship, year_edges: tuple[int, ...],
          min_readable: int, levels: dict | None = None) -> dict:
    """
    One page's editorial counts. `jobs` are the page's counted jobs, `compare`
    the comparison set's; skills are read over the readable ones only.
    `employer` and `internship` are market_pages' own rules, passed in so no
    rule is copied. Under `min_readable` readable jobs no section is written:
    the page shows its counts and says why (the 100 rule).
    """
    readable = [row for row in jobs if not row["profile"].get("thin")]
    compare_read = [row for row in compare if not row["profile"].get("thin")]
    skills = _skills(readable, compare_read, employer)
    headline = next((s["key"] for s in skills if broad(s)), None)

    # Every language on the list counts here, not only the most named ones.
    per_job = Counter(min(sum(category(key) == "language" for key in _named(row)), 3) for row in readable)
    language_bars = [s["key"] for s in skills if s["category"] == "language" and broad(s)][:LANGUAGE_BARS]

    squares = Counter((headline in _named(row) if headline and not row["profile"].get("thin") else False,
                       internship(row)) for row in jobs)
    contrast = _contrast(skills, len(readable), len(compare_read))
    categories = _categories(skills, readable)
    years = _buckets(jobs, year_edges)
    stated_levels = sum(v for k, v in (levels or {}).items() if k != "unstated")

    publishable = len(readable) >= min_readable
    sections = [name for name, ok in (
        ("languages", len(language_bars) >= MIN_LANGUAGES),
        ("contrast", bool(contrast)),
        ("categories", bool(categories)),
        ("years", years["stated"] >= MIN_YEARS_STATED),
        ("levels", levels is not None and stated_levels >= MIN_LEVELS_STATED),
    ) if ok and publishable]
    return {
        "compare": {"jobs": len(compare), "readable": len(compare_read)},
        "breadth": BREADTH_EMPLOYERS,
        "skills": [{**s, "broad": broad(s)} for s in skills],
        "headline": headline if publishable else None,
        "squares": {"skill": squares[(True, False)], "both": squares[(True, True)],
                    "internship": squares[(False, True)], "neither": squares[(False, False)]},
        "languages": {"per_job": [per_job[n] for n in range(4)], "bars": language_bars},
        "contrast": contrast,
        "categories": categories,
        "years": years,
        "sections": ["hiring", *sections] if publishable else [],
    }

