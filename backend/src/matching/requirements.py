"""
What a job asks for, read from its posting: the job side of matching.

    profile_job(job) -> JobProfile   role family, seniority, years, required and
                                     preferred skills, work authorisation, language

Deterministic and cheap — regex and dictionary lookups, no model — so the daily
fetch profiles every new posting and the result is stored (job_profiles), not
recomputed per user. Rules were proven in jobhunt against a real corpus first.

The required/preferred split is the part that matters most: "5 years required"
and "5 years preferred" are different jobs, and a stack listed under "nice to
have" must not count against anybody.
"""
import hashlib
import re
from dataclasses import asdict, dataclass
from functools import lru_cache

from src.jobpool.posting import html_to_text
from src.matching.roles import classify_family, classify_seniority, track
from src.matching.skills import find_skills, scan

# Bump when any rule here or the vocabulary (skills.txt) changes: the daily run
# re-profiles every stored job whose profile carries another version, and market
# snapshots start a new series. v2: 66 skills added from the discovery report.
PROFILER_VERSION = "requirements-v2"

# Postings too short to judge: Kenyan boards syndicate 100-500 byte summaries.
THIN_BELOW = 800

# ------------------------------------------------------------------ sections

_REQUIRED_MARKERS = (
    "requirements", "required qualifications", "minimum qualifications",
    "basic qualifications", "what you'll need", "what you will need",
    "what we're looking for", "what we are looking for", "must have",
    "must-have", "you have", "you will have", "essential", "qualifications",
    "who you are", "required skills", "required experience", "about you",
    "your profile", "dein profil", "ihr profil", "anforderungen",
)
_PREFERRED_MARKERS = (
    "preferred qualifications", "preferred", "nice to have", "nice-to-have",
    "bonus points", "bonus", "desirable", "good to have", "we'd love",
    "we would love", "additional qualifications", "extra credit", "wünschenswert",
)
_STOP_MARKERS = (
    "benefits", "what we offer", "perks", "compensation", "salary",
    "equal opportunity", "about us", "how to apply", "our values", "eeo",
    "wir bieten", "was wir bieten",
)
# A marker opens a section only where it reads as a heading: at the start of a
# line, or followed by a colon. Inline, the same words are a softener inside a
# sentence ("Kubernetes is a plus") and are judged per clause instead; taking
# them as headings cut sentences in half and filed what followed them wrongly.
# Longest first, so "preferred qualifications" wins over "preferred".
_MARKERS = sorted(((m, kind) for kind, markers in (("required", _REQUIRED_MARKERS), ("preferred", _PREFERRED_MARKERS),
                                                   ("stop", _STOP_MARKERS)) for m in markers),
                  key=lambda mk: -len(mk[0]))
_BULLETS = " \t•*·>#-–"
_SOFT = re.compile(r"prefer|ideally|nice to have|a plus|bonus|desirable|would be great|advantage", re.I)
_SENTENCE = ".;\n•"
_CLAUSE = ".;\n•,()"


def _marker_at(low: str, at: int) -> tuple[str, str] | None:
    """The (marker, kind) starting exactly at `at`, if a whole word begins there."""
    for marker, kind in _MARKERS:
        end = at + len(marker)
        if low.startswith(marker, at) and (end == len(low) or not low[end].isalnum()):
            return marker, kind
    return None


@lru_cache(maxsize=64)
def _spans(text: str) -> tuple[tuple[int, int, str], ...]:
    """
    The posting cut into (start, end, kind) spans, kind general/required/preferred/stop.

    Plain string checks at line starts and before colons — one pass, where one
    regex per marker cost ~50 ms a posting and would have made the daily
    profile of the pool take an hour.
    """
    low = text.lower()
    hits = {}
    line_start = 0
    for line in low.split("\n"):
        at = line_start + len(line) - len(line.lstrip(_BULLETS))
        found = _marker_at(low, at)
        if found:
            hits[at] = found[1]
        line_start += len(line) + 1
    colon = low.find(":")
    while colon != -1:
        head = low[max(0, colon - 40):colon].rstrip()
        end = max(0, colon - 40) + len(head)
        for marker, kind in _MARKERS:
            at = end - len(marker)
            if head.endswith(marker) and (at == 0 or not low[at - 1].isalnum()):
                hits.setdefault(at, kind)
                break
        colon = low.find(":", colon + 1)

    spans, cursor, kind = [], 0, "general"
    for start in sorted(hits):
        if start >= cursor:
            spans.append((cursor, start, kind))
            cursor, kind = start, hits[start]
    spans.append((cursor, len(text), kind))
    return tuple(span for span in spans if span[1] > span[0])


