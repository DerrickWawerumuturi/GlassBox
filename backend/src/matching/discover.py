"""
Where skills.txt is thin, and what to add: read from the live pool, decided by a person.

    python -m src.matching.discover                          coverage + top candidates, as text
    python -m src.matching.discover --html report.html       the same as a page with approve/reject
    python -m src.matching.discover --family design --top 60 one family, deeper

skills.txt is a closed vocabulary on purpose (decisions/skill-vocabulary.md):
only listed skills are ever counted, so "Workflows" or "Curiosity" can never top
a chart. The cost is that a listed vocabulary misses what nobody listed yet.
This report is how it keeps up. Nothing here changes the vocabulary.

Coverage: for each role family, the share of readable postings (not thin) in
which the vocabulary finds at least COVERED skills. A family below the bar is
one where users would see too little.

Candidates: terms in postings' requirement sections that the vocabulary does
not know, from two sources. EMSI's hard-skill names (skill_db_relax_20.json,
the database SkillNer shipped, kept as a dictionary for this report only) catch established tools; a shape test catches new
ones EMSI lacks ("PyTorch", "Next.js", "D3"). Terms the vocabulary already
covers, the employer's own name, and anything in skills_rejected.txt are
dropped. The rest are ranked by how specific they are to the family: "Typography"
is concentrated in design postings, "Workflows" is everywhere, so the first
rises and the second sinks. The person reviewing is the filter that matters.
"""
import argparse
import json
import re
import statistics
from collections import Counter, defaultdict
from datetime import datetime, timezone
from functools import lru_cache
from pathlib import Path

from src.matching import skills
from src.matching.requirements import split_sections

EMSI_FILE = Path(__file__).resolve().parents[2] / "skill_db_relax_20.json"
REJECTED_FILE = Path(__file__).with_name("skills_rejected.txt")
# Outside the audience (non-tech roles, unclassified titles, data labelling):
# reported for coverage, not mined for candidates unless asked for by name.
NOT_MINED = frozenset({"non_tech", "other", "ai_data"})
COVERED = 3              # skills found for a posting to count as covered
COVERAGE_BAR = 80        # % of readable postings covered before a family is fit for the Market tab
# Product postings ask mostly for judgement, stakeholders and strategy, which are
# not skills by this vocabulary's definition: 61% after the 2026-10-01 review, and
# padding it with soft skills would bring back the junk this replaced.
FAMILY_BARS = {"product": 60}
MIN_POSTINGS = 3         # a candidate seen fewer times in a family is noise
MAX_LIFT = 5.0           # beyond 5x more common than elsewhere, specificity stops adding rank
# Words about as common everywhere ("Scale", "Make", "Track": EMSI lists them as
# hard skills) say nothing about a family. Measured 2026-10-01: they sat at 0.9-1.4x.
MIN_LIFT = 1.5
_QUALIFIER = re.compile(r"\s*\([^)]*\)\s*$")
# New tools EMSI lacks: CamelCase (PyTorch), dotted names (Next.js), letters
# with digits (D3, S3, Web3).
_TECH_SHAPE = re.compile(r"\b(?:[A-Za-z]*[a-z][A-Z][A-Za-z0-9]*|[A-Za-z][A-Za-z0-9]*\.(?:js|io|ai|py|net|ts)"
                         r"|[A-Z][A-Za-z]*\d+[A-Za-z]*)\b")


@lru_cache(maxsize=1)
def emsi_hard_skills() -> dict[tuple, str]:
    """EMSI hard-skill names as token tuples -> display name. Soft skills and certifications left out."""
    data = json.loads(EMSI_FILE.read_text(encoding="utf-8"))
    out = {}
    for entry in data.values():
        if entry.get("skill_type") != "Hard Skill":
            continue
        name = _QUALIFIER.sub("", entry["skill_name"]).strip()
        words = tuple(t.group().lower() for t in skills.tokens(name))
        # One-letter and pure-number names collide with prose ("a", "3").
        if words and not (len(words) == 1 and (len(words[0]) < 2 or words[0].isdigit())):
            out.setdefault(words, name)
    return out


def rejected(path: Path = REJECTED_FILE) -> frozenset[str]:
    lines = (line.split("#")[0].strip().lower() for line in path.read_text(encoding="utf-8").splitlines())
    return frozenset(line for line in lines if line)


def requirement_text(description: str) -> str:
    """Required and preferred sections; the whole posting when it has no such headings."""
    sections = split_sections(description)
    return "\n".join(filter(None, (sections["required"], sections["preferred"]))) or sections["general"]


def candidates_in(text: str, company: str | None, dictionary: dict[tuple, str], turned_down: frozenset[str],
                  ) -> dict[str, tuple[str, str]]:
    """Unknown skill-like terms in one posting: key -> (display, source). Each once."""
    known_spans = [(start, end) for _, start, end in skills.scan(text)]
    employer = {t.group().lower() for t in skills.tokens(company or "")}
    found = skills.tokens(text)
    words = [t.group().lower() for t in found]
    longest = max(len(k) for k in dictionary) if dictionary else 0
    out: dict[str, tuple[str, str]] = {}

    def usable(key: str, start: int, end: int) -> bool:
        # A term overlapping a skill the vocabulary found is already counted,
        # whatever EMSI calls it ("Python (Programming Language)"). One it knows
        # but did not count here ("observability" as a quality, "product,
        # design") was left out on purpose and is not a candidate either.
        return (key not in turned_down
                and not set(key.split()) <= employer
                and skills.canonical(key) is None
                and not any(s < end and start < e for s, e in known_spans))

    i = 0
    while i < len(found):
        for n in range(min(longest, len(found) - i), 0, -1):
            name = dictionary.get(tuple(words[i:i + n]))
            if name:
                key = " ".join(words[i:i + n])
                if usable(key, found[i].start(), found[i + n - 1].end()):
                    out.setdefault(key, (name, "dictionary"))
                i += n
                break
        else:
            i += 1
    for m in _TECH_SHAPE.finditer(text):
        key = m.group().lower()
        if key not in out and usable(key, m.start(), m.end()):
            out[key] = (m.group(), "shape")
    return out


