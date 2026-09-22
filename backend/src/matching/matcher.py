"""
How well one candidate fits one job: the one JobRadar match score.

    match(candidate, profile, job) -> Match

Fit, not similarity. The previous score was a weighted cosine between CV text
and posting text, and text can be close while the candidate cannot get the job
("Senior React Engineer, 5+ years" scored 62% for a one-year React developer).
So the score is built the way screening works:

  1. Gates. Constraints no overlap can compensate for — cannot legally hold
     the job, two levels too senior, three years short, a language the
     candidate lacks — make a job "unlikely" whatever else it scores.
  2. Quality. What overlaps: required skills, role, seniority, nice-to-haves.
  3. Multipliers. Experience shortfall and location scale the whole score,
     because falling short of the bar is not one factor among several.

Every number comes with the reason it has, so the dashboard can say why a job
is there instead of showing a bare percentage.
"""
from dataclasses import dataclass, field
from datetime import date
from functools import lru_cache
from types import SimpleNamespace

from src.Agent.utils.location import country_name, location_fit, location_tier
from src.matching.candidate import Candidate
from src.matching.requirements import JobProfile
from src.matching.roles import RANK, normalise_title
from src.matching.skills import credit, display

# Recorded with every stored score (application.match_method), so a later
# scorer is never compared with this one as if they were one scale.
MATCHER_VERSION = "jobradar-fit-v2"

WEIGHTS = {"required": 0.45, "role": 0.25, "seniority": 0.20, "preferred": 0.10}
TIERS = (("strong", 75), ("good", 55), ("stretch", 35))
TIER_ORDER = {"strong": 0, "good": 1, "stretch": 2, "unlikely": 3}

# Years short of the requirement -> the share of the match that survives.
SHORTFALL = ((0.0, 1.0), (1.0, 0.8), (2.0, 0.6), (3.0, 0.35))
FAR_SHORT = 0.15
# Three years short of a stated requirement is a wall, not a stretch.
BLOCKING_SHORTFALL = 2.5
# A job behind a gate never shows a score that reads like a match.
BLOCKED_CEILING = 34
# Below this role fit the job is a different kind of work, however much the
# skills overlap ("Technical CX Specialist" for a software engineer): a stretch
# at most, never a good match.
DIFFERENT_WORK = 0.35
# Below this share of the required skills the reasons already read red, so the
# job is a stretch at most however well role and level fit ("Postgres
# Deployment Engineer" asking Nix, Ansible and Kubernetes of a web developer).
FEW_SKILLS = 0.4
# A technology the title names that the CV shows no sign of (credit below a
# related skill's) makes the job a stretch at most, however many of the
# incidental skills overlap ("Software Engineer – InterSystems Caché & TrakCare"
# for a web developer who knows its SQL and REST).
RELATED_CREDIT = 0.4
# A full posting that names no technology at all is evidence against a
# technical fit; only a thin listing earns the benefit of the doubt.
NO_SKILLS_THIN, NO_SKILLS_FULL = 0.5, 0.25
# When a posting states no years, its level stands in for them. With neither,
# the posting is not a free pass: two thirds of postings state no figure, and
# in jobhunt's use senior roles with no figure kept surfacing and then read
# "5+ years" on the application page.
LEVEL_YEARS = {"intern": 0, "entry": 0, "junior": 1, "mid": 3, "senior": 5, "lead": 7, "principal": 9}
UNSTATED = 0.7

# Where the job is relative to the user. Being unable to hold it is a gate;
# among jobs they can hold, onsite abroad means relocating and a work permit.
LOCATION_FACTOR = {"local": 1.0, "remote_country": 1.0, "remote_region": 0.95, "remote_emea": 0.95,
                   "remote_global": 0.95, "remote_unspecified": 0.85, "unstated": 0.85, "international": 0.5,
                   "ineligible": 0.25}
EU = frozenset("at be bg hr cy cz dk ee fi fr de gr hu ie it lv lt lu mt nl pl pt ro sk si es se is li no ch".split())