def _kind_at(spans, position: int) -> str:
    return next((kind for start, end, kind in spans if start <= position < end), "general")


def _around(text: str, start: int, end: int, delimiters: str) -> str:
    """The stretch of `text` holding start..end, bounded by the nearest delimiters."""
    left = max(text.rfind(c, 0, start) for c in delimiters) + 1
    rights = [i for i in (text.find(c, end) for c in delimiters) if i != -1]
    return text[left:min(rights, default=len(text))]


def split_sections(text: str) -> dict[str, str]:
    """The posting's text by kind: required / preferred / general (stop spans dropped)."""
    text = text or ""
    out = {"required": [], "preferred": [], "general": []}
    for start, end, kind in _spans(text):
        if kind != "stop":
            out[kind].append(text[start:end])
    return {k: "\n".join(v) for k, v in out.items()}


# ---------------------------------------------------------------- experience

_YEARS = r"(?:years?|yrs?)"
_RANGE = re.compile(rf"(\d{{1,2}})\s*(?:-|–|—|to)\s*(\d{{1,2}})\s*\+?\s*{_YEARS}", re.I)
_SINGLE = [
    # "5+ years" alone. The plus is what separates a requirement from prose.
    re.compile(rf"(\d{{1,2}})\s*\+\s*{_YEARS}", re.I),
    # "3 years building web applications": no "experience" in sight, very common.
    re.compile(rf"(\d{{1,2}})\s*{_YEARS}\s+(?:of|in|with|building|working|developing|professional|relevant|"
               r"industry|hands.on|commercial|practical)\b", re.I),
    re.compile(rf"(\d{{1,2}})\s*\+?\s*(?:or more\s+)?{_YEARS}[^.;\n]{{0,45}}?experience", re.I),
    re.compile(rf"experience[^.;\n]{{0,45}}?(\d{{1,2}})\s*\+?\s*{_YEARS}", re.I),
    re.compile(rf"minimum\s+(?:of\s+)?(\d{{1,2}})\s*\+?\s*{_YEARS}", re.I),
    re.compile(rf"at\s+least\s+(\d{{1,2}})\s*\+?\s*{_YEARS}", re.I),
]
_NUMBER_WORDS = {w: str(n) for n, w in enumerate("zero one two three four five six seven eight nine ten".split())}
_WORD_YEARS = re.compile(rf"\b({'|'.join(_NUMBER_WORDS)})\b(?:\s*\(\d{{1,2}}\))?(?=\s*\+?\s*(?:or more\s+)?{_YEARS})",
                         re.I)
# A figure in a sentence with these words is prose about the company.
_PROSE = re.compile(r"founded|years ago|in business|over the past|established|anniversary|years old|of age\b|"
                    r"\bwe(?:'ve| have)\b|\bour (?:team|company|founders?)\b", re.I)
MAX_PLAUSIBLE_YEARS = 15


def _figures(text: str) -> list[tuple[int, int, int]]:
    """Every years figure as (start, end, years), positions in `text`."""
    # "two (2) years" -> "2" padded to the same length, so positions still line up.
    text = _WORD_YEARS.sub(lambda m: _NUMBER_WORDS[m.group(1).lower()].ljust(len(m.group())), text or "")
    found, masked = [], []
    # Ranges first: "2-4 years" gates on 2, and its span is masked so the single
    # patterns cannot read the 4 back out as a separate requirement.
    for m in _RANGE.finditer(text):
        found.append((m.start(), m.end(), min(int(m.group(1)), int(m.group(2)))))
        masked.append((m.start(), m.end()))
    for pattern in _SINGLE:
        found.extend((m.start(), m.end(), int(m.group(1))) for m in pattern.finditer(text)
                     if not any(s <= m.start() < e for s, e in masked))
    return [f for f in found if f[2] <= MAX_PLAUSIBLE_YEARS and not _PROSE.search(_around(text, f[0], f[1], _SENTENCE))]


