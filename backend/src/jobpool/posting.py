"""
Reading a job posting's text. The one implementation for everything that turns
provider fields into clean values:

    html_to_text        description HTML -> paragraphs
    iso_utc             provider timestamps -> ISO UTC
    extract_experience  years of experience, required vs preferred
    workplace           remote / hybrid / onsite, only on evidence
    employment_text     FULL_TIME / FullTime -> "Full-time"
    salary_text         structured salary -> display string
    match_skills        canonical skill names mentioned in a posting

Used by the daily fetch (sources.py), pasted links (extract.py), SkillNer's
preprocessing (skill_extractor.py) and jobhunt. Deliberately light: no spaCy,
no database, so the fast paths can import it.
"""
import re
from datetime import datetime, timezone
from html import unescape
from html.parser import HTMLParser

# ------------------------------------------------------------------ HTML

# Tags that end a line of prose. Turning them into blank lines is what restores
# the paragraph structure skill extraction's section filters depend on.
_BLOCK_TAGS = frozenset({
    "p", "br", "div", "li", "ul", "ol", "tr", "td", "table", "section",
    "article", "header", "footer", "blockquote", "hr",
    "h1", "h2", "h3", "h4", "h5", "h6",
})
_SKIP_CONTENT = frozenset({"script", "style", "noscript"})
_HTML_MARKER = re.compile(r"<[a-zA-Z/!]")
_ESCAPED_HTML_MARKER = re.compile(r"&(?:amp;)*lt;[a-zA-Z/!]")


class _HTMLToText(HTMLParser):
    def __init__(self):
        super().__init__(convert_charrefs=True)
        self.parts = []
        self._skipping = 0

    def handle_starttag(self, tag, attrs):
        if tag in _SKIP_CONTENT:
            self._skipping += 1
        elif tag in _BLOCK_TAGS:
            self.parts.append("\n\n")

    def handle_endtag(self, tag):
        if tag in _SKIP_CONTENT:
            self._skipping = max(0, self._skipping - 1)
        elif tag in _BLOCK_TAGS:
            self.parts.append("\n\n")

    def handle_data(self, data):
        if not self._skipping:
            self.parts.append(data)


def html_to_text(text: str | None) -> str | None:
    """
    Flatten a description into paragraphs, keeping the blank lines.

    Collapsing everything onto one line was the earlier approach, and it left
    skill extraction a single block it could not strip boilerplate from —
    measured on Remotive: 127 tags, 1 block, 0% reduction. Greenhouse sends its
    HTML escaped (&lt;p&gt;), so that is unescaped first.
    """
    if not text:
        return text
    text = str(text)
    parsed = False
    # Boards nest their escaping: real tags around escaped ones, or HTML escaped
    # twice. Each pass exposes the next layer, so repeat until none is left.
    for _ in range(3):
        if _HTML_MARKER.search(text):
            parser = _HTMLToText()
            try:
                parser.feed(text)
                parser.close()
            except Exception:
                break
            text, parsed = "".join(parser.parts), True
        elif _ESCAPED_HTML_MARKER.search(text):
            text = unescape(text)
        else:
            break
    if not parsed:
        text = unescape(text)
    # A description stored cut off mid-tag ends in a fragment no parser removes.
    text = re.sub(r"<[a-zA-Z/][^>]*$", "", text)
    text = text.replace("\xa0", " ")
    text = re.sub(r"[ \t]+", " ", text)
    text = re.sub(r" *\n *", "\n", text)
    text = re.sub(r"\n{3,}", "\n\n", text)
    return text.strip()


# ------------------------------------------------------------- timestamps

def iso_utc(value) -> str | None:
    """Epoch seconds, epoch milliseconds or an ISO string, as an ISO UTC string."""
    if value in (None, ""):
        return None
    if isinstance(value, (int, float)) or str(value).isdigit():
        n = float(value)
        if n > 1e12:
            n /= 1000
        return datetime.fromtimestamp(n, timezone.utc).isoformat()
    try:
        parsed = datetime.fromisoformat(str(value).strip().replace("Z", "+00:00"))
    except ValueError:
        return None
    if parsed.tzinfo is None:
        parsed = parsed.replace(tzinfo=timezone.utc)
    return parsed.astimezone(timezone.utc).isoformat()


# ------------------------------------------------------------- experience

