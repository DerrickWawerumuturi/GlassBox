"""
Where an analysis gets its jobs: one class per job board, plus the daily pool.

Each provider turns a SearchQuery and one SearchScope (a search leg: local,
remote or fallback) into Jobs. `JobProvider.search` owns everything common —
timing, failure handling and the run_log entry — so a provider only builds its
request and maps the board's fields onto Job. A provider never raises: a dead
board costs its own results, not the analysis.

RemoteOK and Remotive are not here. The daily fetch (src/jobpool/sources.py)
stores their whole boards every morning and PoolProvider serves them, which
beats a live call whose search filter both boards largely ignore.
"""
import os
import re
import time

import requests
from dotenv import find_dotenv, load_dotenv
from pydantic import ValidationError

from src.Agent.utils import location as loc
from src.Agent.utils.types import Job, SearchQuery, SearchScope
from src.database.repositories import job_repository
from src.database.session import connection, is_configured

load_dotenv(find_dotenv())

# (connect, read). Without these a single unresponsive provider stalls the
# whole analysis indefinitely.
REQUEST_TIMEOUT = (5, 30)

USER_AGENT = "JobRadar/1.0 (+https://github.com/DerrickWawerumuturi)"


class _HttpError(Exception):
    def __init__(self, response):
        super().__init__(f"HTTP {response.status_code}")
        self.response = response


class JobProvider:
    # Stamped onto every posting this provider returns. Set here rather than in
    # each normalize() so a provider cannot omit it — it is half of the storage
    # layer's deduplication key.
    name: str = "unknown"

    # Which kinds of scope this provider can actually serve. A board with no
    # local inventory cannot answer "jobs in Nairobi", so asking is a wasted call.
    scopes: tuple = ("local", "remote", "fallback")

    def available(self) -> bool:
        """False when a required key is missing, so the provider is skipped."""
        return True

    def supports(self, scope: SearchScope) -> bool:
        return scope.kind in self.scopes

    def search(self, query: SearchQuery, scope: SearchScope, run_log: list | None = None) -> list[Job]:
        """Jobs for one leg. Never raises; appends one entry to run_log."""
        outcome = {"provider": self.name, "status": "ok", "request_params": {}}
        started = time.perf_counter()
        jobs = []
        try:
            jobs = self.fetch(query, scope, outcome)
        except _HttpError as err:
            outcome.update(status="http_error", http_status=err.response.status_code, error=err.response.text[:500])
        except requests.Timeout as err:
            outcome.update(status="timeout", error=str(err)[:500])
        except Exception as err:
            outcome.update(status="exception", error=str(err)[:500])

        if "error" in outcome:
            print(f"[{self.name}/{scope.label}] {outcome['status']}: {outcome['error'][:200]}")
        if run_log is not None:
            outcome.update(jobs_returned=len(jobs), scope=scope.label,
                           duration_ms=int((time.perf_counter() - started) * 1000))
            run_log.append(outcome)
        return jobs

    def fetch(self, query: SearchQuery, scope: SearchScope, outcome: dict) -> list[Job]:
        """Make the request and return Jobs. Record what was asked in outcome."""
        raise NotImplementedError

    def normalize(self, job_data: dict) -> dict:
        """Map one board posting onto Job's fields. "id" becomes external_id."""
        raise NotImplementedError

    def parse_jobs(self, items: list[dict]) -> list[Job]:
        jobs = []
        for item in items:
            normalized = self.normalize(item)
            try:
                jobs.append(Job(**normalized, provider=self.name, external_id=normalized.get("id"), raw=item))
            except ValidationError as err:
                print(f"[{self.name}] Skipping invalid job: {err}")
        return jobs

    @staticmethod
    def _body(response, outcome: dict):
        outcome["http_status"] = response.status_code
        if response.status_code != 200:
            raise _HttpError(response)
        return response.json()


# Adzuna stays out: it truncates descriptions to 500 characters, which removes
# the skills the whole pipeline depends on. Its country list also excludes
# Kenya, so it would not have helped here either.