def extract_experience(title: str | None, description: str | None) -> dict:
    """
    {"years": int | None, "kind": "required" | "preferred" | "unstated"}

    Required figures are conjunctive, so the HIGHEST one is the gate: a posting
    asking "4+ years shipping Go" AND "2+ years on distributed systems" needs
    four (measured on a real Supabase posting in jobhunt, where taking the
    lowest let a four-year role through). Preferred figures are aspirations, so
    the lowest one counts. A figure softened in its own clause ("ideally 5+
    years") is preferred wherever it appears.
    """
    text = description or ""
    spans = _spans(text)
    required, general, wished = [], [], []
    for start, end, years in _figures(text):
        kind = _kind_at(spans, start)
        if kind == "stop":
            continue
        if kind == "preferred" or _SOFT.search(_around(text, start, end, _CLAUSE)):
            wished.append(years)
        else:
            (required if kind == "required" else general).append(years)
    general += [years for _, _, years in _figures(title or "")]

    if required:
        return {"years": max(required), "kind": "required"}
    if general:
        return {"years": max(general), "kind": "required"}
    if wished:
        return {"years": min(wished), "kind": "preferred"}
    return {"years": None, "kind": "unstated"}


def _skills(text: str, title: str | None) -> tuple[list[str], list[str], list[str]]:
    """
    (required, preferred, mentioned) skills.

    A skill named in the title is required ("React Developer"). A posting with
    no requirements heading puts everything in `general`, and that is its
    requirement list: treating it as a job that asks for nothing would score
    every thin listing as a perfect skills match.
    """
    spans = _spans(text)
    headed = any(kind == "required" for _, _, kind in spans)
    buckets = {"required": {}, "preferred": {}, "general": {}}
    for key in find_skills(title):
        buckets["required"].setdefault(key)
    for key, start, end in scan(text):
        kind = _kind_at(spans, start)
        if kind == "stop":
            continue
        if kind == "general" and not headed:
            kind = "required"
        if kind == "required" and _SOFT.search(_around(text, start, end, _CLAUSE)):
            kind = "preferred"
        buckets[kind].setdefault(key)
    required = list(buckets["required"])
    preferred = [k for k in buckets["preferred"] if k not in buckets["required"]]
    mentioned = [k for k in buckets["general"] if k not in buckets["required"] and k not in buckets["preferred"]]
    return required, preferred, mentioned


# --------------------------------------------------- eligibility, language, PhD

# Who a posting will employ, stated in its text rather than a location field.
# A job whose location says "Remote" and whose body says "must be authorised to
# work in the US" is not remote for anyone else — roughly half of remote ATS
# postings do this (jobhunt, measured on its shortlist).
_US = r"(?:the )?(?:u\.?s\.?a?\.?|united states(?: of america)?)"
_AUTHORISATION = [
    ("us", rf"(?:authori[sz]ed|eligible|permitted|legally able) to work in {_US}|"
           rf"(?:u\.?s\.?|us) (?:work authori[sz]ation|citizens? only|citizenship is required)|"
           rf"must (?:be|hold) (?:a )?(?:u\.?s\.?|us|united states) (?:citizen|person|green card)|"
           rf"must (?:be based|reside|live|be located) in {_US}|(?:active|current) security clearance|\bitar\b"),
    ("gb", r"right to work in the (?:uk|united kingdom)|(?:authori[sz]ed|eligible) to work in the (?:uk|united kingdom)|"
           r"must (?:be based|reside|live|be located) in the (?:uk|united kingdom)"),
    ("ca", r"(?:authori[sz]ed|eligible|legally entitled) to work in canada|must (?:be based|reside|live|be located) in canada"),
    ("eu", r"(?:right|eligible|authori[sz]ed|permit) to work in the (?:eu|european union|eea)|eu work permit|"
           r"must (?:be based|reside|live|be located) in the (?:eu|european union)"),
    ("au", r"(?:right|eligible|authori[sz]ed) to work in australia|australian citizen"),
    ("de", r"(?:arbeitserlaubnis|work permit) (?:für|for) (?:deutschland|germany)"),
]
_NO_SPONSORSHIP = re.compile(r"(?:unable|not able|cannot|can't|won't|will not|do not|don't|does not|doesn't|not) "
                             r"(?:to )?(?:offer |provide )?(?:visa )?sponsor|no (?:visa )?sponsorship|"
                             r"sponsorship\W+(?:is\s+)?(?:not\s+|un)available", re.I)
