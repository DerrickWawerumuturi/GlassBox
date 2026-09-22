"""
Turn a pasted job URL into application fields.

Order of preference, most trustworthy first:
  1. The ATS's own API (Greenhouse, Lever, Ashby) — the same normalizers the
     daily pool uses, so the posting lands on the same `jobs` row.
  2. schema.org JobPosting JSON-LD, which most career pages embed for Google.
  3. Page meta tags (og:title and friends) — thin, but better than nothing.

Never all-or-nothing: whatever was found is returned, and `missing` names the
fields the user still has to fill in. Only an unusable URL is an error.
"""
import http.client
import ipaddress
import json
import re
import socket
import urllib.error
import urllib.request
from html import unescape
import urllib.parse
from urllib.parse import parse_qs, urlsplit

from src.Agent.utils.types import Job
from src.jobpool import sources
from src.jobpool.posting import employment_text, html_to_text, iso_utc, salary_text, workplace
from src.matching.requirements import extract_experience

TIMEOUT = 12
MAX_BYTES = 3_000_000
REVIEW_FIELDS = ("title", "company", "location", "workplace")


class InvalidJobUrl(ValueError):
    pass


class _Blocked(Exception):
    pass


# ------------------------------------------------------------------ fetching
# SSRF: this endpoint makes the server fetch a URL a user chose. Everything it
# may reach must be an ordinary public web server. Every hop is validated,
# including each redirect. A DNS answer that changes between the check and the
# connect (rebinding) is not defended against; that is accepted at this scale.
ALLOWED_PORTS = {80, 443}
MAX_REDIRECTS = 5
BLOCKED_SUFFIXES = (".localhost", ".local", ".internal", ".intranet", ".lan", ".home.arpa", ".corp")
HTML_TYPES = ("text/html", "application/xhtml+xml", "application/xml", "text/xml", "application/ld+json")
_LINK_HELP = "That doesn't look like a web link. Paste the full https:// address of the job posting."


def _is_public_ip(address: str) -> bool:
    try:
        ip = ipaddress.ip_address(address.split("%", 1)[0])  # drop an IPv6 scope id
    except ValueError:
        return False
    if isinstance(ip, ipaddress.IPv6Address) and ip.ipv4_mapped:
        ip = ip.ipv4_mapped
    # is_global alone admits multicast (224.0.0.0/4, ff0e::/16).
    return ip.is_global and not ip.is_multicast


def _check_public(url: str) -> None:
    """Refuse anything but http(s) on a standard port to a public address."""
    parts = urlsplit(url)
    host = (parts.hostname or "").lower().rstrip(".")
    if parts.scheme not in ("http", "https") or not host or " " in host:
        raise InvalidJobUrl(_LINK_HELP)
    if parts.username or parts.password:
        raise InvalidJobUrl("Links with a username or password in them aren't supported.")
    try:
        port = parts.port
    except ValueError:
        raise InvalidJobUrl(_LINK_HELP)
    if port is not None and port not in ALLOWED_PORTS:
        raise InvalidJobUrl("Only standard web addresses are supported (no custom ports).")
    if host == "localhost" or host.endswith(BLOCKED_SUFFIXES):
        raise InvalidJobUrl("That link points at a private network address.")
    try:
        ipaddress.ip_address(host.strip("[]").split("%", 1)[0])
        is_literal = True
    except ValueError:
        is_literal = False
    if not is_literal and "." not in host:
        raise InvalidJobUrl(_LINK_HELP)
    try:
        infos = socket.getaddrinfo(host, port or (443 if parts.scheme == "https" else 80), type=socket.SOCK_STREAM)
    except (socket.gaierror, UnicodeError):
        raise InvalidJobUrl(f"Couldn't find {host}. Check the link for typos.")
    if not infos or not all(_is_public_ip(info[4][0]) for info in infos):
        raise InvalidJobUrl("That link points at a private network address.")


class _SafeRedirects(urllib.request.HTTPRedirectHandler):
    max_redirections = MAX_REDIRECTS

    def redirect_request(self, req, fp, code, msg, headers, newurl):
        _check_public(urllib.parse.urljoin(req.full_url, newurl))
        return super().redirect_request(req, fp, code, msg, headers, newurl)


