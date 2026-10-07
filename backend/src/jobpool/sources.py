"""
Daily job sources, ported from jobhunt (Desktop/JOB_APPLICATIONS_2026).

Every board the daily pool reads: fetching and field mapping for each, and
`fetch_all` to run them concurrently. The one implementation — jobhunt imports
it too. Output is JobRadar's `Job`, so a posting fetched here and the same one
found by an analysis resolve to one row in `jobs`. RemoteOK and Remotive are
only fetched here; analyses read them from the pool.

jobhunt's scoring, Excel tracker and accountability stay in jobhunt: they
describe one person's search, not a shared pool.
"""
import concurrent.futures as cf
import json
import os
import re
import urllib.request
from datetime import timezone
from email.utils import parsedate_to_datetime
from html import unescape

from src.Agent.utils.types import Job
from src.jobpool.posting import html_to_text, iso_utc

HERE = os.path.dirname(os.path.abspath(__file__))
UA = {"User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) "
                    "AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120 Safari/537.36"}
TIMEOUT = 25
DESCRIPTION_LIMIT = 8000


def _json(url):
    req = urllib.request.Request(url, headers=UA)
    with urllib.request.urlopen(req, timeout=TIMEOUT) as r:
        return json.loads(r.read())


def _description(value) -> str | None:
    return (html_to_text(value) or "")[:DESCRIPTION_LIMIT] or None


def _company(slug: str) -> str:
    return slug.replace("-", " ").replace("_", " ").title()


def _slim(raw: dict, *heavy: str) -> dict:
    """The description is already a column; do not store it twice."""
    return {k: v for k, v in raw.items() if k not in heavy}


# ---------------------------------------------------------------- ATS boards
def greenhouse_job(j: dict, slug: str) -> Job:
    published = j.get("first_published") or j.get("updated_at")
    location = (j.get("location") or {}).get("name")
    return Job(
        provider="greenhouse", external_id=j.get("id"),
        title=j.get("title"), company=j.get("company_name") or _company(slug),
        description=_description(j.get("content")), location=location,
        remote="remote" in (location or "").lower(),
        url=j.get("absolute_url"),
        posted_at=published, posted_at_utc=iso_utc(published),
        raw=_slim(j, "content"),
    )


def greenhouse(slug):
    d = _json(f"https://boards-api.greenhouse.io/v1/boards/{slug}/jobs?content=true")
    return [greenhouse_job(j, slug) for j in d.get("jobs", [])]


def ashby_board(slug) -> list[dict]:
    return _json(f"https://api.ashbyhq.com/posting-api/job-board/{slug}?includeCompensation=true").get("jobs", [])


def ashby_job(j: dict, slug: str) -> Job:
    return Job(
        provider="ashby", external_id=j.get("id"),
        title=j.get("title"), company=_company(slug),
        description=_description(j.get("descriptionPlain") or j.get("descriptionHtml")),
        location=j.get("location"), remote=j.get("isRemote"),
        employment_type=j.get("employmentType"),
        url=j.get("jobUrl"),
        posted_at=j.get("publishedAt"), posted_at_utc=iso_utc(j.get("publishedAt")),
        raw=_slim(j, "descriptionHtml", "descriptionPlain"),
    )


def ashby(slug):
    return [ashby_job(j, slug) for j in ashby_board(slug) if j.get("isListed") is not False]


def lever_job(j: dict, slug: str) -> Job:
    cats = j.get("categories") or {}
    pay = j.get("salaryRange") or {}
    return Job(
        provider="lever", external_id=j.get("id"),
        title=j.get("text"), company=_company(slug),
        description=_description(j.get("descriptionPlain") or j.get("description")),
        location=cats.get("location"),
        remote=(j.get("workplaceType") or "").lower() == "remote",
        employment_type=cats.get("commitment"),
        salary_min=pay.get("min"), salary_max=pay.get("max"),
        salary_currency=pay.get("currency"), salary_period=pay.get("interval"),
        url=j.get("hostedUrl"),
        # Epoch milliseconds, not a date string.
        posted_at=str(j.get("createdAt") or ""), posted_at_utc=iso_utc(j.get("createdAt")),
        raw=_slim(j, "description", "descriptionPlain", "descriptionBody",
                  "descriptionBodyPlain", "lists", "additional", "additionalPlain",
                  "opening", "openingPlain"),
    )