_NEGATION = re.compile(r"\b(?:not|no|never|without)\b")


_AUTHORISATION_WORDS = re.compile(r"authori[sz]|eligible|permitted|legally|citizen|clearance|itar|right to work|"
                                  r"work permit|arbeitserlaubnis|must (?:be based|reside|live|be located)")


def work_authorisation(text: str) -> list[str]:
    """Countries (or "eu") whose work authorisation the posting demands."""
    low = (text or "").lower()
    if not _AUTHORISATION_WORDS.search(low):
        return []
    found = []
    for code, pattern in _AUTHORISATION:
        for m in re.finditer(pattern, low):
            sentence = low[max(low.rfind(".", 0, m.start()), low.rfind("\n", 0, m.start())) + 1:m.start()]
            # "You do not need to be authorised to work in the US" says the opposite.
            if not _NEGATION.search(sentence):
                found.append(code)
                break
    return found


LANGUAGES = {
    "german": "de", "deutsch": "de", "french": "fr", "dutch": "nl", "spanish": "es", "portuguese": "pt",
    "italian": "it", "polish": "pl", "swedish": "sv", "danish": "da", "norwegian": "no", "finnish": "fi",
    "japanese": "ja", "korean": "ko", "mandarin": "zh", "chinese": "zh", "cantonese": "zh", "arabic": "ar",
    "hebrew": "he", "turkish": "tr", "russian": "ru", "ukrainian": "uk", "czech": "cs", "romanian": "ro",
    "hungarian": "hu", "greek": "el", "bulgarian": "bg", "hindi": "hi", "vietnamese": "vi", "thai": "th",
    "indonesian": "id", "tagalog": "tl", "swahili": "sw", "kiswahili": "sw", "amharic": "am", "somali": "so",
    "yoruba": "yo", "hausa": "ha", "igbo": "ig", "zulu": "zu", "afrikaans": "af", "english": "en",
}
_LANGUAGE = re.compile(rf"\b({'|'.join(LANGUAGES)})\b", re.I)
# "Fluent in English and German": the qualifier comes first and may cover a list.
_QUALIFIER_FIRST = re.compile(r"\b(?:fluen\w*|native|proficien\w*|business.level|business.fluent|"
                              r"professional working|excellent|verhandlungssicher\w*|fließend\w*)\b[^.;\n]{0,60}", re.I)
# "German (C1)", "German is required", "German speaker".
_QUALIFIER_AFTER = re.compile(rf"{_LANGUAGE.pattern}[^.;\n]{{0,30}}?\b(?:fluen\w*|native|required|mandatory|"
                              r"is a must|c1|c2|b2|speaker|speaking|kenntnisse|sprachkenntnisse)\b", re.I)
_TITLE_LANGUAGE = re.compile(rf"(?:[-–(|,]\s*|\b(?:speaking|speaker)\s+){_LANGUAGE.pattern}|{_LANGUAGE.pattern}"
                             r"[\s-]+(?:speaking|speaker|speakers|native|translator|tutor|writer)\b", re.I)
_GERMAN_WORDS = frozenset("und der die das mit für wir sie ist auf zu von den ein eine du dich dein deine bei "
                          "oder als werden über sowie unsere unser ihre im dem des nicht auch wie".split())


_OTHER_LANGUAGES = frozenset(LANGUAGES) - {"english"}


def languages_required(title: str | None, required_text: str, full_text: str) -> list[str]:
    """Non-English working languages the posting demands, as ISO 639-1 codes."""
    names = [m.group(1) or m.group(2) for m in _TITLE_LANGUAGE.finditer(title or "")]
    # The qualifier patterns are slow; most postings name no other language at all.
    if _OTHER_LANGUAGES.intersection(re.findall(r"[a-zäöüß]+", (required_text or "").lower())):
        for m in _QUALIFIER_FIRST.finditer(required_text):
            names += _LANGUAGE.findall(m.group())
        names += [m.group(1) for m in _QUALIFIER_AFTER.finditer(required_text)]
    codes = {LANGUAGES[name.lower()] for name in names}
    words = re.findall(r"[a-zäöüß]+", (full_text or "")[:3000].lower())
    if len(words) > 40 and sum(w in _GERMAN_WORDS for w in words) / len(words) > 0.12:
        codes.add("de")  # written in German: German is the working language
    codes.discard("en")
    return sorted(codes)