def _build_opener() -> urllib.request.OpenerDirector:
    """
    HTTP and HTTPS only. build_opener() would also add file:, ftp: and data:.
    UnknownHandler stays: without it any other scheme returns None instead of raising.
    """
    opener = urllib.request.OpenerDirector()
    for handler in (urllib.request.HTTPHandler(), urllib.request.HTTPSHandler(), _SafeRedirects(),
                    urllib.request.HTTPDefaultErrorHandler(), urllib.request.HTTPErrorProcessor(),
                    urllib.request.UnknownHandler()):
        opener.add_handler(handler)
    return opener


_opener = _build_opener()


def _fetch(url: str) -> tuple[str, str]:
    """(final url, html). Raises _Blocked when the site refuses automated reads."""
    req = urllib.request.Request(url, headers={**sources.UA, "Accept": "text/html,application/xhtml+xml"})
    try:
        with _opener.open(req, timeout=TIMEOUT) as r:
            final = r.geturl()
            kind = (r.headers.get_content_type() or "").lower()
            if kind not in HTML_TYPES:
                # A PDF or an image is not a page to parse, and not worth reading.
                return final, ""
            body = r.read(MAX_BYTES).decode(r.headers.get_content_charset() or "utf-8", "ignore")
    except urllib.error.HTTPError as err:
        if err.code in (401, 403, 429, 999):
            raise _Blocked(err.code)
        raise
    if "/authwall" in final or "Just a moment..." in body[:2000] or "cf-challenge" in body[:5000]:
        raise _Blocked("challenge")
    return final, body


# --------------------------------------------------------------- ATS fast path
_GREENHOUSE = re.compile(r"^(?:job-)?boards(?:\.eu)?\.greenhouse\.io$")
_UUID = r"[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}"


def _from_ats(url: str) -> tuple[Job, str] | None:
    parts = urlsplit(url)
    host = (parts.hostname or "").lower()
    path = [p for p in parts.path.split("/") if p]

    try:
        if _GREENHOUSE.match(host) and len(path) >= 3 and path[1] == "jobs":
            slug, job_id = path[0], path[2]
            return sources.greenhouse_job(sources._json(
                f"https://boards-api.greenhouse.io/v1/boards/{slug}/jobs/{job_id}"), slug), "greenhouse"

        gh_jid = parse_qs(parts.query).get("gh_jid")
        if gh_jid:
            # A company careers page embedding Greenhouse, e.g. stripe.com/jobs?gh_jid=…
            # The board slug is usually the company's own domain name.
            labels = [l for l in host.split(".") if l not in ("www", "careers", "jobs", "boards", "apply")]
            slug = labels[0] if labels else host
            return sources.greenhouse_job(sources._json(
                f"https://boards-api.greenhouse.io/v1/boards/{slug}/jobs/{gh_jid[0]}"), slug), "greenhouse"

        if host in ("jobs.lever.co", "jobs.eu.lever.co") and len(path) >= 2:
            api = "api.eu.lever.co" if ".eu." in host else "api.lever.co"
            slug, posting = path[0], path[1]
            return sources.lever_job(sources._json(f"https://{api}/v0/postings/{slug}/{posting}"), slug), "lever"

        if host == "jobs.ashbyhq.com" and len(path) >= 2 and re.fullmatch(_UUID, path[1]):
            slug, posting = path[0], path[1]
            for record in sources.ashby_board(slug):
                if record.get("id") == posting:
                    return sources.ashby_job(record, slug), "ashby"
    except (urllib.error.URLError, ValueError, KeyError, TimeoutError):
        return None
    return None


# ------------------------------------------------------------------ JSON-LD
_LD = re.compile(r'<script[^>]+type=["\']application/ld\+json["\'][^>]*>(.*?)</script>', re.S | re.I)


def _walk(node):
    if isinstance(node, list):
        for item in node:
            yield from _walk(item)
    elif isinstance(node, dict):
        yield node
        for key in ("@graph", "mainEntity"):
            if key in node:
                yield from _walk(node[key])


def _is_posting(node: dict) -> bool:
    kind = node.get("@type")
    return "JobPosting" in (kind if isinstance(kind, list) else [kind])


def _name(value) -> str | None:
    if isinstance(value, dict):
        value = value.get("name")
    if isinstance(value, list):
        value = ", ".join(filter(None, (_name(v) for v in value)))
    return str(value).strip() or None if value else None


