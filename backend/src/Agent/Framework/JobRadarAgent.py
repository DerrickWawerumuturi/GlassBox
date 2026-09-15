import dataclasses
from datetime import datetime, timezone

from src.Agent.Framework.SimilarityEngine import SimilarityEngine, MarketAnalyzer
from src.Agent.utils.embedder import SentenceEmbedder
from src.Agent.utils.llm_client import GroqModel
from src.Agent.Framework.SearchEngine import SearchEngine, MIN_JOBS_FLOOR
from src.Agent.utils.skill_extractor import SkillExtractor
from src.Agent.utils.parser import parse_retrieved_jobs
from src.Agent.utils.types import SearchQuery
from src.Agent.utils import location as loc
from src.database.fingerprint import resolve_identity
from src.database.services.ingestion import JobIngestionService


class JobRadarAgent:
    def __init__(self):
        self.query_interpreter = GroqModel("user")
        self.search_engine = SearchEngine()
        self.skill_extractor = SkillExtractor()
        self.sentence_embedder = SentenceEmbedder()
        self.similarity_engine = SimilarityEngine()
        self.market_analyzer = MarketAnalyzer()
        self.ingestion = JobIngestionService()


    def run(self, user_input, location_preferences: dict | None = None):
        query = self.query_interpreter.parse(user_input)

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
        outcome = self.search_engine.get_jobs(search_query, run_log=run_log)
        raw_jobs = outcome.jobs

        # Raw postings are stored before parsing, so the ones parsing discards —
        # no description, or a SkillNer failure — still enter the dataset and
        # stay reprocessable.
        search_id = self.ingestion.record_search(
            query, run_log, len(raw_jobs), started_at, outcome.coverage
        )
        job_ids = self.ingestion.persist_jobs(search_id, raw_jobs)

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

        jobs = parse_retrieved_jobs(raw_jobs)

        self.ingestion.persist_skills(job_ids, jobs)

        ranked_jobs = self.score_jobs(query, jobs, prefs)
        outcome.coverage["location_preferences"] = prefs.to_dict()

        # The CV skills arrive as free text from the LLM ("react", "aws") while
        # job skills are canonical EMSI names ("React.js", "Amazon Web
        # Services"). Put both on the same vocabulary before comparing them,
        # otherwise coverage is understated and gaps are invented.
        user_skills = self.skill_extractor.normalize(query.skills)

        market_intelligence = self.market_analyzer.analyze(
            user_skills,
            jobs
        )

        # What was actually searched travels with the numbers. A six-job
        # analysis and a forty-job one look identical otherwise, and the
        # frequencies in `market` mean very different things in each.
        return {
            "market": market_intelligence,
            "ranked_jobs": ranked_jobs,
            "search": outcome.coverage,
        }


    def score_jobs(self, query, processed_jobs, location_prefs=None):
        """
        The one JobRadar match score. Pool jobs, live search results and (later)
        a job a user pasted all go through here, so they are comparable.
        `processed_jobs` are ProcessedJob (job + extracted skills).
        """
        user_embs, job_embs = self.sentence_embedder.get_embeddings(query, processed_jobs)
        return self.similarity_engine.calculate(user_embs, job_embs, processed_jobs, location_prefs)


job_radar_agent = JobRadarAgent()