_PHD = re.compile(r"\bph\.?\s?d\b|\bdoctorate\b|\bdoctoral degree\b", re.I)
_OTHER_DEGREE = re.compile(r"\b(?:master|m\.?sc?\.?|bachelor|b\.?sc?\.?|or equivalent)\b", re.I)


def phd_requirement(title: str | None, required_text: str, full_text: str) -> str | None:
    if _PHD.search(title or ""):
        return "required"
    for sentence in re.split(r"[.\n;]", required_text or ""):
        if _PHD.search(sentence) and not _OTHER_DEGREE.search(sentence):
            return "required"
    return "preferred" if _PHD.search(full_text or "") else None


# ------------------------------------------------------------------ profile

# An intake named for a year already gone: "Intern: Data Science (Summer 2024)".
# Only next to intake words, so "Windows Server 2019 Administrator" is untouched.
_INTAKE_YEAR = re.compile(r"\b(?:summer|winter|spring|fall|autumn|intake|cohort|class of|graduate|grad|intern\w*|"
                          r"trainee\w*|program(?:me)?)\W+(20\d\d)\b|\b(20\d\d)\W+(?:summer|winter|spring|fall|autumn|"
                          r"intake|cohort|graduate|grad|intern\w*|trainee\w*|program(?:me)?)\b", re.I)


def intake_year(title: str | None) -> int | None:
    m = _INTAKE_YEAR.search(title or "")
    return int(m.group(1) or m.group(2)) if m else None


@dataclass(frozen=True)
class JobProfile:
    family: str
    seniority: str
    years: int | None
    years_kind: str
    required: tuple[str, ...]
    preferred: tuple[str, ...]
    mentioned: tuple[str, ...]
    work_authorisation: tuple[str, ...] = ()
    no_sponsorship: bool = False
    languages: tuple[str, ...] = ()
    phd: str | None = None
    thin: bool = False
    intake_year: int | None = None
    # Technologies the title names ("Python Developer"): the job is built on them.
    core: tuple[str, ...] = ()

    @property
    def track(self) -> str:
        return track(self.family)

    def to_dict(self) -> dict:
        return asdict(self)

    @classmethod
    def from_dict(cls, data: dict) -> "JobProfile":
        fields = {k: tuple(v) if isinstance(v, list) else v for k, v in data.items() if k in cls.__dataclass_fields__}
        return cls(**fields)


def content_hash(title: str | None, description: str | None, experience_level: str | None,
                 employment_type: str | None) -> str:
    """
    Fingerprint of everything profile_job reads. Mirrors the SQL staleness check
    in profile_repository — md5(concat_ws('|', ...)) — which skips NULLs the
    same way, so a job is re-profiled only when one of these actually changed.
    """
    parts = [v for v in (title, description, experience_level, employment_type) if v is not None]
    return hashlib.md5("|".join(parts).encode("utf-8")).hexdigest()


def profile_job(job) -> JobProfile:
    """`job` is anything with title, description, experience_level, employment_type."""
    title = getattr(job, "title", None)
    text = html_to_text(getattr(job, "description", None)) or ""
    sections = split_sections(text)
    experience = extract_experience(title, text)

    required, preferred, mentioned = _skills(text, title)

    # Some boards put the level in the employment type ("INTERN") and nowhere else.
    level = getattr(job, "experience_level", None)
    employment = getattr(job, "employment_type", None) or ""
    if not level and "intern" in employment.lower():
        level = "internship"

    requirements_text = sections["required"] + "\n" + sections["general"]
    return JobProfile(
        family=classify_family(title, text),
        seniority=classify_seniority(title, text, level,
                                     experience["years"] if experience["kind"] == "required" else None),
        years=experience["years"],
        years_kind=experience["kind"],
        required=tuple(required),
        preferred=tuple(preferred),
        mentioned=tuple(mentioned),
        work_authorisation=tuple(work_authorisation(text)),
        no_sponsorship=bool(_NO_SPONSORSHIP.search(text)),
        languages=tuple(languages_required(title, requirements_text, text)),
        phd=phd_requirement(title, sections["required"], text),
        thin=len(text) < THIN_BELOW,
        intake_year=intake_year(title),
        core=tuple(find_skills(title)),
    )
