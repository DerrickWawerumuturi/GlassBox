"""
One search: which legs to run, every provider on every leg it serves, then
dedupe and the eligibility filter. The providers themselves are in providers.py.
"""
from concurrent.futures import ThreadPoolExecutor

from src.Agent.Framework.providers import JoobleProvider, JSearchProvider, MuseProvider, PoolProvider
from src.Agent.utils import location as loc
from src.Agent.utils.types import SearchOutcome, SearchQuery, SearchScope
from src.database.fingerprint import resolve_identity

# Below this many postings the market statistics stop meaning anything —
# frequency is job_count/total, so eight jobs make every skill a multiple of
# 12.5%. The search widens rather than reporting confident noise.
MIN_JOBS_FLOOR = 15

# Only used when the user's own market comes back too thin, and only ever as an
# explicitly labelled addition.
FALLBACK_MARKETS = (("us", "United States"), ("gb", "United Kingdom"))


class SearchEngine:
    def __init__(self):
        self.providers = [JSearchProvider(), MuseProvider(), JoobleProvider(), PoolProvider()]

    def build_scopes(self, resolved) -> list[SearchScope]:
        """
        Two legs, deliberately.

        Someone in Nairobi has two markets, not one: what Kenya advertises, and
        what the world advertises that they can do from Kenya. Searching only
        the first hides most of their opportunities; searching only the second
        is what the old hardcoded us/gb/ca list effectively did.
        """
        scopes = []

        if resolved.known and not resolved.remote_only:
            scopes.append(SearchScope(
                kind="local",
                label=f"local:{resolved.country_code}",
                country_code=resolved.country_code,
                country_name=resolved.country_name,
                city=resolved.city,
                place=resolved.place_phrase(),
            ))

        scopes.append(SearchScope(
            kind="remote",
            label="remote:global",
            country_code=resolved.country_code,
            country_name=resolved.country_name,
        ))
        return scopes

    def _run_scopes(self, query, scopes, run_log):
        tasks = [
            (provider, scope)
            for scope in scopes
            for provider in self.providers
            if provider.available() and provider.supports(scope)
        ]
        if not tasks:
            return []

        def run(task):
            provider, scope = task
            try:
                return provider.search(query, scope, run_log=run_log)
            except Exception as e:
                print(f"{provider.__class__.__name__}/{scope.label} failed: {e}")
                return []

        # Every leg is an independent network wait, so they all overlap.
        with ThreadPoolExecutor(max_workers=min(8, len(tasks))) as pool:
            results = pool.map(run, tasks)

        return [job for batch in results for job in batch]

    @staticmethod
    def _dedupe(jobs):
        """
        One posting, one row in the analysis.

        Several legs can return the same job, and MarketAnalyzer counts skills
        per job — so a duplicate does not merely repeat in the list, it inflates
        every skill that posting mentions.
        """
        seen, unique = set(), []
        for job in jobs:
            # The identity storage uses, so "the same posting" means one thing —
            # plus the exact URL, because JSearch hands out a new job_id for the
            # same posting on every call, so the pool's copy and the live copy
            # of one job never share an id. The query string stays: on a company
            # careers page, ?gh_jid= is what tells two jobs apart.
            identity, _, _ = resolve_identity(job)
            url = (job.url or "").strip().rstrip("/").lower()
            if identity in seen or (url and url in seen):
                continue
            seen.add(identity)
            if url:
                seen.add(url)
            unique.append(job)
        return unique, len(jobs) - len(unique)

    @staticmethod
    def _filter_eligible(jobs, resolved):
        """
        Drop postings this user cannot hold, by the same rule ranking uses.

        A remote job restricted to the USA — whether the board says so in its
        eligibility field or only in "Remote - US" — is not a remote job for
        someone in Nairobi, and it must not count toward their market either.
        """
        if not resolved.country_code:
            return jobs, 0

        prefs = loc.LocationPreferences(country_code=resolved.country_code, city=resolved.city)
        kept = [job for job in jobs if loc.location_tier(job, prefs) != "ineligible"]
        return kept, len(jobs) - len(kept)

    def get_jobs(self, query: SearchQuery, run_log: list | None = None) -> SearchOutcome:
        """
        Postings for this query, with a record of where they came from.

        `run_log`, when given, collects one entry per upstream request — status,
        parameters, timing. It is an out-parameter rather than a return value so
        the engine stays a job source and knows nothing about storage.
        """
        resolved = loc.resolve(query)
        if resolved.warning:
            print(f"Location: {resolved.warning}")

        scopes = self.build_scopes(resolved)
        jobs = self._run_scopes(query, scopes, run_log)

        # Dedup and the eligibility filter are what shrink the set, so the floor
        # has to be measured after them. Checking the raw count let 17 postings
        # clear a floor of 15 and then reduce to 8 once the US-only remote jobs
        # were dropped — under the floor, with nothing widened.
        jobs, duplicates = self._dedupe(jobs)
        jobs, ineligible = self._filter_eligible(jobs, resolved)

        widened = False
        if len(jobs) < MIN_JOBS_FLOOR:
            widened = True
            print(
                f"Only {len(jobs)} usable postings for "
                f"{resolved.country_name or 'this query'}; widening to "
                f"{', '.join(n for _, n in FALLBACK_MARKETS)}"
            )
            extra = [
                SearchScope(kind="fallback", label=f"fallback:{code}",
                            country_code=code, country_name=name, place=name)
                for code, name in FALLBACK_MARKETS
                if code != resolved.country_code
            ]
            jobs += self._run_scopes(query, extra, run_log)
            scopes = scopes + extra

            jobs, more_duplicates = self._dedupe(jobs)
            jobs, more_ineligible = self._filter_eligible(jobs, resolved)
            duplicates += more_duplicates
            ineligible += more_ineligible

        coverage = {
            "location": {
                "country_code": resolved.country_code,
                "country_name": resolved.country_name,
                "city": resolved.city,
                "remote_only": resolved.remote_only,
                "source": resolved.source,
                "warning": resolved.warning,
            },
            "scopes": [s.label for s in scopes],
            "widened_below_floor": widened,
            "minimum_jobs_floor": MIN_JOBS_FLOOR,
            "duplicates_removed": duplicates,
            "remote_ineligible_removed": ineligible,
            "jobs_returned": len(jobs),
            "providers": [
                {
                    "provider": entry.get("provider"),
                    "scope": entry.get("scope"),
                    "status": entry.get("status"),
                    "jobs": entry.get("jobs_returned"),
                }
                for entry in (run_log or [])
            ],
        }

        return SearchOutcome(jobs=jobs, coverage=coverage)
