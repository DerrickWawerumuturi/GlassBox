"""
Reading a job posting's provider fields into clean values. The one
implementation for:

    html_to_text        description HTML -> paragraphs
    iso_utc             provider timestamps -> ISO UTC
    posted_estimate     "Posted 2 days ago" -> an approximate date, labelled as one
    workplace           remote / hybrid / onsite, only on evidence
    employment_text     FULL_TIME / FullTime -> "Full-time"
    salary_text         structured salary -> display string

What a posting *asks for* — years, skills, seniority — is read by
src/matching/requirements.py. Used by the daily fetch (sources.py), pasted
links (extract.py), SkillNer's preprocessing and the opportunities list.
Deliberately light: no spaCy, no database, so the fast paths can import it.
"""
import re
from datetime import datetime, timedelta, timezone
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


_RELATIVE = re.compile(r"(\d+|an?|one)\+?\s*(minute|hour|day|week|month)s?\s+ago", re.I)
_UNIT_DAYS = {"minute": 1 / 1440, "hour": 1 / 24, "day": 1, "week": 7, "month": 30}


def posted_estimate(raw: str | None, seen_at: datetime | None) -> datetime | None:
    """
    An approximate posting date from a relative phrase, anchored at the moment
    the phrase was read. JSearch only says "2 days ago"; stored as said, it is
    turned into a date here for sorting — and callers label it an estimate,
    because the provider never gave an absolute time.
    """
    if not raw or seen_at is None:
        return None
    text = raw.strip().lower()
    if text in ("today", "just now", "just posted"):
        return seen_at
    if text == "yesterday":
        return seen_at - timedelta(days=1)
    m = _RELATIVE.search(text)
    if not m:
        return None
    amount = 1 if m.group(1).lower() in ("a", "an", "one") else int(m.group(1))
    return seen_at - timedelta(days=amount * _UNIT_DAYS[m.group(2).lower()])


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