def _example(text: str, term: str) -> str:
    at = text.lower().find(term)
    if at < 0:
        return ""
    start, end = max(0, at - 70), min(len(text), at + len(term) + 70)
    return ("…" if start else "") + " ".join(text[start:end].split()) + ("…" if end < len(text) else "")


def analyse(postings: list[dict], families: set[str] | None = None, top: int = 40) -> dict:
    """
    postings: {"family", "company", "description", "profile"} — one per role, deduplicated.
    Returns coverage for every family and ranked candidates for the mined ones.
    """
    dictionary, turned_down = emsi_hard_skills(), rejected()
    readable = Counter()
    covered = Counter()
    sizes: dict[str, list[int]] = defaultdict(list)
    seen: dict[str, Counter] = defaultdict(Counter)
    overall = Counter()
    display: dict[str, tuple[str, str]] = {}
    example: dict[tuple[str, str], str] = {}

    for post in postings:
        family, profile = post["family"], post["profile"]
        if profile.get("thin"):
            continue
        readable[family] += 1
        found = len({*profile.get("required", ()), *profile.get("preferred", ()), *profile.get("mentioned", ())})
        sizes[family].append(found)
        covered[family] += found >= COVERED
        text = requirement_text(post["description"])
        for key, (name, source) in candidates_in(text, post.get("company"), dictionary, turned_down).items():
            seen[family][key] += 1
            overall[key] += 1
            display.setdefault(key, (name, source))
            example.setdefault((family, key), _example(text, key))

    total = sum(readable.values()) or 1
    report = []
    for family in sorted(readable, key=readable.get, reverse=True):
        n = readable[family]
        mined = (family in families) if families else family not in NOT_MINED
        ranked = []
        if mined:
            for key, count in seen[family].items():
                share = count / n
                lift = share / (overall[key] / total)
                if count < MIN_POSTINGS or lift < MIN_LIFT:
                    continue
                name, source = display[key]
                ranked.append({"term": key, "display": name, "source": source, "postings": count,
                               "share": round(share, 3), "lift": round(lift, 1),
                               "score": count * min(lift, MAX_LIFT), "example": example[(family, key)]})
            ranked.sort(key=lambda c: c["score"], reverse=True)
        report.append({"family": family, "readable": n, "covered_pct": round(100 * covered[family] / n),
                       "bar": FAMILY_BARS.get(family, COVERAGE_BAR),
                       "median_skills": statistics.median(sizes[family]), "mined": mined,
                       "candidates": ranked[:top]})
    return {"generated": datetime.now(timezone.utc).isoformat(timespec="minutes"), "readable": total,
            "families": report}


def load_pool() -> list[dict]:
    """The live pool as the snapshot counts it: daily sources only, one row per role."""
    from src.database.repositories import job_repository, profile_repository
    from src.database.session import connection
    from src.jobpool import snapshot
    from src.jobpool.opportunities import duplicate_key
    from src.jobpool.sources import FULL_BOARDS, POOL_WINDOWS
    from src.matching.requirements import PROFILER_VERSION

    with connection() as conn:
        rows = profile_repository.pool(conn, {
            **POOL_WINDOWS, "version": PROFILER_VERSION, "families": snapshot.ALL_FAMILIES,
            "too_senior": [], "refreshed": list(FULL_BOARDS), "limit": snapshot.POOL_LIMIT,
        })
        rows = [r for r in rows if r["provider"] in snapshot.DAILY_SOURCES]
        texts = job_repository.descriptions(conn, [r["id"] for r in rows])
    seen, out = set(), []
    for row in rows:
        key = duplicate_key(row["company"], row["title"])
        if key not in seen:
            seen.add(key)
            out.append({"family": row["profile"]["family"], "company": row["company"],
                        "description": texts.get(row["id"], ""), "profile": row["profile"]})
    return out


def main(argv=None) -> int:
    parser = argparse.ArgumentParser(description=__doc__.split("\n\n")[0])
    parser.add_argument("--family", action="append", help="mine only this family (repeatable)")
    parser.add_argument("--top", type=int, default=40, help="candidates per family")
    parser.add_argument("--html", help="write the review page here")
    parser.add_argument("--json", help="write the raw report here")
    args = parser.parse_args(argv)

    report = analyse(load_pool(), set(args.family) if args.family else None, args.top)
    if args.json:
        Path(args.json).write_text(json.dumps(report, indent=1))
    if args.html:
        from src.matching.discover_report import render
        Path(args.html).write_text(render(report))
    for fam in report["families"]:
        flag = "" if fam["covered_pct"] >= fam["bar"] else f"   <- under its {fam['bar']}% bar"
        print(f"{fam['family']:<22}{fam['readable']:>6} readable  {fam['covered_pct']:>3}% covered{flag}")
        for c in fam["candidates"][:8]:
            print(f"    {c['display']:<34}{c['postings']:>4}  x{c['lift']}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
