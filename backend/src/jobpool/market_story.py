"""
What a market page's editorial sections are made from: one `story` per page,
built by market_pages from the page's jobs and its comparison set (senior jobs
in the same families).

    story(jobs, compare, year_buckets)   the counts every section needs, and which sections the data supports
    broad(skill)                         the breadth rule: may a skill be highlighted or named in a finding?
    finding(skills, readable, years)     the page's lead finding, its H1: which pattern, which skills, which counts

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

# The lead finding (the page's H1), first pattern that applies:
# one number of years asked by this share of the jobs that state years: "usually means two years".
YEARS_USUALLY = 60.0
# the lead skill named by this share of readable jobs or more: "Two in three AI jobs name LLMs".
FRACTION_FROM = 60.0
# the fractions a headline may say, each only within this many points of the share.
FRACTIONS = ((3, 5), (2, 3), (7, 10), (3, 4), (4, 5), (9, 10))
FRACTION_POINTS = 2.0
# the top two this close: "almost tied at the top".
TIED_POINTS = 2.0
# the top two this close and both at least PAIR_FROM: "each appear in nearly half" (both under
# 50%) or "in about half" (both within HALF). Anything else never says "half".
PAIR_POINTS = 5.0
PAIR_FROM = 40.0
# the lead skill's share that reads as "half".
HALF = (45.0, 55.0)

ENTRY_YEARS = (0, 1, 2, 3)        # 0, 1, 2, 3 or more
ROLE_YEARS = (0, 3, 5, 8)         # 0 to 2, 3 to 4, 5 to 7, 8 or more


def broad(skill: dict) -> bool:
    """The breadth rule, the one place it lives: named by jobs at BREADTH_EMPLOYERS or more employers."""
    return skill.get("employers", 0) >= BREADTH_EMPLOYERS


def fraction(share: float) -> list[int] | None:
    """The fraction a headline may say for a share ("two in three" for 66.6%), or None: then it says the percentage."""
    near = min(FRACTIONS, key=lambda f: abs(100 * f[0] / f[1] - share))
    return list(near) if abs(100 * near[0] / near[1] - share) <= FRACTION_POINTS else None


def _pair(a: float, b: float) -> str | None:
    """How a headline may say two close shares: "nearly" half (both under 50%), "about" half, or not at all."""
    if abs(a - b) > PAIR_POINTS or min(a, b) < PAIR_FROM:
        return None
    if max(a, b) < 50:
        return "nearly"
    return "about" if HALF[0] <= min(a, b) and max(a, b) <= HALF[1] else None


def _years_lead(years: dict) -> dict | None:
    """One number of years asked by YEARS_USUALLY% of the jobs that state years, when the years section is shown."""
    if years["stated"] < MIN_YEARS_STATED:
        return None
    for b in years["buckets"]:
        if b["from"] == b["to"] and 100 * b["jobs"] / years["stated"] >= YEARS_USUALLY:
            return {"kind": "years", "years": b["from"], "jobs": b["jobs"], "of": years["stated"]}
    return None


def finding(skills: list[dict], readable: int, years: dict) -> dict | None:
    """
    The page's lead finding, the first pattern that applies. `skills` are the
    ones that may lead (broad, not the page's defining skill), most named
    first. The frontend writes the words (lib/market-story.ts, `headline`).
    decisions/market-pages.md, "Finding headlines".
    """
    lead = _years_lead(years)
    if lead or not skills or not readable:
        return lead
    share = [100 * s["any"] / readable for s in skills[:2]]
    one = {"skills": [skills[0]["key"]], "jobs": [skills[0]["any"]], "of": readable}
    two = {"skills": [s["key"] for s in skills[:2]], "jobs": [s["any"] for s in skills[:2]], "of": readable}
    if share[0] >= FRACTION_FROM:
        return {"kind": "share", **one, "fraction": fraction(share[0])}
    if len(share) == 2 and share[0] - share[1] <= TIED_POINTS:
        return {"kind": "tied", **two}
    if len(share) == 2 and (approx := _pair(*share)):
        return {"kind": "pair", **two, "approx": approx}
    if HALF[0] <= share[0] <= HALF[1]:
        return {"kind": "half", **one}
    return {"kind": "leads", **one}


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
          min_readable: int, levels: dict | None = None, defining: tuple[str, ...] = ()) -> dict:
    """
    One page's editorial counts. `jobs` are the page's counted jobs, `compare`
    the comparison set's; skills are read over the readable ones only.
    `employer` and `internship` are market_pages' own rules, passed in so no
    rule is copied. `defining` are the skills that name the job type itself
    (machine learning on the machine learning page): they never lead. Under
    `min_readable` readable jobs no section is written: the page shows its
    counts and says why (the 100 rule).
    """
    readable = [row for row in jobs if not row["profile"].get("thin")]
    compare_read = [row for row in compare if not row["profile"].get("thin")]
    skills = _skills(readable, compare_read, employer)
    leads = [s for s in skills if broad(s) and s["key"] not in defining]
    headline = leads[0]["key"] if leads else None

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
        "finding": finding(leads, len(readable), years) if publishable else None,
        "squares": {"skill": squares[(True, False)], "both": squares[(True, True)],
                    "internship": squares[(False, True)], "neither": squares[(False, False)]},
        "languages": {"per_job": [per_job[n] for n in range(4)], "bars": language_bars},
        "contrast": contrast,
        "categories": categories,
        "years": years,
        "sections": ["hiring", *sections] if publishable else [],
    }