# Roles close enough that experience in one counts toward the other.
_RELATED = {
    ("software_engineering", "backend"): 0.85, ("software_engineering", "frontend"): 0.8,
    ("software_engineering", "full_stack"): 0.9, ("software_engineering", "mobile"): 0.6,
    ("software_engineering", "devops"): 0.5, ("software_engineering", "data_engineering"): 0.5,
    ("software_engineering", "ai"): 0.7, ("software_engineering", "qa"): 0.5,
    ("software_engineering", "embedded"): 0.4, ("software_engineering", "game"): 0.4,
    ("software_engineering", "security"): 0.4, ("software_engineering", "solutions"): 0.5,
    ("frontend", "full_stack"): 0.85, ("backend", "full_stack"): 0.85, ("frontend", "backend"): 0.45,
    ("frontend", "mobile"): 0.55, ("full_stack", "mobile"): 0.5, ("backend", "devops"): 0.5,
    ("backend", "data_engineering"): 0.55, ("backend", "ai"): 0.55, ("full_stack", "ai"): 0.55,
    ("machine_learning", "ai"): 0.9, ("machine_learning", "data_science"): 0.8, ("ai", "data_science"): 0.65,
    ("data_science", "data_analytics"): 0.7, ("data_engineering", "data_analytics"): 0.55,
    ("data_engineering", "data_science"): 0.5, ("machine_learning", "data_engineering"): 0.4,
    ("ai_data", "machine_learning"): 0.4, ("ai_data", "ai"): 0.4, ("ai_data", "data_science"): 0.3,
    ("devops", "security"): 0.45, ("devops", "it_support"): 0.4, ("design", "frontend"): 0.35,
}
FAMILY_LABELS = {
    "software_engineering": "Software engineering", "frontend": "Frontend", "backend": "Backend",
    "full_stack": "Full-stack", "mobile": "Mobile", "devops": "DevOps / cloud", "data_engineering": "Data engineering",
    "data_analytics": "Data analytics", "data_science": "Data science", "machine_learning": "Machine learning",
    "ai": "AI engineering", "ai_data": "AI training data", "qa": "QA / testing", "security": "Security",
    "embedded": "Embedded", "game": "Games", "it_support": "IT support", "solutions": "Solutions engineering",
    "design": "Design", "product": "Product / delivery", "non_tech": "a non-technical field",
    "other": "an unclassified role",
}
LEVEL_LABELS = {"intern": "Internship", "entry": "Entry-level", "junior": "Junior", "mid": "Mid-level",
                "senior": "Senior", "lead": "Lead / staff", "principal": "Principal / director", "unknown": "Unstated"}


_LANGUAGE_NAMES = {"de": "German", "fr": "French", "nl": "Dutch", "es": "Spanish", "pt": "Portuguese",
                   "it": "Italian", "pl": "Polish", "sv": "Swedish", "da": "Danish", "no": "Norwegian",
                   "fi": "Finnish", "ja": "Japanese", "ko": "Korean", "zh": "Chinese", "ar": "Arabic",
                   "he": "Hebrew", "tr": "Turkish", "ru": "Russian", "uk": "Ukrainian", "cs": "Czech",
                   "ro": "Romanian", "hu": "Hungarian", "el": "Greek", "bg": "Bulgarian", "hi": "Hindi"}


@dataclass
class Match:
    score: int
    tier: str
    dimensions: dict
    required: dict
    preferred: dict
    facts: dict
    reasons: list = field(default_factory=list)
    blockers: list = field(default_factory=list)

    @property
    def headline(self) -> str:
        if self.blockers:
            return "Out of reach"
        return {"strong": "Strong match", "good": "Good match", "stretch": "Stretch"}.get(self.tier, "Weak match")

    def to_dict(self) -> dict:
        return {"version": MATCHER_VERSION, "score": self.score, "tier": self.tier, "headline": self.headline,
                "dimensions": self.dimensions, "required": self.required, "preferred": self.preferred,
                "facts": self.facts, "reasons": self.reasons, "blockers": self.blockers}


def related(a: str, b: str) -> float:
    return 1.0 if a == b else _RELATED.get((a, b), _RELATED.get((b, a), 0.0))


def _skill_fit(have, wanted) -> tuple[float | None, dict]:
    if not wanted:
        return None, {"matched": [], "partial": [], "missing": []}
    credits = {skill: credit(have, skill) for skill in wanted}
    split = {"matched": [], "partial": [], "missing": []}
    for skill, value in credits.items():
        split["matched" if value >= 0.99 else "partial" if value >= 0.4 else "missing"].append(display(skill))
    return round(sum(credits.values()) / len(credits), 3), split


def _shortfall_factor(shortfall: float) -> float:
    return next((factor for limit, factor in SHORTFALL if shortfall <= limit), FAR_SHORT)