def lever(slug):
    return [lever_job(j, slug) for j in _json(f"https://api.lever.co/v0/postings/{slug}?mode=json")]


# ------------------------------------------------------------- aggregators
def remoteok():
    out = []
    # The first element is a legal notice, not a posting.
    for j in _json("https://remoteok.com/api"):
        if not isinstance(j, dict) or not j.get("position"):
            continue
        where = (j.get("location") or "").strip()
        out.append(Job(
            provider="remoteok", external_id=j.get("id"),
            title=j.get("position") or j.get("title"), company=j.get("company"),
            description=_description(j.get("description")),
            # Blank means the board said nothing: unknown, not a restriction.
            location=where or "Remote", remote=True, remote_eligibility=where or None,
            salary_min=j.get("salary_min"), salary_max=j.get("salary_max"), salary=j.get("salary_max"),
            url=j.get("url") or j.get("apply_url"),
            posted_at=j.get("date"), posted_at_utc=j.get("date"),
            raw=j,
        ))
    return out


def remotive():
    out = []
    for j in _json("https://remotive.com/api/remote-jobs?limit=400").get("jobs", []):
        eligibility = j.get("candidate_required_location")
        out.append(Job(
            provider="remotive", external_id=j.get("id"),
            title=j.get("title"), company=j.get("company_name"), description=_description(j.get("description")),
            location=eligibility, remote=True, remote_eligibility=eligibility,
            employment_type=j.get("job_type"), url=j.get("url"),
            posted_at=j.get("publication_date"), posted_at_utc=j.get("publication_date"),
            raw=j,
        ))
    return out


def arbeitnow():
    """
    The whole feed, page by page until it says there is no next page. It holds
    about a week of jobs: 28 pages and 2,986 recent jobs on 2026-10-07, when
    pages 1 and 2 alone missed 76 of its 101 early career tech jobs.
    """
    out = []
    for page in range(1, ARBEITNOW_PAGES + 1):
        try:
            d = _json(f"https://www.arbeitnow.com/api/job-board-api?page={page}")
        except Exception:
            # A dead first page is a dead source, reported as one. Later, keep
            # what was read: the live window covers a day of missed sightings.
            if page == 1:
                raise
            break
        for j in d.get("data", []):
            out.append(Job(
                provider="arbeitnow", external_id=j.get("slug"),
                title=j.get("title"), company=j.get("company_name"),
                description=_description(j.get("description")), location=j.get("location"),
                remote=j.get("remote"),
                employment_type=", ".join(j.get("job_types") or []) or None,
                url=j.get("url"),
                posted_at=str(j.get("created_at") or ""), posted_at_utc=iso_utc(j.get("created_at")),
                raw=_slim(j, "description"),
            ))
        if not d.get("data") or not (d.get("links") or {}).get("next"):
            break
    return out


def jobicy():
    out = []
    # The default feed is US-heavy; geo=emea is a separate slice, not a subset.
    jobs = (_json("https://jobicy.com/api/v2/remote-jobs?count=100").get("jobs", [])
            + _json("https://jobicy.com/api/v2/remote-jobs?count=100&geo=emea").get("jobs", []))
    for j in jobs:
        out.append(Job(
            provider="jobicy", external_id=j.get("id"),
            title=j.get("jobTitle"), company=j.get("companyName"),
            description=_description(j.get("jobDescription") or j.get("jobExcerpt")),
            location=j.get("jobGeo") or "Remote", remote=True, remote_eligibility=j.get("jobGeo"),
            employment_type=", ".join(j.get("jobType") or []) or None,
            experience_level=j.get("jobLevel"),
            salary_min=j.get("salaryMin"), salary_max=j.get("salaryMax"),
            salary_currency=j.get("salaryCurrency"), salary_period=j.get("salaryPeriod"),
            url=j.get("url"),
            posted_at=j.get("pubDate"), posted_at_utc=iso_utc(j.get("pubDate")),
            raw=_slim(j, "jobDescription"),
        ))
    return out


