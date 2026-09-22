from src.Agent.utils.extraction_pool import extraction_pool
from src.Agent.utils.types import Job, ProcessedJob


def parse_retrieved_jobs(raw_jobs: list[Job], known: dict[int, list[str]] | None = None) -> list[ProcessedJob]:
    """
    Skills for every posting: `known` ones (by db_id) as stored by an earlier
    run, SkillNer in parallel for the rest. A scan mostly re-finds postings it
    has read before, and SkillNer costs seconds a posting.

    Postings whose extraction fails are dropped rather than kept with an empty
    skill list. Keeping them counted a job in jobs_analyzed that contributed no
    skills, which deflated every frequency in the market analysis.
    """
    known = known or {}
    try:
        with_description = [job for job in raw_jobs if job.description]
        unread = [job for job in with_description if job.db_id not in known]
        extracted = iter(extraction_pool.extract_many([job.description for job in unread]))

        cleaned_jobs = []
        failed = 0

        for job in with_description:
            skills = known[job.db_id] if job.db_id in known else next(extracted)
            if skills is None:
                failed += 1
                continue
            cleaned_jobs.append(ProcessedJob(job=job, skills=skills))

        if failed:
            print(f"Dropped {failed} of {len(unread)} postings: skill extraction failed")

        return cleaned_jobs

    except Exception as err:
        raise ValueError(f"Error parsing the fetched jobs: {err}") from err