@lru_cache(maxsize=20_000)
def _tier(location, remote, eligibility, prefs) -> str:
    # Many jobs share a location string ("Remote - US"), and resolving one can
    # mean a fuzzy country search, so each distinct one is resolved once.
    if not (location or "").strip() and not remote and not (eligibility or "").strip():
        return "unstated"  # nothing to judge; location_tier would call it abroad
    return location_tier(SimpleNamespace(location=location, remote=remote, remote_eligibility=eligibility), prefs)


def _place(job, prefs) -> str:
    return getattr(job, "location", None) or country_name(prefs.country_code or "") or "your country"


def match(candidate: Candidate, profile: JobProfile, job) -> Match:
    """`job` needs title, location, remote and remote_eligibility: a Job or a row."""
    reasons, blockers = [], []

    def say(tone: str, text: str):
        reasons.append({"tone": tone, "text": text})

    def block(text: str):
        blockers.append(text)
        say("bad", text)

    # --- role
    family = profile.family
    role = max((strength * related(f, family) for f, strength in candidate.families.items()), default=0.5)
    title = normalise_title(getattr(job, "title", None))
    if any(f" {phrase} " in title for phrase in candidate.titles if phrase):
        role = 1.0
    label = FAMILY_LABELS.get(family, family)
    required_fit, required = _skill_fit(candidate.skills, profile.required)
    preferred_fit, preferred = _skill_fit(candidate.skills, profile.preferred + profile.mentioned)
    # An unclassified title ("Graduate Trainee Programme") is only ruled out when
    # there is enough text to judge and none of it touches the candidate's skills.
    touches = any(credit(candidate.skills, s) >= 0.6 for s in profile.required + profile.mentioned)
    if family == "non_tech" and candidate.families:
        block("Not a technical role")
    elif family == "other" and candidate.families and not touches:
        if profile.thin:
            say("warn", "Too little text to tell what this role is — open the posting")
        else:
            block("Not a technical role")
    elif role >= 0.8:
        say("good", f"Role fits: {label}")
    elif role >= 0.4:
        say("warn", f"Related field: {label}")
    else:
        say("bad", f"Different field: {label}")

    # --- skills
    if required_fit is None:
        say("warn", "No specific skills listed" if profile.thin else "The posting names no technical skills")
    else:
        n, have = len(profile.required), len(required["matched"]) + len(required["partial"])
        tone = "good" if required_fit >= 0.75 else "warn" if required_fit >= FEW_SKILLS else "bad"
        say(tone, f"{have}/{n} required skills" + (f" ({len(required['partial'])} through related skills)"
                                                     if required["partial"] else ""))
        if required["missing"]:
            say("warn" if required_fit >= 0.6 else "bad", "Missing: " + ", ".join(required["missing"][:4]))
        if n >= 4 and required_fit < 0.15:
            block("Almost none of the required skills")
    lacking = [display(s) for s in profile.core if credit(candidate.skills, s) < RELATED_CREDIT]
    if lacking:
        say("bad", f"Built on {', '.join(lacking)}, which your CV doesn't show")
    if profile.preferred:
        hits = sum(1 for s in profile.preferred if credit(candidate.skills, s) >= 0.4)
        say("good" if hits == len(profile.preferred) else "warn", f"{hits}/{len(profile.preferred)} nice-to-haves")

    # --- seniority, on the track this job is judged on
    job_track = profile.track
    candidate_level = candidate.level(job_track)
    if profile.seniority == "unknown":
        seniority, gap = 0.7, None
    else:
        gap = RANK[profile.seniority] - RANK[candidate_level]
        seniority = 1.0 if -1 <= gap <= 0 else 0.8 if gap == -2 else 0.5 if gap < -2 else 0.55 if gap == 1 else 0.0
        level = LEVEL_LABELS[profile.seniority]
        if gap >= 2:
            block(f"{level} role — two or more levels above yours ({LEVEL_LABELS[candidate_level].lower()})")
        elif gap == 1:
            say("warn", f"{level} role — a step above your level")
        elif gap < -2:
            say("warn", f"{level} role — well below your level")
        else:
            say("good", f"{level} role")

    # --- experience
    have_years = candidate.years.get(job_track, candidate.years["any"])
    track_words = {"ml": "professional ML", "software": "software", "any": "professional"}[job_track]
    if profile.years is None:
        implied = LEVEL_YEARS.get(profile.seniority)
        if implied is None:
            experience = UNSTATED
            say("warn", "No experience requirement stated — check the posting")
        else:
            # A level is softer evidence than a stated figure, so a year of slack.
            experience = _shortfall_factor(max(0, implied - 1) - have_years)
    elif profile.years_kind == "preferred":
        # A preferred figure is a wish, not a gate: scored as two years lighter.
        experience = _shortfall_factor(max(0, profile.years - 2) - have_years)
        say("good" if experience >= 0.8 else "warn",
            f"Prefers {profile.years}+ years; you have about {have_years:g}")
    elif profile.years == 0:
        experience = 1.0
        say("good", "No prior experience required")
    else:
        short = profile.years - have_years
        experience = _shortfall_factor(short)
        text = f"Asks {profile.years}+ years of {track_words} experience; you have about {have_years:g}"
        if short >= BLOCKING_SHORTFALL:
            block(text)
        else:
            say("good" if short <= 0 else "warn", text)

    # --- location and the right to work there
    prefs = candidate.prefs
    tier = _tier(getattr(job, "location", None), getattr(job, "remote", None),
                 getattr(job, "remote_eligibility", None), prefs)
    home = country_name(prefs.country_code or "") or "your country"
    location = LOCATION_FACTOR[tier] * (0.9 + 0.1 * location_fit(tier, prefs)) \
        if tier not in ("ineligible", "unstated") else LOCATION_FACTOR[tier]
    locks = [code for code in profile.work_authorisation
             if not (code == prefs.country_code or (code == "eu" and prefs.country_code in EU))]
    if tier == "ineligible":
        block(f"Not open to candidates in {home}")
    elif locks:
        # Stated in the body instead of the location field, but just as final.
        location = LOCATION_FACTOR["ineligible"]
        block(f"Requires {', '.join(c.upper() for c in locks)} work authorisation")
    elif tier == "international" and profile.no_sponsorship:
        block(f"Onsite in {_place(job, prefs)} with no visa sponsorship")
    else:
        say(*{
            "local": ("good", f"In {_place(job, prefs)}"),
            "remote_country": ("good", f"Remote, open to {home}"),
            "remote_region": ("good", "Remote, open to your region"),
            "remote_emea": ("good", "Remote, EMEA"),
            "remote_global": ("good", "Remote, worldwide"),
            "remote_unspecified": ("warn", "Remote — who they hire from isn't stated"),
            "unstated": ("warn", "Location not stated"),
            "international": ("warn", f"Onsite in {_place(job, prefs)} — relocation and a work permit"),
        }[tier])

    # --- a dated intake, language, degree
    if profile.intake_year and profile.intake_year < date.today().year:
        block(f"An intake for {profile.intake_year} — most likely closed")
    for language in sorted(set(profile.languages) - candidate.languages):
        block(f"Requires {_LANGUAGE_NAMES.get(language, language)}")
    if profile.phd == "required" and not candidate.phd:
        block("PhD required")

    # --- the score
    unknown_skills = NO_SKILLS_THIN if profile.thin else NO_SKILLS_FULL
    parts = {"required": required_fit if required_fit is not None else unknown_skills, "role": role,
             "seniority": seniority, "preferred": preferred_fit}
    available = {k: v for k, v in parts.items() if v is not None}
    quality = sum(WEIGHTS[k] * v for k, v in available.items()) / sum(WEIGHTS[k] for k in available)
    score = round(100 * quality * experience * location)
    if blockers:
        score = min(score, BLOCKED_CEILING)
    tier_name = "unlikely" if blockers else next((name for name, floor in TIERS if score >= floor), "unlikely")
    few_skills = required_fit is not None and required_fit < FEW_SKILLS
    if tier_name in ("strong", "good") and (role < DIFFERENT_WORK or few_skills or lacking
                                            or (profile.thin and family in ("other", "non_tech"))):
        tier_name = "stretch"  # different work, not its stack, or too thin to judge: never leads the page

    return Match(
        score=score,
        tier=tier_name,
        dimensions={"role": round(role, 3), "required": required_fit, "preferred": preferred_fit,
                    "seniority": seniority, "experience": experience, "location": round(location, 3)},
        required=required,
        preferred=preferred,
        facts={"family": family, "job_level": profile.seniority, "candidate_level": candidate_level,
               "years_required": profile.years, "years_kind": profile.years_kind, "candidate_years": have_years,
               "track": job_track, "location_tier": tier, "thin": profile.thin},
        reasons=reasons,
        blockers=blockers,
    )