class JSearchProvider(JobProvider):
    name = "jsearch"
    URL = "https://jsearch.p.rapidapi.com/search-v2"

    def available(self) -> bool:
        return bool(os.getenv("JSEARCH_API_KEY"))

    def fetch(self, query, scope, outcome):
        # The ISO code belongs in `country`, never in the query text: measured,
        # "engineer in ke" returns one posting where "engineer in Kenya"
        # returns a full page.
        text = query.primary_role or ""
        if scope.place:
            text = f"{text} in {scope.place}"
        params = {
            "query": text.strip(),
            "page": 1,
            "num_pages": "1",
            "job_requirements": query.job_requirements,
        }
        if scope.country_code:
            params["country"] = scope.country_code
        if scope.kind == "remote":
            params["work_from_home"] = "true"
        outcome["request_params"] = params

        headers = {
            "x-rapidapi-key": os.getenv("JSEARCH_API_KEY"),
            "x-rapidapi-host": os.getenv("JSEARCH_HOST"),
            "Content-Type": "application/json",
        }
        response = requests.get(self.URL, headers=headers, params=params, timeout=REQUEST_TIMEOUT)
        return self.parse_jobs(self._body(response, outcome).get("data", {}).get("jobs", []))

    def normalize(self, job_data: dict) -> dict:
        city, country = job_data.get("job_city"), job_data.get("job_country")
        return {
            "id": job_data.get("job_id"),
            "title": job_data.get("job_title"),
            "company": job_data.get("employer_name"),
            "description": job_data.get("job_description"),
            "salary": job_data.get("job_max_salary"),
            "salary_min": job_data.get("job_min_salary"),
            "salary_max": job_data.get("job_max_salary"),
            "salary_currency": job_data.get("job_salary_currency"),
            "salary_period": job_data.get("job_salary_period"),
            "remote": job_data.get("job_is_remote"),
            # City and country together: country alone gave every posting from
            # one call the same location.
            "location": ", ".join(p for p in (city, country) if p) or country,
            # The apply link, not employer_website (the company homepage).
            "url": job_data.get("job_apply_link"),
            "employment_type": job_data.get("job_employment_type"),
            "posted_at": job_data.get("job_posted_at"),
            "posted_at_utc": job_data.get("job_posted_at_datetime_utc"),
        }


# The Muse rejects anything outside its own taxonomy by returning zero results,
# so the LLM's category is checked against this before it is sent.
MUSE_CATEGORIES = frozenset({
    "Software Engineering", "Data and Analytics", "Computer and IT",
    "Science and Engineering", "Design and UX", "Product Management",
    "Project Management", "IT", "Business Operations",
})


class MuseProvider(JobProvider):
    name = "muse"
    URL = "https://www.themuse.com/api/public/jobs"

    def fetch(self, query, scope, outcome):
        params = {"api_key": os.getenv("MUSE_API_KEY"), "page": 1, "level": query.experience_level}
        # Only a real taxonomy value, never a job title: measured,
        # category="machine learning engineer" returns total=0 while
        # "Software Engineering" returns 100k.
        category = (query.category or "").strip()
        if category in MUSE_CATEGORIES:
            params["category"] = category
        if scope.kind == "remote":
            params["location"] = "Flexible / Remote"
        elif scope.place:
            params["location"] = scope.place
        outcome["request_params"] = {k: v for k, v in params.items() if k != "api_key"}

        results = self._body(requests.get(self.URL, params=params, timeout=REQUEST_TIMEOUT), outcome).get("results", [])
        # The location filter narrows the corpus but does not restrict it —
        # asking for "Nairobi, Kenya" still returns Dallas and New York.
        if scope.kind == "local":
            results = [j for j in results if self._in_place(j, scope)]
        return self.parse_jobs(results)

    @staticmethod
    def _in_place(job_data: dict, scope: SearchScope) -> bool:
        names = " | ".join(l.get("name", "") for l in job_data.get("locations", [])).lower()
        return any(p.lower() in names for p in (scope.city, scope.country_name) if p)

    def normalize(self, job_data: dict) -> dict:
        locations = job_data.get("locations", [])
        location = locations[0].get("name") if locations else None
        # Provider-supplied, not inferred: The Muse publishes a level per
        # posting, the only board that does.
        levels = job_data.get("levels", [])
        return {
            "id": job_data.get("id"),
            "title": job_data.get("name"),
            "company": job_data.get("company", {}).get("name"),
            "description": job_data.get("contents"),
            "location": location,
            "remote": bool(location and "remote" in location.lower()),
            "experience_level": levels[0].get("name") if levels else None,
            "employment_type": job_data.get("type"),
            "url": job_data.get("refs", {}).get("landing_page"),
            "posted_at": job_data.get("publication_date"),
            "posted_at_utc": job_data.get("publication_date"),
        }


