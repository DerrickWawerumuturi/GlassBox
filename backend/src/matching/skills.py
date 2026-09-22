"""
One skill vocabulary for matching: every surface form a CV or a posting uses,
mapped onto one key per skill.

    canonical(name)    a skill name ("React.js", "Postgres", "Python (Programming
                       Language)") -> "react", "postgresql", "python", or None
    find_skills(text)  every skill a piece of prose mentions, in order
    credit(have, want) how far a candidate's skills cover one required skill

The vocabulary itself is data (skills.txt). Matching runs over whole words with
the longest alias winning, so "React Native" never also counts as React, and it
is plain dictionary lookups: a 6 KB posting takes about a millisecond, which is
what lets the daily fetch profile the whole pool without spaCy.
"""
import re
from dataclasses import dataclass, field
from pathlib import Path

VOCABULARY_FILE = Path(__file__).with_name("skills.txt")

# ".net" has to be tried before the general pattern, which cannot start with a dot.
_TOKEN = re.compile(r"\.net\b|[a-z0-9][a-z0-9+#]*(?:\.[a-z0-9][a-z0-9+#]*)*", re.I)
# "Go", "R", "C" count only where a language is being named: an item in a list,
# or next to words that only surround a programming language.
_BEFORE_ITEM = frozenset(",/(|;•·&\n")
_AFTER_ITEM = frozenset(",/)|;\n")
_WORDS_BEFORE = frozenset({"and", "or", "in", "of", "with", "using", "know", "knows", "write", "writing", "written",
                           "shipping", "ship", "like", "including", "especially", "primarily", "mainly",
                           "proficient", "fluent", "learn", "learning"})
_WORDS_AFTER = frozenset({"and", "or", "code", "services", "microservices", "backend", "backends", "developer",
                          "developers", "engineer", "engineers", "programming", "experience", "codebase",
                          "stack", "modules", "concurrency", "applications"})
_QUALIFIER = re.compile(r"\s*\([^)]*\)\s*$")


@dataclass(frozen=True)
class Skill:
    key: str
    name: str
    category: str
    related: dict = field(default_factory=dict)


def tokens(text: str) -> list[re.Match]:
    return list(_TOKEN.finditer(text or ""))


def _load(path: Path = VOCABULARY_FILE):
    skills, folded, exact, in_list = {}, {}, {}, {}
    for line in path.read_text(encoding="utf-8").splitlines():
        line = line.strip()
        if not line or line.startswith("#"):
            continue
        key, name, category, aliases, related = (part.strip() for part in line.split("|"))
        credits = {}
        for pair in filter(None, (p.strip() for p in related.split(","))):
            other, _, value = pair.partition("=")
            credits[other.strip()] = float(value)
        skills[key] = Skill(key, name, category, credits)
        for alias in filter(None, (a.strip() for a in aliases.split(","))):
            if alias[0] in "^~":
                (exact if alias[0] == "^" else in_list)[alias[1:]] = key
            else:
                folded[tuple(t.group().lower() for t in tokens(alias))] = key

    unknown = {o for s in skills.values() for o in s.related if o not in skills}
    if unknown:
        raise ValueError(f"skills.txt relates to skills it does not define: {sorted(unknown)}")
    return skills, folded, exact, in_list


SKILLS, _FOLDED, _EXACT, _IN_LIST = _load()
_LONGEST = max(len(alias) for alias in _FOLDED)


def display(key: str) -> str:
    skill = SKILLS.get(key)
    return skill.name if skill else key


def category(key: str) -> str | None:
    skill = SKILLS.get(key)
    return skill.category if skill else None


def canonical(name: str | None) -> str | None:
    """The key for a skill *name*. None when the vocabulary does not know it."""
    cleaned = _QUALIFIER.sub("", (name or "").strip())
    words = tuple(t.group().lower() for t in tokens(cleaned))
    if not words:
        return None
    if words in _FOLDED:
        return _FOLDED[words]
    # A name is a skill by definition, so the capitalisation rules that protect
    # prose ("go to market") do not apply to it.
    joined = " ".join(words)
    return next((key for alias, key in (*_EXACT.items(), *_IN_LIST.items()) if alias.lower() == joined), None)


def _in_list(text: str, found: list[re.Match], i: int) -> bool:
    start, end = found[i].start(), found[i].end()
    # R&D, C-level, Go-to-market: a compound, not a language.
    if text[end:end + 1] in ("&", "-"):
        return False
    before = text[found[i - 1].end() if i else 0:start]
    after = text[end:found[i + 1].start() if i + 1 < len(found) else len(text)]
    if _BEFORE_ITEM.intersection(before) or _AFTER_ITEM.intersection(after):
        return True
    word_before = found[i - 1].group().lower() if i else ""
    word_after = found[i + 1].group().lower() if i + 1 < len(found) else ""
    return word_before in _WORDS_BEFORE or word_after in _WORDS_AFTER


def scan(text: str | None) -> list[tuple[str, int, int]]:
    """Every skill mention in prose as (key, start, end); the longest alias wins."""
    if not text:
        return []
    found = tokens(text)
    words = [t.group().lower() for t in found]
    hits = []
    i = 0
    while i < len(found):
        for n in range(min(_LONGEST, len(found) - i), 0, -1):
            key = _FOLDED.get(tuple(words[i:i + n]))
            if key is None and n == 1:
                surface = found[i].group()
                key = _EXACT.get(surface) or (_IN_LIST.get(surface) if surface in _IN_LIST and _in_list(text, found, i)
                                              else None)
            if key:
                hits.append((key, found[i].start(), found[i + n - 1].end()))
                i += n
                break
        else:
            i += 1
    return hits


def find_skills(text: str | None) -> list[str]:
    """Skill keys mentioned in prose, first mention first, each once."""
    return list(dict.fromkeys(key for key, _, _ in scan(text)))


def resolve_all(names) -> tuple[set[str], list[str]]:
    """
    A CV's skill list -> (known keys, names the vocabulary does not know).

    Each entry is tried as a name first, then as prose, so "React & Next.js"
    yields both skills. Unknown names are returned rather than dropped: they
    still belong on the profile, they just cannot be matched.
    """
    known, unknown = set(), []
    for name in names or []:
        if not name or not str(name).strip():
            continue
        key = canonical(str(name))
        hits = [key] if key else find_skills(str(name))
        if hits:
            known.update(hits)
        else:
            unknown.append(str(name).strip())
    return known, unknown


def credit(have: set[str], want: str) -> float:
    """1.0 for the skill itself, else the best related credit, else 0."""
    if want in have:
        return 1.0
    return max((SKILLS[h].related.get(want, 0.0) for h in have if h in SKILLS), default=0.0)
