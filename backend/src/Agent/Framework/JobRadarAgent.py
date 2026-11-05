import dataclasses
from datetime import datetime, timezone

from src.Agent.Framework.MarketAnalyzer import MarketAnalyzer
from src.Agent.utils.embedder import SentenceEmbedder
from src.Agent.utils.llm_client import GroqModel
from src.Agent.Framework.SearchEngine import SearchEngine, MIN_JOBS_FLOOR
from src.Agent.utils.parser import cv_skill_names, parse_retrieved_jobs
from src.Agent.utils.types import ParsedQuery, SearchQuery
from src.Agent.utils import location as loc
from src.database.fingerprint import resolve_identity
from src.database.services.ingestion import JobIngestionService
from src.matching.candidate import Candidate
from src.matching.matcher import TIER_ORDER, match
from src.matching.requirements import profile_job
from src.api.cv_telemetry import stage


def persist_search_jobs(ingestion, search_id, jobs):
    """Persist only fresh provider results; pool rows already have durable database IDs.

    Existing pool rows are still analyzed in full; this only avoids redundant writes.
    """
    job_ids = {
        resolve_identity(job)[0]: job.db_id
        for job in jobs if job.db_id is not None
    }
    new_jobs = [job for job in jobs if job.db_id is None]
    job_ids.update(ingestion.persist_jobs(search_id, new_jobs))
    return job_ids


class JobRadarAgent:
    def __init__(self):
        self.query_interpreter = GroqModel("user")
        self.search_engine = SearchEngine()
        self.sentence_embedder = SentenceEmbedder()
        self.market_analyzer = MarketAnalyzer()
        self.ingestion = JobIngestionService()

    def run(self, user_input, location_preferences: dict | None = None):
        return self.match(self.parse(user_input), location_preferences)

    def parse(self, cv_text) -> ParsedQuery:
        """The CV as a matching profile. The one LLM call in a scan."""
        return self.query_interpreter.parse(cv_text)

    def match(self, query: ParsedQuery, location_preferences: dict | None = None):
        """
        Search, rank and summarise the market for a parsed profile. No LLM call,
        so a profile kept from an earlier scan (latest_cvs) reruns from here.
        """
        started_at = datetime.now(timezone.utc)
        run_log = []
        search_query = SearchQuery.from_parsed(query)

        # Saved preferences, else the CV's own location, else the deployment
        # default. Whichever wins also decides where the local leg searches.
        prefs = loc.LocationPreferences.resolve(loc.resolve(search_query), saved=location_preferences)
        if prefs.source != "resolved" and prefs.country_code:
            search_query = dataclasses.replace(
                search_query, location=None, country_code=prefs.country_code, city=prefs.city,
            )
        with stage("search"):
            outcome = self.search_engine.get_jobs(search_query, run_log=run_log)
        raw_jobs = outcome.jobs

        # The profiled shared pool rows already exist in jobs/job_profiles. Re-upserting
        # thousands of unchanged rows on every CV scan adds write load and repeats
        # payload hashing without creating new market observations.
        search_id = self.ingestion.record_search(
            query, run_log, len(raw_jobs), started_at, outcome.coverage
        )
        job_ids = persist_search_jobs(self.ingestion, search_id, raw_jobs)

        # The provider payload has been persisted and nothing downstream reads
        # it. Dropping it here keeps it out of the response serialiser.
        for job in raw_jobs:
            job.raw = None
            identity, _, _ = resolve_identity(job)
            job.db_id = job_ids.get(identity)

        # After persistence, so the full result set still reaches the dataset —
        # a posting outside this user's market is still a real observation of
        # the market. Before extraction, so the ones we discard cost nothing.
        raw_jobs, off_market = self.sentence_embedder.filter_by_role(
            query, raw_jobs, min_keep=MIN_JOBS_FLOOR
        )
        if off_market:
            print(
                f"Excluded {len(off_market)} postings outside the role, "
                f"lowest: {', '.join(repr(j.title) for j, _ in off_market[:3])}"
            )
        outcome.coverage["off_market_removed"] = len(off_market)
        outcome.coverage["jobs_analyzed"] = len(raw_jobs)

        # Each posting is read once, by the one vocabulary (src/matching/skills.txt):
        # persist_jobs has just profiled whatever was new, and those stored
        # profiles give the fit score and the market skills alike.
        stored_ids = [job.db_id for job in raw_jobs if job.db_id]
        profiles = self.ingestion.stored_profiles(stored_ids)
        jobs, readable = parse_retrieved_jobs(raw_jobs, profiles)

        with stage("scoring", job_count=len(jobs)):
            ranked_jobs = self.score_jobs(query, jobs, prefs, profiles)
        outcome.coverage["location_preferences"] = prefs.to_dict()

        market_intelligence = self.market_analyzer.analyze(
            cv_skill_names(query.skills),
            readable
        )

        # What was actually searched travels with the numbers. A six-job
        # analysis and a forty-job one look identical otherwise, and the
        # frequencies in `market` mean very different things in each.
        return {
            "market": market_intelligence,
            "ranked_jobs": ranked_jobs,
            "search": outcome.coverage,
        }

    @staticmethod
    def score_jobs(query, processed_jobs, location_prefs, profiles=None):
        """
        Each job's fit for this CV, best first: the one JobRadar match score
        (src/matching), the same one the opportunities list and pasted links
        use, so every score is comparable. `processed_jobs` are ProcessedJob;
        `profiles` the stored ones by db_id, so a job scores exactly as it does
        in Opportunities. Only a job that could not be stored is read here.

        The four sub-scores the dashboard has always drawn keep their names and
        now carry the matcher's dimensions; `match` has the full explanation.
        """
        candidate = Candidate.from_cv(query.model_dump(), location_prefs)
        profiles = profiles or {}
        results = []
        for processed in processed_jobs:
            job = processed.job
            result = match(candidate, profiles.get(job.db_id) or profile_job(job), job)
            fit = result.dimensions
            results.append({
                "job": processed,
                "overall_score": result.score / 100,
                "title_score": fit["role"],
                "skills_score": fit["required"] if fit["required"] is not None else 0.5,
                "experience_score": fit["experience"],
                "location_score": fit["location"],
                "location_tier": result.facts["location_tier"],
                "match": result.to_dict(),
            })
        # A job behind a gate — ineligible, too senior — never outranks one the
        # user can actually get, however much of the text overlaps.
        results.sort(key=lambda r: (TIER_ORDER[r["match"]["tier"]], -r["match"]["score"]))
        return results


job_radar_agent = JobRadarAgent()