def _himalayas_job(j: dict) -> Job:
    restrictions = ", ".join(j.get("locationRestrictions") or []) or None
    # No restrictions on Himalayas means hiring worldwide, not "unknown".
    eligibility = restrictions or "Worldwide"
    return Job(
        provider="himalayas", external_id=j.get("guid"),
        title=j.get("title"), company=j.get("companyName"),
        description=_description(j.get("description")),
        location=restrictions or "Remote", remote=True, remote_eligibility=eligibility,
        employment_type=j.get("employmentType"),
        salary_min=j.get("minSalary"), salary_max=j.get("maxSalary"),
        salary_currency=j.get("currency"), salary_period=j.get("salaryPeriod"),
        url=j.get("applicationLink"),
        posted_at=str(j.get("pubDate") or ""), posted_at_utc=iso_utc(j.get("pubDate")),
        raw=_slim(j, "description"),
    )


def himalayas():
    return [_himalayas_job(j) for j in _json("https://himalayas.app/jobs/api?limit=100").get("jobs", [])]


def himalayas_regional():
    """
    Remote jobs open to applicants in each coverage country. The unfiltered
    feed returns the newest 20 worldwide; this is where Kenya-, Nigeria- and
    South-Africa-eligible roles actually come from (2,338 open to KE on
    2026-09-15).
    """
    out = []
    for country in POOL_COUNTRIES:
        for page in range(REGIONAL_PAGES):
            batch = _json(f"https://himalayas.app/jobs/api/search?country={country}"
                          f"&limit=20&offset={page * 20}").get("jobs", [])
            out.extend(_himalayas_job(j) for j in batch)
            if len(batch) < 20:
                break
    return out


def rss(url) -> list[dict]:
    """Each <item> of an RSS feed as {tag: text}, with pubDate also as ISO UTC."""
    req = urllib.request.Request(url, headers={**UA, "Accept": "application/rss+xml, text/xml, */*"})
    with urllib.request.urlopen(req, timeout=TIMEOUT) as r:
        xml = r.read().decode("utf8", "ignore")
    items = []
    for item in re.findall(r"<item>(.*?)</item>", xml, re.S):
        def tag(t):
            m = re.search(rf"<{t}[^>]*>(?:<!\[CDATA\[)?(.*?)(?:\]\]>)?</{t}>", item, re.S)
            return unescape(m.group(1)).strip() if m else ""
        fields = {t: tag(t) for t in ("title", "link", "guid", "description", "content:encoded", "region", "pubDate")}
        try:
            fields["posted_utc"] = parsedate_to_datetime(fields["pubDate"]).astimezone(timezone.utc).isoformat()
        except (TypeError, ValueError):
            fields["posted_utc"] = None
        items.append(fields)
    return items


def weworkremotely():
    feeds = ["remote-programming-jobs", "remote-full-stack-programming-jobs",
             "remote-front-end-programming-jobs", "remote-devops-sysadmin-jobs"]
    out = []
    for feed in feeds:
        for item in rss(f"https://weworkremotely.com/categories/{feed}.rss"):
            company, _, role = item["title"].partition(":")
            out.append(Job(
                provider="weworkremotely", external_id=item["guid"] or item["link"],
                title=(role or item["title"]).strip(), company=company.strip() if role else None,
                description=_description(item["description"]),
                location=item["region"] or "Remote", remote=True, remote_eligibility=item["region"] or None,
                url=item["link"],
                posted_at=item["pubDate"], posted_at_utc=item["posted_utc"],
                raw={"guid": item["guid"], "title": item["title"], "region": item["region"], "pubDate": item["pubDate"]},
            ))
    return out


# Local coverage for a market the global boards barely carry: Kenyan job boards'
# RSS feeds, published for syndication (proven in jobhunt). Mixed industries, so
# matching does the filtering, and summaries are short (100-500 bytes), so
# profiles mark them thin. More countries' boards slot in the same way.
KENYAN_BOARDS = {
    "myjobmag": "https://www.myjobmag.co.ke/jobsxml.xml",
    "corporatestaffing": "https://www.corporatestaffing.co.ke/feed/",
    "careerpointkenya": "https://www.careerpointkenya.co.ke/feed/",
    "jobwebkenya": "https://jobwebkenya.com/feed/",
    "summitrecruitment": "https://www.summitrecruitment-search.com/feed/",
    "jobsinkenya": "https://www.jobsinkenya.co.ke/feed/",
}
# Kenyan boards title their items "Role at Employer".
_AT = re.compile(r"^(.*?)\s+at\s+(.+?)\s*$", re.I)


