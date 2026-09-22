from types import SimpleNamespace

from src.database.repositories import job_repository
from src.database.services.ingestion import JobIngestionService
from src.database.session import connection
from src.jobpool.extract import extract
from src.matching.matcher import match
from src.matching.requirements import profile_job
from src.matching.skills import display

REVIEW_SKILLS = 12


class JobUrlService:
    def __init__(self):
        self.ingestion = JobIngestionService()

    def _pool_lookup(self, url):
        try:
            with connection() as conn:
                return job_repository.find_by_url(conn, url)
        except Exception as err:
            print(f"pool lookup failed, fetching instead: {err}")
            return None

    def extract(self, url: str, candidate=None) -> dict:
        """
        A pasted link read into review fields, its skills, and — when the user
        has a CV — the same match and reasons Opportunities would show for it.
        """
        result = extract(url, pool_lookup=self._pool_lookup)
        job = result.pop("_job")
        fields = result["fields"]
        posting = job or SimpleNamespace(
            title=fields["title"], description=fields["description"], location=fields["location"],
            remote=fields["workplace"] == "remote" or None, remote_eligibility=None,
            experience_level=fields["experience_level"], employment_type=fields["employment_type"],
        )
        profile = profile_job(posting)
        result["skills"] = [display(s) for s in (*profile.required, *profile.preferred, *profile.mentioned)][:REVIEW_SKILLS]
        result["match"] = match(candidate, profile, posting).to_dict() if candidate else None

        # A structured posting joins the shared pool, so an application made
        # from it links to a real job the analyzer can read later.
        result["job_id"] = job.db_id if job else None
        if job and result["job_id"] is None:
            stored = self.ingestion.persist_jobs(None, [job], observe=False)
            result["job_id"] = next(iter(stored.values()), None)
        return result


job_url_service = JobUrlService()
