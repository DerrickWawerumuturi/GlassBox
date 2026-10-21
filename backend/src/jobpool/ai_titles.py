"""
Jobs with AI in the title, in every family: how many, where, and what the
title says the job is for. The weekly publication carries it as
look["ai_titles"] for the AI age stories and the barometer
(decisions/market-look.md).

    names_ai(title)   does the title name AI
    kind(title)       what an AI titled job is mostly for, first match wins
    count(rows)       pool rows -> the look["ai_titles"] body; pure

It reads the rows the Monday run already reads (market_look.bodies), so it adds
no query. Every family counts, non_tech and other too: "AI Product Counsel" is
a lawyer, and that is part of what the stories show.

By title words only, so a job can land in the wrong kind; the stories say so.
"""
import re
from collections import Counter

from src.jobpool import snapshot
from src.matching.roles import normalise_title

# Bare "agent" is left out: in titles it is mostly call centre and travel work.
# "ki" is German for AI ("KI-Agenten" normalises to "ki agenten").
_AI = re.compile(r"\ba\.i\.|\b(?:ai|genai|gen ai|generative ai|artificial intelligence|llms?|ki|agentic|"
                 r"machine learning|ml|prompt engineer\w*)\b|"
                 r"\b(?:ai|llm) agents?\b|"
                 r"\bagents? (?:platform|development|experience|builder|systems?|security|engineer\w*|runtime|"
                 r"gateway|product|strateg\w*)\b")

# Ordered: the first match wins, so "Forward Deployed AI Engineer" works for
# customers before it counts as building software, and "AI Security Researcher"
# is research. "build" sits last but one because nearly every title says engineer.
KINDS = (
    ("research", r"\b(?:research\w*|scientists?|phd)\b"),
    ("customers", r"\b(?:forward deployed|fde|solutions?|sales|pre ?sales|value (?:engineer|architect)\w*|gtm|"
                  r"go to market|accounts?|partners?\w*|alliances?|business develop\w*|evangelist|advocate|"
                  r"customers?|success|field)\b"),
    ("bounds", r"\b(?:governance|ethics?|safety|policy|counsel|regulat\w*|compliance|risks?|secur\w*|privacy|"
               r"legal|trust)\b"),
    ("teach", r"\b(?:enablement|coach\w*|teach\w*|trainer|instructor|educat\w*|tutor\w*|annotat\w*|raters?|"
              r"reviewers?|evaluat\w*|evals?|red team\w*|qa|quality|test\w*)\b|(?<!machine )\blearning special"),
    ("product", r"\b(?:product|program manager|design\w*|ux|ui)\b"),
    ("change", r"\b(?:automat\w*|consult\w*|strateg\w*|advis\w*|transformation|operat\w*|innovation|adoption|"
               r"change|enabled)\b"),
    ("infra", r"\b(?:infra\w*|platforms?|mlops|inference|gpus?|compute|reliability|sre|devops|cloud|kernels?|"
              r"compilers?|hardware|performance)\b"),
    ("build", r"\b(?:engineer\w*|developer|entwickler\w*|programm\w*|architect\w*|software|full ?stack|back ?end|"
              r"front ?end|builder|technical staff)\b"),
)
_KINDS = [(key, re.compile(pattern)) for key, pattern in KINDS]
OTHER = "other"
# The landing page's junior bucket (market_look.BUCKETS): intern, entry, junior.
EARLY = frozenset({"intern", "entry", "junior"})
TITLES_PER_KIND = 8


def names_ai(title: str | None) -> bool:
    return bool(_AI.search(normalise_title(title)))


def kind(title: str | None) -> str:
    t = normalise_title(title)
    return next((key for key, pattern in _KINDS if pattern.search(t)), OTHER)


def _sample(rows: list[dict]) -> list[list[str]]:
    """Newest first, one title per employer: eight from one company would describe the company."""
    seen, out = set(), []
    for row in rows:
        company = (row.get("company") or "").strip().lower()
        if company in seen:
            continue
        seen.add(company)
        out.append([row.get("title") or "", row.get("company") or "", row["profile"].get("seniority") or "unknown"])
        if len(out) == TITLES_PER_KIND:
            break
    return out


def count(rows: list[dict]) -> dict:
    """Pool rows (newest first) -> {jobs, of, early, internships, families, kinds}."""
    every: Counter = Counter()
    named: Counter = Counter()
    by_kind: dict[str, list[dict]] = {key: [] for key, _ in (*KINDS, (OTHER, None))}
    for row in snapshot.counted(rows):
        family = row["profile"].get("family") or "other"
        every[family] += 1
        if names_ai(row.get("title")):
            named[family] += 1
            by_kind[kind(row.get("title"))].append(row)

    def level(group: list[dict], levels) -> int:
        return sum(1 for row in group if row["profile"].get("seniority") in levels)

    titled = [row for group in by_kind.values() for row in group]
    return {
        "jobs": len(titled),
        "of": sum(every.values()),
        "early": level(titled, EARLY),
        "internships": level(titled, {"intern"}),
        # [AI titled, all jobs] per family; a list because jsonb doesn't keep key order.
        "families": sorted(([name, named[name], every[name]] for name in named), key=lambda f: (-f[1], f[0])),
        "kinds": [{"key": key, "jobs": len(group), "early": level(group, EARLY),
                   "internships": level(group, {"intern"}), "titles": _sample(group)}
                  for key, group in by_kind.items()],
    }