_REQUIRED_MARKERS = [
    "requirements", "required qualifications", "minimum qualifications",
    "basic qualifications", "what you'll need", "what you will need",
    "what we're looking for", "what we are looking for", "must have",
    "must-have", "you have", "you will have", "essential", "qualifications",
    "who you are", "required skills", "required experience", "about you",
]
_PREFERRED_MARKERS = [
    "preferred qualifications", "preferred", "nice to have", "nice-to-have",
    "bonus points", "bonus", "it's a plus", "is a plus", "plus if",
    "desirable", "good to have", "we'd love", "we would love",
    "additional qualifications", "extra credit",
]
_STOP_MARKERS = [
    "benefits", "what we offer", "perks", "compensation", "salary",
    "equal opportunity", "about us", "how to apply", "our values", "eeo",
]


def split_sections(text: str) -> dict[str, str]:
    """
    Label spans of the posting as required / preferred / general.

    Markers are found in document order; each one owns the text up to the next
    marker. Anything before the first marker is `general`.
    """
    low = (text or "").lower()
    if not low.strip():
        return {"required": "", "preferred": "", "general": ""}

    hits = []
    for kind, markers in (("required", _REQUIRED_MARKERS),
                          ("preferred", _PREFERRED_MARKERS),
                          ("stop", _STOP_MARKERS)):
        for marker in markers:
            for match in re.finditer(rf"(?<![\w]){re.escape(marker)}", low):
                hits.append((match.start(), kind, len(marker)))
    # Longest marker wins at the same position ("preferred qualifications"
    # must beat the bare "preferred" nested inside it).
    hits.sort(key=lambda h: (h[0], -h[2]))
    deduped, last_end = [], -1
    for start, kind, length in hits:
        if start >= last_end:
            deduped.append((start, kind))
            last_end = start + length

    if not deduped:
        return {"required": "", "preferred": "", "general": low}

    out = {"required": [], "preferred": [], "general": [low[:deduped[0][0]]]}
    for i, (start, kind) in enumerate(deduped):
        end = deduped[i + 1][0] if i + 1 < len(deduped) else len(low)
        if kind != "stop":
            out[kind].append(low[start:end])
    return {k: " ".join(v) for k, v in out.items()}


_RANGE = re.compile(r"(\d{1,2})\s*(?:-|–|to|\+?\s*-\s*)\s*(\d{1,2})\s*\+?\s*years?", re.I)
_SINGLE = [
    # "5+ years" on its own. The plus sign is what makes this safe to read as a
    # requirement rather than prose ("founded 10 years ago" has no plus).
    re.compile(r"(\d{1,2})\s*\+\s*years?", re.I),
    # "3 years building web applications" — a requirement without the word
    # "experience" anywhere near it, which is extremely common.
    re.compile(r"(\d{1,2})\s*years?\s+(?:of\s+|in\s+|with\s+|building\s+|working\s+|"
               r"developing\s+|professional\s+|relevant\s+|industry\s+)", re.I),
    re.compile(r"(\d{1,2})\s*\+?\s*(?:or more\s+)?years?[^.;\n]{0,45}?experience", re.I),
    re.compile(r"experience[^.;\n]{0,45}?(\d{1,2})\s*\+?\s*years?", re.I),
    re.compile(r"minimum\s+(?:of\s+)?(\d{1,2})\s*\+?\s*years?", re.I),
    re.compile(r"at\s+least\s+(\d{1,2})\s*\+?\s*years?", re.I),
]
_SOFT_PREFERRED = ("preferred", "ideally", "nice to have", "a plus", "bonus", "desirable")


def _years_in(text: str) -> int | None:
    """Lowest years figure stated in this span, or None."""
    if not text:
        return None
    found = [min(int(m.group(1)), int(m.group(2))) for m in _RANGE.finditer(text)]
    for pattern in _SINGLE:
        found.extend(n for n in (int(m.group(1)) for m in pattern.finditer(text)) if 0 <= n <= 20)
    return min(found) if found else None