def _place(location) -> str | None:
    places = []
    for loc in location if isinstance(location, list) else [location]:
        if isinstance(loc, str):
            places.append(loc)
            continue
        address = (loc or {}).get("address") or {}
        if isinstance(address, str):
            places.append(address)
            continue
        bits = [address.get("addressLocality"), address.get("addressRegion"), _name(address.get("addressCountry"))]
        place = ", ".join(dict.fromkeys(b for b in bits if b))
        if place:
            places.append(place)
    return " · ".join(dict.fromkeys(places)) or None


def _from_json_ld(html: str, url: str) -> Job | None:
    for block in _LD.findall(html):
        try:
            data = json.loads(unescape(block.strip()), strict=False)
        except json.JSONDecodeError:
            continue
        for node in _walk(data):
            if not _is_posting(node):
                continue
            salary = node.get("baseSalary") or {}
            value = salary.get("value") if isinstance(salary, dict) else None
            value = value if isinstance(value, dict) else {"value": value}
            identifier = node.get("identifier")
            telecommute = str(node.get("jobLocationType") or "").upper() == "TELECOMMUTE"
            employment = node.get("employmentType")
            experience = node.get("experienceRequirements")
            if isinstance(experience, dict):
                months = experience.get("monthsOfExperience")
                experience = f"{int(float(months) // 12)}+ years" if months else _name(experience)
            return Job(
                provider="url",
                # Page ids are only unique within one site: "123" exists on thousands.
                external_id=(f"{urlsplit(url).hostname}:{ident}" if (ident := _name(
                    identifier.get("value") if isinstance(identifier, dict) else identifier)) else None),
                title=_name(node.get("title")),
                company=_name(node.get("hiringOrganization")),
                description=html_to_text(node.get("description")),
                location=_place(node.get("jobLocation")) or ("Remote" if telecommute else None),
                remote=True if telecommute else None,
                remote_eligibility=_name(node.get("applicantLocationRequirements")),
                employment_type=", ".join(employment) if isinstance(employment, list) else employment,
                experience_level=experience if isinstance(experience, str) else None,
                salary_min=value.get("minValue") or value.get("value"),
                salary_max=value.get("maxValue"),
                salary_currency=salary.get("currency") if isinstance(salary, dict) else None,
                salary_period=value.get("unitText"),
                url=url,
                posted_at=node.get("datePosted"), posted_at_utc=iso_utc(node.get("datePosted")),
                raw={k: v for k, v in node.items() if k != "description"},
            )
    return None


# --------------------------------------------------------------- meta tags
def _meta(html: str, key: str) -> str | None:
    for pattern in (rf'<meta[^>]+(?:property|name)=["\']{re.escape(key)}["\'][^>]+content=["\']([^"\']*)',
                    rf'<meta[^>]+content=["\']([^"\']*)["\'][^>]+(?:property|name)=["\']{re.escape(key)}["\']'):
        m = re.search(pattern, html, re.I)
        if m and m.group(1).strip():
            return unescape(m.group(1)).strip()
    return None


def _from_meta(html: str, url: str) -> Job | None:
    title = _meta(html, "og:title") or _meta(html, "twitter:title")
    if not title:
        m = re.search(r"<title[^>]*>(.*?)</title>", html, re.S | re.I)
        title = unescape(m.group(1)).strip() if m else None
    if not title:
        return None
    company, location = _meta(html, "og:site_name"), None

    if re.fullmatch(r"(?i)(?:.*\b)?(?:careers?|jobs|job board|open (?:roles|positions)|join us|home)\b.{0,20}", title) \
            and not re.search(r"(?i)\b(?:engineer|developer|manager|designer|analyst|scientist|lead|intern)\b", title):
        return None

    hiring = re.match(r"^(.+?) hiring (.+?)(?: in (.+?))?(?: \| .*)?$", title)
    at = re.match(r"^(.+?) at (.+?)(?: [|–-] .*)?$", title)
    if hiring:
        company, title, location = hiring.group(1), hiring.group(2), hiring.group(3)
    elif at:
        title, company = at.group(1), at.group(2)
    else:
        title = re.split(r" [|–] ", title)[0]

    return Job(provider="url", title=title.strip(), company=company, location=location,
               description=_meta(html, "og:description") or _meta(html, "description"),
               url=url, raw={"og:title": title})


