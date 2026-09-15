from src.Agent.utils.extraction_pool import extraction_pool
from src.Agent.utils.types import Job, ProcessedJob


def parse_retrieved_jobs(raw_jobs: list[Job]) -> list[ProcessedJob]:
    """
    Extract skills for every posting, in parallel.

    Postings whose extraction fails are dropped rather than kept with an empty
    skill list. Keeping them counted a job in jobs_analyzed that contributed no
    skills, which deflated every frequency in the market analysis.
    """
    try:
        with_description = [job for job in raw_jobs if job.description]
        extracted = extraction_pool.extract_many(
            [job.description for job in with_description]
        )

        cleaned_jobs = []
        failed = 0

        for job, skills in zip(with_description, extracted):
            if skills is None:
                failed += 1
                continue
            cleaned_jobs.append(ProcessedJob(job=job, skills=skills))

        if failed:
            print(f"Dropped {failed} of {len(with_description)} postings: skill extraction failed")

        return cleaned_jobs

    except Exception as err:
        raise ValueError(f"Error parsing the fetched jobs: {err}") from err