def kenyan_board(name):
    out = []
    for item in rss(KENYAN_BOARDS[name]):
        title = html_to_text(item["title"]) or ""
        if not title:
            continue
        m = _AT.match(title)
        role, company = (m.group(1), m.group(2)) if m else (title, None)
        out.append(Job(
            provider=name, external_id=item["guid"] or item["link"],
            title=role, company=company,
            description=_description(item["content:encoded"] or item["description"]),
            location="Kenya", remote=False, url=item["link"],
            posted_at=item["pubDate"], posted_at_utc=item["posted_utc"],
            raw={"guid": item["guid"], "title": title, "pubDate": item["pubDate"]},
        ))
    return out


def workable(slug):
    d = _json(f"https://apply.workable.com/api/v1/widget/accounts/{slug}?details=true")
    company = d.get("name") or _company(slug)
    out = []
    for j in d.get("jobs", []):
        place = ", ".join(dict.fromkeys(filter(None, (j.get("city"), j.get("state"), j.get("country")))))
        published = j.get("published_on") or j.get("created_at")
        out.append(Job(
            provider="workable", external_id=j.get("shortcode") or j.get("code"),
            title=j.get("title"), company=company,
            description=_description(j.get("description")),
            location=place or ("Remote" if j.get("telecommuting") else None),
            remote=bool(j.get("telecommuting")),
            employment_type=j.get("employment_type"),
            experience_level=j.get("experience"),
            url=j.get("url") or j.get("shortlink"),
            posted_at=published, posted_at_utc=iso_utc(published),
            raw=_slim(j, "description", "requirements", "benefits"),
        ))
    return out


# Countries whose remote-eligible roles are fetched explicitly. Collection
# stays broad everywhere else; this only fills markets the default feeds miss.
POOL_COUNTRIES = [c.strip().upper() for c in
                  os.getenv("JOBRADAR_POOL_COUNTRIES", "KE,NG,ZA,GH,UG,RW,TZ,EG").split(",") if c.strip()]
REGIONAL_PAGES = int(os.getenv("JOBRADAR_POOL_REGIONAL_PAGES", "5"))
# A ceiling, not a target: arbeitnow() stops where the feed ends (28 pages of
# 100 to 325 jobs on 2026-10-07). Each page is one request, read in turn.
ARBEITNOW_PAGES = int(os.getenv("JOBRADAR_POOL_ARBEITNOW_PAGES", "40"))

AGGREGATORS = [remoteok, remotive, arbeitnow, jobicy, himalayas, himalayas_regional, weworkremotely]
ATS = {"greenhouse": greenhouse, "ashby": ashby, "lever": lever, "workable": workable}

# The live pool. Boards read in full every day: a posting missing from one for a
# few days has been taken down. RSS feeds show only their latest items and
# searches only what matched, so for everything else a missed sighting says
# nothing and a plain age limit applies. Shared by PoolProvider (analyses) and
# the opportunities list, so both mean the same pool.
FULL_BOARDS = (*ATS, "remoteok", "remotive", "arbeitnow", "jobicy", "himalayas", "weworkremotely")
POOL_WINDOWS = {"age": 90, "live": 3, "unverified": 30}


def load_boards(path=None):
    path = path or os.path.join(HERE, "companies.txt")
    boards = []
    with open(path, encoding="utf-8") as fh:
        for line in fh:
            line = line.split("#")[0].strip()
            if ":" in line:
                ats, _, slug = line.partition(":")
                if ats.strip() in ATS:
                    boards.append((ats.strip(), slug.strip()))
    return boards


def fetch_all(workers=24):
    """Every source concurrently. One dead source never stops the run."""
    jobs, report = [], []
    with cf.ThreadPoolExecutor(workers) as ex:
        futs = {ex.submit(fn): fn.__name__ for fn in AGGREGATORS}
        futs.update({ex.submit(kenyan_board, name): f"ke:{name}" for name in KENYAN_BOARDS})
        for ats, slug in load_boards():
            futs[ex.submit(ATS[ats], slug)] = f"{ats}:{slug}"
        for fut in cf.as_completed(futs):
            name = futs[fut]
            try:
                got = fut.result()
                jobs.extend(got)
                report.append((name, len(got), None))
            except Exception as err:
                report.append((name, 0, type(err).__name__))
    report.sort(key=lambda r: -r[1])
    return jobs, report
