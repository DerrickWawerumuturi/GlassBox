from src.Agent.utils.types import Job, ProcessedJob
from src.matching.requirements import JobProfile, profile_job
from src.matching.skills import display, resolve_all


def skill_names(profile: JobProfile) -> list[str]:
    """Every skill a posting names, display spelling, each once: required, preferred, mentioned, then the title's."""
    keys = dict.fromkeys((*profile.required, *profile.preferred, *profile.mentioned, *profile.core))
    return [display(key) for key in keys]


def cv_skill_names(names: list[str] | None) -> set[str]:
    """
    A CV's skills in the same display spelling as skill_names, so "React" on the
    CV and "React.js" in a posting are one skill. Names the vocabulary does not
    know are kept as written: still the user's, just never matched.
    """
    known, unknown = resolve_all(names)
    return {display(key) for key in known} | set(unknown)


def parse_retrieved_jobs(raw_jobs: list[Job], profiles: dict[int, JobProfile] | None = None,
                         ) -> tuple[list[ProcessedJob], list[ProcessedJob]]:
    """
    (every posting with text, the readable ones) with skills from the one vocabulary.

    A scan's skills are its postings' requirement profiles: the same read the
    fit score, Opportunities and the market snapshot use, so the Market tab and
    the rest of the app agree on what a skill is (decisions/skill-vocabulary.md).
    `profiles` are the stored ones by db_id; anything else is read here in
    milliseconds. SkillNer no longer runs.

    Only readable postings feed the market statistics. A thin posting (a short
    summary) names few skills, so counting it would deflate every frequency; it
    is still ranked. When a scan returned nothing readable, every posting is
    used rather than showing an empty market.
    """
    profiles = profiles or {}
    processed, readable = [], []
    for job in raw_jobs:
        if not job.description:
            continue
        profile = profiles.get(job.db_id) or profile_job(job)
        item = ProcessedJob(job=job, skills=skill_names(profile))
        processed.append(item)
        if not profile.thin:
            readable.append(item)
    return processed, readable or processed