def extract_experience(title: str | None, description: str | None) -> dict:
    """
    {"years": int | None, "kind": "required" | "preferred" | "unstated"}

    Takes the LOWEST figure found, because postings routinely pair a hard
    minimum with higher aspirational numbers, and reading the higher one throws
    away reachable jobs.
    """
    sections = split_sections(description or "")
    required = _years_in(sections["required"])
    preferred = _years_in(sections["preferred"])
    general = _years_in(sections["general"] + " " + (title or ""))

    if required is not None:
        # A figure inside a requirements block can still be softened in place.
        soft = any(word in sections["required"] for word in _SOFT_PREFERRED) and preferred is None
        return {"years": required, "kind": "preferred" if soft else "required"}
    if general is not None:
        return {"years": general, "kind": "required"}
    if preferred is not None:
        return {"years": preferred, "kind": "preferred"}
    return {"years": None, "kind": "unstated"}


# ------------------------------------------------------- display values

def workplace(job) -> str | None:
    """Remote / hybrid / onsite, only on evidence. A wrong guess is worse than a blank."""
    stated = str((job.raw or {}).get("workplaceType") or "").lower().replace("-", "").replace("_", "")
    if stated in ("remote", "hybrid", "onsite"):
        return stated
    head = f"{job.title or ''} {job.location or ''}".lower()
    body = (job.description or "")[:6000].lower()
    if re.search(r"\bhybrid\b", head) or re.search(r"\bhybrid (?:role|position|work|working|schedule|model|setup)\b", body):
        return "hybrid"
    if job.remote or re.search(r"\bremote\b", head):
        return "remote"
    if re.search(r"\b(?:on-?site|in[- ]office)\b", head) or re.search(
            r"\b(?:this is an? )?(?:on-?site|in[- ]office) (?:role|position|job)\b", body):
        return "onsite"
    return None


def employment_text(value: str | None) -> str | None:
    """FULL_TIME, FullTime and full-time all read "Full-time"."""
    if not value:
        return None
    words = re.sub(r"([a-z])([A-Z])", r"\1 \2", value).replace("_", " ").replace("-", " ").lower().split()
    return "-".join(words).capitalize() if len(words) == 2 and words[1] == "time" else value


def salary_text(job) -> str | None:
    if not (job.salary_min or job.salary_max):
        return None
    amount = "–".join(f"{float(v):,.0f}" for v in (job.salary_min, job.salary_max) if v)
    unit = re.sub(r"^per-|-salary$", "", str(job.salary_period or "").lower()).replace("yearly", "year").replace("annual", "year")
    return f"{job.salary_currency or ''} {amount}{f' / {unit}' if unit else ''}".strip()


# ---------------------------------------------------------------- skills

# Canonical names that are real database entries but are job titles, fields of
# study or document artefacts rather than differentiating skills. Listing
# "Software Engineering" as a top skill for software jobs answers no question.
NOT_SKILLS = frozenset({
    "software engineering",
    "software development",
    "computer science",
    "computer engineering",
    "electrical engineering",
    "job descriptions",
    "innovation",
    "operations",
    "scale (map)",
    "scholastic read 180",
    "target 3001!",
    # "transformation" in a business/data context matches a genetics entry.
    # Remove this line if the search is ever pointed at biotech postings.
    "transformation (genetics)",
    # "programming" in a software posting matches the musical sense.
    "programming (music)",
})

# Real skills, but they describe how someone works rather than what they can
# do. Kept in market statistics; left off a job's review card.
SOFT_SKILLS = frozenset({
    "problem solving", "collaboration", "writing", "leadership", "english language",
    "management", "integration", "infrastructure", "reliability", "workflows",
    "automation", "communication", "communications", "research", "planning",
    "teamwork", "mentorship", "coordinating",
})


def match_skills(text: str | None, vocabulary: list[str], limit: int = 12) -> list[str]:
    """
    Canonical skills (from the skills table) named in a posting, most-mentioned
    first. String matching, not SkillNer: a pasted link has to answer in a
    second, and SkillNer takes minutes to load.
    """
    if not text:
        return []
    counts = {}
    for name in vocabulary:
        if name.lower() in NOT_SKILLS:
            continue
        surface = re.sub(r"\s*\(.*\)$", "", name).strip()
        if len(surface) < 3 or surface.lower() in SOFT_SKILLS:
            continue
        hits = len(re.findall(rf"(?<![\w+#.]){re.escape(surface)}(?![\w+#])", text, re.I))
        if hits:
            counts[name] = hits
    return sorted(counts, key=lambda n: -counts[n])[:limit]
