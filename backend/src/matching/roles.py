"""
What kind of role a job title names, and at what level. Shared by both sides
of a match: the posting's title (requirements.py) and every role on the CV
(candidate.py) are read by the same rules, so "Frontend Developer" means the
same thing in both places.

    classify_family(title, description)   frontend, machine_learning, non_tech, …
    classify_seniority(title, …)          intern … principal, or unknown
    track(family)                         which years a family is judged on
"""
import re

LEVELS = ("intern", "entry", "junior", "mid", "senior", "lead", "principal")
RANK = {level: i for i, level in enumerate(LEVELS)}
ML_FAMILIES = frozenset({"machine_learning", "ai", "data_science"})


def normalise_title(title: str | None) -> str:
    """Lowercase, gender markers and punctuation dropped: " senior software engineer "."""
    t = re.sub(r"\((?:[mfwdx]\s*[/|,]\s*)+[mfwdx]\)|\(all genders?\)", " ", (title or "").lower())
    return " " + " ".join(re.sub(r"[^a-z0-9+#.äöüß]+", " ", t).split()) + " "


def _first(patterns, text: str, default=None):
    return next((name for name, pattern in patterns if re.search(pattern, text)), default)


# Ordered: the first match wins. The job's function ("Designer", "Product
# Manager") decides before its domain ("AI"), so "AI Product Manager" is product
# work, and specific tech families come before the generic "engineer" — so
# "Software Engineer, Finance" stays software while "Finance Manager" falls
# through to `non_tech`. A title nothing claims is `other`: ambiguous, like
# "Graduate Trainee Programme", which Kenyan boards use for technical intakes too.
_FAMILIES = [
    ("ai_data", r"\bai (?:trainer|tutor|rater|evaluator|writer)\b|\bannotat|\bdata label|\brlhf\b|\bquality rater\b"),
    # Words that look technical in titles that are not: engineering disciplines,
    # business developers, sales roles.
    ("non_tech", r"\b(?:mechanical|civil|structural|electrical|chemical|process|manufacturing|biomedical|petroleum|"
              r"mining|agricultural|environmental|geotechnical|site|field service|maintenance|sound|audio) engineer|"
              r"\bbusiness develop|\b(?:real estate|property|curriculum|course|content|talent|people|leadership) develop|"
              r"\bsales (?:executive|representative|rep|manager|associate|director|lead|agent)\b"),
    ("solutions", r"\b(?:solutions?|sales|pre ?sales|customer(?: success)?|forward deployed|implementation|"
                  r"integrations?|field|technical account) (?:engineer|architect)\b|\btechnical account manager\b|"
                  r"\bdeveloper (?:advocate|relations)\b|\bdevrel\b"),
    ("design", r"\b(?:designer|ux researcher|user researcher|ux design|ui design|ui ux)\b"),
    ("product", r"\b(?:product manager|product owner|program manager|project manager|technical program manager|"
                r"scrum master|delivery manager)\b"),
    ("machine_learning", r"\b(?:machine learning|ml|mlops|deep learning|computer vision|nlp|applied scientist|"
                         r"research scientist|research engineer|ai ml|ml ai)\b"),
    ("ai", r"\b(?:ai|llm|genai|generative ai|gen ai|prompt engineer|conversational ai|ki)\b"),
    ("data_science", r"\b(?:data scien\w*|decision scientist|quantitative (?:analyst|researcher)|quant|statistician)\b"),
    ("data_engineering", r"\b(?:data|analytics|etl|big data|data platform|database) (?:engineer|architect|developer)\b|"
                         r"\bdatabase administrator\b|\bdba\b"),
    ("data_analytics", r"\b(?:data|bi|business intelligence|reporting|insights?|business|product) analyst\b|"
                       r"\bbusiness intelligence\b|\bbi (?:developer|engineer)\b"),
    ("security", r"\b(?:security|appsec|cyber ?security|information security|infosec|soc|penetration|pen)"
                 r"(?: operations)? (?:engineer|analyst|architect|specialist|tester)\b|\bpentester\b|"
                 r"\bcyber ?security\b|\b(?:dev)?secops\b"),
    ("qa", r"\b(?:qa|quality assurance|test|testing|sdet|software tester|tester|quality engineer)\b"),
    ("devops", r"\b(?:devops|dev ops|site reliability|sre|platform|infrastructure|cloud|systems|release|build|"
               r"kubernetes|linux) (?:engineer|architect|developer|specialist)\b|\bdevops\b|\bsre\b"),
    ("it_support", r"\b(?:it|ict|technical|desktop|helpdesk|help desk|service desk) (?:support|officer|technician|"
                   r"specialist|administrator|assistant|analyst)\b|\b(?:system|systems|network|sys) administrator\b|"
                   r"\bsysadmin\b|\bnetwork engineer\b|\bsupport engineer\b"),
    ("mobile", r"\b(?:ios|android|flutter|react native)\b|\bmobile (?:engineer|developer|app\w*|software)\b"),
    ("embedded", r"\b(?:embedded|firmware|fpga|hardware engineer|iot|robotics)\b"),
    ("game", r"\b(?:game|gameplay|unity|unreal)\b"),
    ("frontend", r"\b(?:front ?end|ui engineer|ui developer|ux engineer)\b|"
                 r"\b(?:react|vue|angular|svelte|next\.?js|javascript|typescript) (?:engineer|developer)\b"),
    ("backend", r"\b(?:back ?end|api (?:engineer|developer)|server side)\b|\b(?:python|java|golang|go|"
                r"node(?:\.js)?|php|ruby|rails|django|laravel|\.net|c#|scala|elixir|rust) (?:engineer|developer)\b"),
    ("full_stack", r"\b(?:full ?stack|web developer|web engineer|mern|mean stack)\b"),
    ("software_engineering", r"\b(?:software|developer|programmer|coder|engineer|engineering|member of technical staff|"
                             r"technical staff|swe|sde|entwickler\w*|softwareentwickl\w*|informati\w*|it specialist)\b"),
    # Clearly not technical, once no technical family has claimed the title
    # (jobhunt's non-technical list, from what Kenyan boards actually carry).
    ("non_tech", r"\b(?:sales|marketing|account (?:executive|manager)|recruit\w*|talent acquisition|human resources|hr|"
                 r"people partner|finance|financial|accountant|accounting|accounts|audit\w*|tax|legal|counsel|paralegal|"
                 r"lawyer|attorney|compliance|customer (?:success|service|support|care|experience)|call cent\w*|"
                 r"office (?:manager|assistant|administrator)|receptionist|front office|secretary|executive assistant|"
                 r"administrative|admin assistant|copywrit\w*|content (?:writer|creator|marketing)|social media|"
                 r"community manager|public relations|communications|brand|nurse|nursing|clinical|medical|pharmac\w*|"
                 r"doctor|physician|dentist|laboratory|lab technician|teacher|tutor|lecturer|driver|rider|chef|cook|"
                 r"waiter|waitress|hotel|housekeep\w*|guard|cctv|warehouse|logistics|procurement|supply chain|"
                 r"storekeeper|farm|agronom\w*|veterinar\w*|social work\w*|counsell?or|photograph\w*|videograph\w*|"
                 r"merchandis\w*|cashier|teller|loan officer|credit officer|debt collect\w*|insurance|underwrit\w*|"
                 r"actuar\w*|electrician|plumber|mechanic|welder|machine operator|production supervisor|literacy|"
                 r"telesales|relationship manager|investment|banking|fundrais\w*|grants?|program officer|"
                 r"monitoring and evaluation|operations (?:manager|officer|associate|assistant))\b"),
]
TECH_FAMILIES = frozenset(name for name, _ in _FAMILIES) - {"other", "non_tech", "ai_data"}