class JoobleProvider(JobProvider):
    """
    60+ country coverage from one free key — the widest local reach available.

    Its `snippet` is a truncated description, not the full posting. Adzuna was
    dropped for exactly that reason, so skill counts from Jooble are thinner.
    """

    name = "jooble"
    scopes = ("local", "fallback")

    def available(self) -> bool:
        return bool(os.getenv("JOOBLE_API_KEY"))

    def fetch(self, query, scope, outcome):
        payload = {"keywords": query.primary_role or "", "location": scope.place or scope.country_name or ""}
        outcome["request_params"] = payload
        response = requests.post(
            f"https://jooble.org/api/{os.getenv('JOOBLE_API_KEY')}",
            json=payload,
            headers={"Content-Type": "application/json", "User-Agent": USER_AGENT},
            timeout=REQUEST_TIMEOUT,
        )
        return self.parse_jobs(self._body(response, outcome).get("jobs", []))

    def normalize(self, job_data: dict) -> dict:
        return {
            "id": job_data.get("id"),
            "title": job_data.get("title"),
            "company": job_data.get("company"),
            "description": job_data.get("snippet"),
            "location": job_data.get("location"),
            "employment_type": job_data.get("type"),
            "url": job_data.get("link"),
            "posted_at": job_data.get("updated"),
            "posted_at_utc": job_data.get("updated"),
        }


class PoolProvider(JobProvider):
    """
    The daily job pool (src/jobpool), matched to this search by title.

    Postings come back under their original provider and id, so one also found
    live dedupes against it, and re-storing it only refreshes its own row.
    """

    name = "pool"
    LIMIT = 60
    # Remote candidates fetched before tier ranking trims them to LIMIT, so a
    # Kenya-eligible role is not lost behind newer US-only ones.
    REMOTE_CANDIDATES = 400
    MAX_AGE_DAYS = 90
    # A posting the daily refresh has not seen for this long has most likely
    # been taken down.
    LIVE_WITHIN_DAYS = 3
    # Providers the daily refresh re-checks. Others (JSearch, Jooble, Muse,
    # pasted links) are only seen when someone finds them, so a missed daily
    # sighting says nothing; they get a plain age limit instead. Without this,
    # every Kenya job JSearch ever found vanished after 3 days.
    DAILY_REFRESHED = ("greenhouse", "ashby", "lever", "workable", "remoteok", "remotive",
                       "arbeitnow", "jobicy", "himalayas", "weworkremotely")
    UNVERIFIED_WITHIN_DAYS = 30

    def available(self) -> bool:
        return is_configured()

    def fetch(self, query, scope, outcome):
        # Every word of a title must match, so the primary role alone misses
        # the secondary roles the CV also qualifies for.
        roles = list(dict.fromkeys(r.strip() for r in [query.primary_role, *query.secondary_roles] if r and r.strip()))[:4]
        places = [p for p in (scope.city, scope.country_name) if p]
        params = {
            "roles": roles,
            "live": self.LIVE_WITHIN_DAYS,
            "refreshed": list(self.DAILY_REFRESHED),
            "unverified": self.UNVERIFIED_WITHIN_DAYS,
            "age": self.MAX_AGE_DAYS,
            "remote": True if scope.kind == "remote" else None,
            "place": "|".join(re.escape(p) for p in places) if scope.kind != "remote" and places else None,
            "limit": self.REMOTE_CANDIDATES if scope.kind == "remote" else self.LIMIT,
        }
        outcome["request_params"] = {k: v for k, v in params.items() if v is not None}
        if not roles or (scope.kind != "remote" and not places):
            outcome["status"] = "skipped"
            return []

        with connection() as conn:
            jobs = job_repository.search_pool(conn, params)
        if scope.kind == "remote" and scope.country_code:
            prefs = loc.LocationPreferences(country_code=scope.country_code, city=scope.city)
            jobs.sort(key=lambda job: -loc.location_fit(loc.location_tier(job, prefs), prefs))
        return jobs[:self.LIMIT]
