"""
A pasted job ad -> what it asks for (POST /market/ad).

    read_text(text) -> {"title", "family", "level", "asks"}
    read_url(url)   -> the same, from the page at a link (safe_fetch.py)

The ad is read by the same rules as every job in the pool (requirements.profile_job),
so "required" here means what it means in the counts the landing page shows.
Nothing is stored or logged: the text lives for the length of the request.
"""
import re
import textwrap
from html import unescape
from types import SimpleNamespace

from src.jobpool.market_look import bucket
from src.jobpool.posting import html_to_text
from src.jobpool.safe_fetch import CANT_READ, UnreadableLink, fetch_page
from src.matching.requirements import profile_job
from src.matching.roles import classify_family, classify_seniority
from src.matching.skills import display

MAX_CHARS = 50_000
# A title is a line, not a paragraph: longer than this, the first line is prose.
TITLE_CHARS = 120
_BULLETS = " \t•*·>#-–"
_OPEN_TITLE = re.compile(r"<title\b", re.I)
_CLOSE_TITLE = re.compile(r"</title\b", re.I)
# The profiler reads each skill and each years figure against the sentence
# around it, found by scanning out to the nearest full stop or line break. Text
# with none ("5+ years experience, " repeated to 50k characters) makes that a
# scan of the whole ad per hit: 30-40 s of CPU for one request, measured. No
# real ad has a sentence this long, so longer runs are broken into lines first.
LONGEST_RUN = 600
_RUN = re.compile(rf"[^.;\n•]{{{LONGEST_RUN + 1},}}")


class AdTooLong(ValueError):
    pass


def first_line(text: str) -> str:
    """The first short line of the ad, or "" when it opens with prose."""
    for line in text.splitlines():
        line = line.strip().strip(_BULLETS).strip()
        if line:
            return line if len(line) <= TITLE_CHARS else ""
    return ""


def page_title(page: str) -> str:
    """
    The page's <title>, found with one search per end. "<title[^>]*>(.*?)</title>"
    rescans to the end of the page for every "<title" it meets, and a page is
    whatever a stranger's server sends.
    """
    start = _OPEN_TITLE.search(page)
    opened = page.find(">", start.end()) if start else -1
    end = _CLOSE_TITLE.search(page, opened) if opened != -1 else None
    if not end:
        return ""
    return " ".join(unescape(page[opened + 1:end.start()]).split())[:TITLE_CHARS]


def _bounded(text: str) -> str:
    return _RUN.sub(lambda m: textwrap.fill(m.group(), LONGEST_RUN, break_long_words=False,
                                            break_on_hyphens=False), text)


def _asks(title: str, text: str) -> dict:
    text = _bounded(text)
    profile = profile_job(SimpleNamespace(title=title, description=text, experience_level=None,
                                          employment_type=None, company=None))
    asks = [{"key": key, "name": display(key), "kind": "req"} for key in profile.required]
    asks += [{"key": key, "name": display(key), "kind": "opt"} for key in profile.preferred]
    return {
        "title": title,
        # From the title alone (api contract): the page compares the ad with
        # the family and level its reader would search for, which a title names.
        "family": classify_family(title),
        "level": bucket(classify_seniority(title)),
        "asks": asks,
    }


def read_text(text: str) -> dict:
    if len(text) > MAX_CHARS:
        raise AdTooLong("That ad is too long. Paste up to 50,000 characters.")
    plain = html_to_text(text) or ""
    return _asks(first_line(plain), plain)


def read_url(url: str) -> dict:
    _, page = fetch_page(url.strip())
    title = page_title(page)
    text = (html_to_text(page) or "")[:MAX_CHARS]
    if not text.strip():
        raise UnreadableLink(CANT_READ)
    return _asks(title or first_line(text), text)