# An AI-titled posting that is really about shipping an application which
# calls a model is software work; one about training models is ML work.
_APP_SIGNALS = ("web application", "frontend", "front-end", "backend", "back-end", "react", "next.js",
                "typescript", "javascript", "node", "rest api", "user interface", "full stack", "full-stack",
                "database schema", "crud", "ship features", "product engineer")
_MODEL_SIGNALS = ("train models", "training models", "model training", "fine-tune", "fine-tuning",
                  "deploy models", "model deployment", "inference optimi", "mlops", "feature store",
                  "model architecture", "research", "publications", "deep learning", "distributed training",
                  "hyperparameter", "production ml")


def classify_family(title: str | None, description: str | None = None) -> str:
    family = _first(_FAMILIES, normalise_title(title), "other")
    if family in ("ai", "machine_learning") and description:
        text = description.lower()
        app = sum(signal in text for signal in _APP_SIGNALS)
        model = sum(signal in text for signal in _MODEL_SIGNALS)
        if app >= 3 and app > model * 2:
            return "software_engineering"
    return family


# Work judged on software years. Design, product and non-technical roles are
# judged on years of any professional work instead.
_SOFTWARE_TRACK = TECH_FAMILIES - ML_FAMILIES - {"design", "product"}


def track(family: str) -> str:
    """Which kind of professional experience a family is judged on."""
    if family in ML_FAMILIES:
        return "ml"
    return "software" if family in _SOFTWARE_TRACK else "any"


