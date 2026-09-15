import time

from src.database.repositories import job_repository
from src.database.services.ingestion import JobIngestionService
from src.database.session import connection
from src.jobpool.extract import extract
from src.jobpool.posting import match_skills

SKILL_NAMES = "select name from skills"
VOCABULARY_TTL_SECONDS = 3600


class JobUrlService:
    def __init__(self):
        self.ingestion = JobIngestionService()
        self._vocabulary: list[str] = []
        self._vocabulary_at = 0.0

    def _pool_lookup(self, url):
        try:
            with connection() as conn:
                return job_repository.find_by_url(conn, url)
        except Exception as err:
            print(f"pool lookup failed, fetching instead: {err}")
            return None

    def _skills_vocabulary(self) -> list[str]:
        if time.monotonic() - self._vocabulary_at > VOCABULARY_TTL_SECONDS:
            try:
                with connection() as conn, conn.cursor() as cur:
                    cur.execute(SKILL_NAMES)
                    self._vocabulary = [row["name"] for row in cur.fetchall()]
                self._vocabulary_at = time.monotonic()
            except Exception as err:
                print(f"skill vocabulary unavailable: {err}")
        return self._vocabulary

    def extract(self, url: str) -> dict:
        result = extract(url, pool_lookup=self._pool_lookup)
        job = result.pop("_job")
        fields = result["fields"]
        result["skills"] = match_skills(f"{fields['title'] or ''}\n{fields['description'] or ''}",
                                        self._skills_vocabulary())

        # A structured posting joins the shared pool, so an application made
        # from it links to a real job the analyzer can read later.
        result["job_id"] = job.db_id if job else None
        if job and result["job_id"] is None:
            stored = self.ingestion.persist_jobs(None, [job], observe=False)
            result["job_id"] = next(iter(stored.values()), None)
        return result


job_url_service = JobUrlService()