def _from_path(url: str) -> Job | None:
    """linkedin.com/jobs/view/senior-ml-engineer-at-acme-4021 names the job in its slug."""
    slug = [p for p in urlsplit(url).path.split("/") if p]
    m = re.match(r"^(.+)-at-(.+?)-\d+$", slug[-1]) if slug else None
    if not m:
        return None
    words = lambda s: s.replace("-", " ").strip().title()
    return Job(provider="url", title=words(m.group(1)), company=words(m.group(2)), url=url, raw={})


# --------------------------------------------------------------- enrichment
SOURCES = {"linkedin": "linkedin", "indeed": "indeed", "glassdoor": "glassdoor",
           "greenhouse": "greenhouse", "lever": "lever", "ashbyhq": "ashby",
           "myworkdayjobs": "workday", "wellfound": "wellfound",
           "weworkremotely": "weworkremotely", "remotive": "remotive", "remoteok": "remoteok",
           "himalayas": "himalayas", "jobicy": "jobicy", "arbeitnow": "arbeitnow"}


def source_label(url: str) -> str:
    host = (urlsplit(url).hostname or "").lower()
    return next((label for key, label in SOURCES.items() if key in host), "company_site")


# ------------------------------------------------------------------- entry
def clean_title(title: str | None, company: str | None) -> str | None:
    """Board decorations: "[Hiring] Role @Company", "Remote [Job -26953] Role"."""
    if not title:
        return title
    title = re.sub(r"(?i)^\s*(?:remote\s*)?\[(?:hiring|job[^\]]*)\]\s*", "", title)
    if company:
        title = re.sub(rf"\s*(?:@|\bat\b|[|–-])\s*{re.escape(company)}\s*$", "", title, flags=re.I)
    return title.strip() or None


def extract(url: str, pool_lookup=None) -> dict:
    """`pool_lookup(url) -> Job | None` checks postings the daily fetch already holds."""
    url = (url or "").strip()
    if url and "://" not in url:
        url = "https://" + url
    _check_public(url)

    job, method, message = None, "none", None
    pooled = pool_lookup(url) if pool_lookup else None
    ats = None if pooled else _from_ats(url)
    if pooled:
        job, method = pooled, "pool"
    elif ats:
        job, method = ats
    else:
        try:
            final, html = _fetch(url)
            job = _from_json_ld(html, url)
            method = "json-ld" if job else "none"
            if not job:
                job = _from_meta(html, url)
                method = "page-meta" if job else "none"
        except _Blocked:
            message = (f"{urlsplit(url).hostname} blocks automated reading, so the details "
                       "couldn't be fetched. Fill in what's missing below.")
        except (urllib.error.URLError, http.client.HTTPException, OSError, UnicodeError) as err:
            message = f"The page couldn't be loaded ({getattr(err, 'reason', err)}). Fill in the details below."

    if not job or not job.title:
        slug_job = _from_path(url)
        if slug_job:
            job, method = slug_job, "url-path"

    job = job or Job(provider="url", url=url, raw={})
    fields = {
        "title": clean_title(job.title, job.company),
        "company": job.company,
        "location": job.location,
        "workplace": workplace(job),
        "employment_type": employment_text(job.employment_type),
        "salary": salary_text(job),
        "experience_level": job.experience_level,
        "posted_at": job.posted_at_utc,
        "description": job.description,
    }
    missing = [f for f in REVIEW_FIELDS if not fields[f]]
    if not message and missing:
        message = ("Found most of it — check the highlighted fields." if len(missing) < len(REVIEW_FIELDS)
                   else "Couldn't read job details from that page. Fill them in below.")

    return {
        "url": url,
        "source": source_label(url),
        "method": method,
        "fields": fields,
        # {"years": 3, "kind": "required" | "preferred" | "unstated"}
        "experience": extract_experience(job.title, job.description),
        "missing": missing,
        "message": message,
        # Structured results are real source data and may join the pool; a
        # guess from meta tags or the URL slug may not.
        "_job": job if method in ("pool", "greenhouse", "lever", "ashby", "json-ld") and job.title else None,
    }