# Senior side first, so "Associate Director" is a director and "Graduate
# Program Manager" a manager, while "Graduate Software Engineer" is entry level.
_TITLE_LEVELS = [
    ("principal", r"\b(?:principal|distinguished|fellow|director|head of|vp|vice president|chief|cto|cio|ciso)\b"),
    ("lead", r"\b(?:staff|lead|leader|manager|architect|leiter|leitung|teamleiter)\b"),
    ("senior", r"\b(?:senior|sr|snr|expert|iii|iv)\b"),
    ("intern", r"\b(?:intern|interns|internship|industrial attachment|attachment|apprentice\w*|werkstudent\w*|"
               r"working student|praktik\w*|student)\b"),
    ("entry", r"\b(?:graduate|grad|entry level|early career|trainee|fresher|campus|new grad)\b"),
    ("junior", r"\b(?:junior|jr|associate|i)\b"),
    ("mid", r"\b(?:mid|mid level|intermediate|ii)\b"),
]
# Board-supplied levels, as Jobicy, The Muse and Workable spell them.
_PROVIDER_LEVELS = [
    ("intern", r"intern"),
    ("principal", r"director|executive|\bvp\b|\bhead\b"),
    ("lead", r"\blead|manager|management"),
    ("mid", r"mid.senior|mid|midweight|intermediate|experienced"),
    ("senior", r"senior|expert"),
    ("entry", r"entry|graduate|junior|associate|beginner"),
]
_SENIOR_SIGNALS = ("extensive experience", "extensive professional", "proven track record",
                   "deep production experience", "expert-level", "expert level", "mentor junior",
                   "mentoring junior", "lead a team", "leading a team", "own the architecture",
                   "define the technical direction", "set technical direction", "manage a team",
                   "line management", "seasoned")


def classify_seniority(title: str | None, description: str | None = None, provider_level: str | None = None,
                       years: int | None = None) -> str:
    """Title first, then the board's own level, then the posting's language, then its years."""
    level = _first(_TITLE_LEVELS, normalise_title(title))
    if level:
        return level
    level = _first(_PROVIDER_LEVELS, (provider_level or "").lower())
    if level:
        return level
    text = (description or "").lower()
    if sum(signal in text for signal in _SENIOR_SIGNALS) >= 2:
        return "senior"
    if years is not None:
        return "principal" if years >= 10 else "lead" if years >= 8 else "senior" if years >= 5 \
            else "mid" if years >= 3 else "junior" if years >= 1 else "entry"
    return "unknown"
