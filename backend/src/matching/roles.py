"""
What kind of role a job title names, and at what level. Shared by both sides
of a match: the posting's title (requirements.py) and every role on the CV
(candidate.py) are read by the same rules, so "Frontend Developer" means the
same thing in both places.

    classify_family(title, description)   frontend, machine_learning, non_tech, …
    classify_seniority(title, …)          intern … principal, or unknown
    title_level(title)                    the level the title alone names, or None
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


# Job functions that are not technical work. Used last in _FAMILIES, and to
# take an "AI" title away from `ai` when its job is selling, marketing or law.
# The second half came from the live pool on 2026-10-05 (families audit).
_NON_TECH_WORDS = (r"\b(?:sales|marketing|account (?:executive|manager)|recruit\w*|talent acquisition|human resources|hr|"
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
                   r"monitoring and evaluation|operations (?:manager|officer|associate|assistant))\b"
                   r"|\b(?:policy|seo|creative|creators?|communication|gtm|go to market|payroll|partnerships?|events?|"
                   r"enablement|steuerberater\w*|pflege\w*|instructor|docente|coordinator|art director|"
                   r"growth marketing|product marketing|people partners|chief of staff|sourc(?:er|ing)|risk|sox|"
                   r"tutorial fellow|professor)\b")

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
    ("solutions", r"\b(?:solutions?|sales|pre ?sales|customer(?: success)?|forward deployed|deployed|implementation|"
                  r"integrations?|field|technical account|(?<!business )partner(?: success)?|professional services|"
                  r"consulting|value) "
                  r"(?:engineer\w*|architect)\b|\btechnical account manager\b|"
                  r"\bdeveloper (?:advocate|relations)\b|\bdevrel\b"),
    ("design", r"\b(?:designer|ux researcher|user researcher|ux design|ui design|ui ux|head of product design|"
               r"product design (?:intern|lead|director|manager)|"
               r"(?:director|(?<!program )manager|vp)(?: of)? product design)\b"),
    # "Head of Product Security" is security work, "Director of Product Design" design.
    ("product", r"\b(?:product manager|product owner|program manager|project manager|technical program manager|"
                r"scrum master|delivery manager|product management|program management|technical program lead|"
                r"product lead|product director|chief product officer)\b|"
                r"\b(?:head|director|vp|svp|gm)(?: of)? product\b(?! (?:security|design|marketing|development|"
                r"operations|support|analytics|engineering|communications?))"),
    ("machine_learning", r"\b(?:machine learning|ml|mlops|deep learning|computer vision|nlp|applied scientist|"
                         r"research scientist|research engineer|ai ml|ml ai)\b"),
    ("ai", r"\b(?:ai|llm|genai|generative ai|gen ai|prompt engineer|conversational ai|ki)\b"),
    ("data_science", r"\b(?:data scien\w*|decision scientist|quantitative (?:analyst|researcher)|quant|statistician)\b"),
    ("data_engineering", r"\b(?:data|analytics|analytical|etl|big data|data platform|database) "
                         r"(?:engineer\w*|architect|developer)\b|"
                         r"\bdatabase administrator\b|\bdba\b"),
    ("data_analytics", r"\b(?:data|bi|business intelligence|reporting|insights?|business|product) analyst\b|"
                       r"\bbusiness intelligence\b|\bbi (?:developer|engineer)\b"),
    # Up to three words between the specialism and the role: "Detection and
    # Response Engineer", "Identity Governance and Access Engineer".
    ("security", r"\b(?:security|appsec|cyber ?security|information security|infosec|soc|penetration|pen|privacy|"
                 r"detection|threat|red team|cryptography|identity|iam|grc|sirt)(?: \w+){0,3}? "
                 r"(?:engineer\w*|analyst|architect|specialist|tester)\b|\bpentester\b|"
                 r"\bcyber ?security\b|\binformation security\b|\bproduct security\b|\b(?:dev)?secops\b"),
    ("qa", r"\b(?:qa|quality assurance|test|testing|sdet|software tester|tester|quality engineer)\b"),
    ("devops", r"\b(?:devops|dev ops|site reliability|sre|platform|infrastructure|cloud|systems?|release|build|"
               r"kubernetes|linux)(?: operations| reliability)? (?:engineer\w*|architect|developer|specialist)\b|"
               r"\bdevops\b|\bsre\b"),
    ("it_support", r"\b(?:it|ict|technical|desktop|helpdesk|help desk|service desk) (?:support|officer|technician|"
                   r"specialist|administrator|assistant|analyst)\b|\b(?:system|systems|network|sys) administrator\b|"
                   r"\bsysadmin\b|\bsystemadministrator\w*|\bnetwork engineer\b|\bsupport engineer\b|\btse\b|"
                   r"\b(?:it|ict|av|audiovisual|corporate|service desk|technical services|technical escalations|"
                   r"unified communications)"
                   r"(?: (?!software)\w+){0,3}? engineer\w*"),
    ("mobile", r"\b(?:ios|android|flutter|react native)\b|\bmobile (?:engineer|developer|app\w*|software)\b"),
    ("embedded", r"\b(?:embedded|firmware|fpga|hardware engineer|iot|robotics)\b"),
    ("game", r"\b(?:game|gameplay|unity(?! catalog)|unreal)\b"),
    ("frontend", r"\b(?:front ?end|ui engineer|ui developer|ux engineer)\b|"
                 r"\b(?:react|vue|angular|svelte|next\.?js|javascript|typescript) (?:engineer|developer)\b"),
    ("backend", r"\b(?:back ?end|api (?:engineer|developer)|server side)\b|\b(?:python|java|golang|go|"
                r"node(?:\.js)?|php|ruby|rails|django|laravel|\.net|c#|scala|elixir|rust) (?:engineer|developer)\b"),
    ("full_stack", r"\b(?:full ?stack|web developer|web engineer|mern|mean stack)\b"),
    ("software_engineering", r"\b(?:software|developer|programmer|coder|engineer|engineering|member of technical staff|"
                             r"technical staff|swe|sde|entwickler\w*|softwareentwickl\w*|informati(?:k|ker|cs)\w*|"
                             r"it specialist|it architect|tech lead|technical lead)\b"),
    # Clearly not technical, once no technical family has claimed the title
    # (jobhunt's non-technical list, from what Kenyan boards actually carry).
    ("non_tech", _NON_TECH_WORDS),
]
TECH_FAMILIES = frozenset(name for name, _ in _FAMILIES) - {"other", "non_tech", "ai_data"}
_PATTERN = {}
for _name, _pattern in _FAMILIES:
    _PATTERN.setdefault(_name, _pattern)
# IT work named by its department, not a role: "IT Intern", "Werkstudent:in IT
# Workplace Management", "Intern, Business Technology". Read only when nothing
# else claimed the title, so "IT Sales Representative" stays non_tech, and in
# capitals, so a blog post's "When Should Employers Use It?" is not IT work.
_IT_CAPITALS = re.compile(r"\b(?:IT|ICT)\b")
_IT_WORDS = re.compile(r"\b(?:information technology|business technology|computer technician)\b")

# An AI-titled posting that is really about shipping an application which
# calls a model is software work; one about training models is ML work.
_APP_SIGNALS = ("web application", "frontend", "front-end", "backend", "back-end", "react", "next.js",
                "typescript", "javascript", "node", "rest api", "user interface", "full stack", "full-stack",
                "database schema", "crud", "ship features", "product engineer")
_MODEL_SIGNALS = ("train models", "training models", "model training", "fine-tune", "fine-tuning",
                  "deploy models", "model deployment", "inference optimi", "mlops", "feature store",
                  "model architecture", "research", "publications", "deep learning", "distributed training",
                  "hyperparameter", "production ml")


# "AI" in a title names the domain, not the job. A technical function also in
# the title decides ("iOS Developer - AI Finance Agent" is mobile work); a
# non-technical one with no technical role word means the job is not
# engineering at all ("Legal AI Counsel", "Account Executive - AI Native").
_TECH_ROLE = re.compile(r"\b(?:engineer\w*|developer|programmer|scientist|research\w*|architect|technical staff|swe|sde|"
                        r"mlops|devops|sre|tester|sdet|administrator)\b")
_FUNCTION_OVER_DOMAIN = [(name, pattern) for name, pattern in _FAMILIES
                         if name in ("mobile", "frontend", "backend", "full_stack", "security", "data_engineering",
                                     "qa", "it_support", "embedded", "game")]
# Quality and test work on physical products: manufacturing, hardware, propulsion.
# It is not software QA unless the title says software.
_PHYSICAL = re.compile(r"\b(?:hardware|manufacturing|npi|propulsion|battery|metrology|dimensional|mechanical|supplier|"
                       r"production|process|materials?|medizin\w*|cannabis|pharma\w*|food|automotive|vehicle|"
                       r"electrical|electronics|rf|thermal|structural|design quality)\b")
_SOFTWARE_QA = re.compile(r"\b(?:software|sdet|automation|automated|api|web|mobile|game|localisation|localization|data)\b")

# A title that reached software_engineering only through "engineer" or
# "engineering" names no software. Engineering of physical things is not
# software work: chip and electronics design is hardware (embedded), plant,
# power and building work is not technical in this product's sense (non_tech).
# Found in the live pool on 2026-10-07: SpaceXAI's Memphis data centre roles
# (Facilities, Fire Protection, Fluids, Optical, Rack Design, Controls...),
# Crusoe's construction and commissioning roles, OpenAI's Physical Design.
_SOFTWARE_WORD = re.compile(r"\b(?:software|developer|programmer|coder|swe|sde|technical staff|entwickler\w*|"
                            r"softwareentwickl\w*|informati(?:k|ker|cs)\w*)\b")
_HARDWARE_DESIGN = re.compile(r"\b(?:hardware|asic|rtl|silicon|physical design|(?:design|digital) verification|"
                              r"signal integrity|power integrity|pcb\w*|power electronics|electronics|rf|radio frequency|"
                              r"emc|wireless|analog|ee|component)\b")
_PHYSICAL_WORK = re.compile(r"\b(?:facilit\w*|fire|fluids?|optical|opto\w*|mechanical|hvac|plumbing|construction|"
                            r"commissioning|power (?:generation|systems?|plant)|transmission|battery|thermal|actuators?|"
                            r"structural|civil|electrical|cabling|fiber|osp|rack|data ?cent(?:er|re)s?|datacenter|controls|"
                            r"instrumentation|scada|propulsion|metrology|manufacturing|npi|quality control|qc|accident|"
                            r"helicopter|estimator|welder|physical)\b")
# A job function named before the technical word makes that word its subject,
# not its job: "Legal Engineer", "Recruiter, Field Engineering", "Executive
# Assistant to Head of Engineering". And the role part of a title (before the
# first comma or dash) that ends in a function is that function: "Copywriter,
# Developer", "Account Executive - Software Sales", "Developer Community Manager".
_ROLE_PART = re.compile(r"\s[-–—|]\s|[,(:|]")


def _serves_function(title: str | None, t: str, family: str, generic: bool) -> bool:
    head = normalise_title(_ROLE_PART.split(re.sub(r"^\s*\([^)]*\)", "", title or ""), maxsplit=1)[0])
    function, role = re.search(rf"(?:{_NON_TECH_WORDS}) $", head), re.search(_PATTERN[family], head)
    # Unless the function is part of the role's own name: "Technical Account Manager".
    if function and (role is None or function.start() >= role.end()):
        return True
    role_at = re.search(_PATTERN[family], t).start()
    function = re.search(_NON_TECH_WORDS, t)
    return generic and function is not None and function.start() < role_at


def classify_family(title: str | None, description: str | None = None) -> str:
    t = normalise_title(title)
    family = _first(_FAMILIES, t, "other")
    if family == "other" and (_IT_CAPITALS.search(title or "") or _IT_WORDS.search(t)):
        return "it_support"
    if family in ("software_engineering", "solutions", "devops"):
        generic = not _SOFTWARE_WORD.search(t)
        if _serves_function(title, t, family, generic and family == "software_engineering"):
            return "non_tech"
        if family in ("software_engineering", "devops") and generic:
            if _HARDWARE_DESIGN.search(t):
                return "embedded"
            if _PHYSICAL_WORK.search(t):
                return "non_tech"
    if family == "ai":
        if re.search(_NON_TECH_WORDS, t) and not _TECH_ROLE.search(t):
            return "non_tech"
        family = _first(_FUNCTION_OVER_DOMAIN, t, family)
    if family == "qa" and _PHYSICAL.search(t) and not _SOFTWARE_QA.search(t):
        return "embedded" if re.search(r"\b(?:hardware|electronics|rf)\b", t) else "non_tech"
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
# "Member of Technical Staff" names the job, not a level: OpenAI, xAI and
# Abridge give it to interns and to their most senior engineers alike. Its
# "staff" read as lead for all 88 in the live pool (2026-10-07), interns and
# new grads included; now the rest of the title decides.
_ROLE_NAME = re.compile(r"\b(?:member of (?:the )?)?technical staff\b")
# An internship or a new grad job is early career whatever else the title says
# ("Member of Technical Staff, Intern", "Senior Year Intern"), unless the job
# runs the programme ("Internship Program Manager", "Head of Apprenticeships").
_EARLY_CAREER = re.compile(r"\b(?:intern|interns|internship|werkstudent\w*|working student|praktik\w*|apprentice\w*|"
                           r"new grad)\b")
_RUNS_PROGRAMME = re.compile(r"\b(?:manager|director|head|coordinator|recruit\w*|partner|lead)\b")
_IC_MANAGER = re.compile(r"(?<!group )\b(product|program|programme|project|technical program|delivery|account|partner|"
                         r"marketing|community|content|brand|campaign|category) manager\b")
_SENIOR_SIGNALS = ("extensive experience", "extensive professional", "proven track record",
                   "deep production experience", "expert-level", "expert level", "mentor junior",
                   "mentoring junior", "lead a team", "leading a team", "own the architecture",
                   "define the technical direction", "set technical direction", "manage a team",
                   "line management", "seasoned")


def title_level(title: str | None) -> str | None:
    """The level the title alone gives, or None when it names none."""
    t = _ROLE_NAME.sub(" ", normalise_title(title))
    early = _EARLY_CAREER.search(t)
    if early and not _RUNS_PROGRAMME.search(t):
        return "entry" if early.group() == "new grad" else "intern"
    # "Product Manager" names a function, not a manager of people: without the
    # word "manager" a "Senior Product Manager" is senior, a plain one unknown.
    # A "Group Product Manager" does manage, so it keeps the word.
    return _first(_TITLE_LEVELS, _IC_MANAGER.sub(r"\1 ", t))


def classify_seniority(title: str | None, description: str | None = None, provider_level: str | None = None,
                       years: int | None = None) -> str:
    """Title first, then the board's own level, then the posting's language, then its years."""
    level = title_level(title)
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
