import os
import time
from datetime import datetime
from types import SimpleNamespace

from src.database.fingerprint import payload_hash, resolve_identity
from src.database.models.job import JobIdentity, JobRecord, ObservationRecord
from src.database.repositories import (
    job_repository,
    observation_repository,
    profile_repository,
    search_repository,
    skill_repository,
)
from src.database.session import connection, is_configured
from src.matching.requirements import PROFILER_VERSION, JobProfile, content_hash, profile_job

# Bump when SkillExtractor's output changes. Old rows are kept, so the two
# generations stay comparable over identical descriptions.
EXTRACTOR_VERSION = os.getenv("JOBRADAR_EXTRACTOR_VERSION", "skillner-emsi-v1")

# An unreachable database costs the pool timeout on every call. Without this,
# one analysis pays it three times over.
FAILURE_COOLDOWN_SECONDS = 60


def _parse_timestamp(value: str | None) -> datetime | None:
    """Absolute publication time, or None. A relative string is not a timestamp."""
    if not value:
        return None
    try:
        return datetime.fromisoformat(value.strip().replace("Z", "+00:00"))
    except ValueError:
        return None


def _to_record(job, identity: JobIdentity, identity_source: str, fingerprint: str) -> JobRecord:
    raw = job.raw or {}
    return JobRecord(
        provider=identity.provider,
        external_id=identity.external_id,
        identity_source=identity_source,
        fingerprint=fingerprint,
        payload_hash=payload_hash(raw),
        raw_payload=raw,
        title=job.title,
        company=job.company,
        description=job.description,
        location=job.location,
        remote=job.remote,
        employment_type=job.employment_type,
        experience_level=job.experience_level,
        salary_min=job.salary_min,
        salary_max=job.salary_max,
        salary_currency=job.salary_currency,
        salary_period=job.salary_period,
        url=job.url,
        remote_eligibility=job.remote_eligibility,
        posted_at=_parse_timestamp(job.posted_at_utc),
        posted_at_raw=job.posted_at,
    )


def _profile_row(row: dict) -> tuple:
    profile = profile_job(SimpleNamespace(**row))
    digest = content_hash(row["title"], row["description"], row["experience_level"], row["employment_type"])
    return row["id"], PROFILER_VERSION, digest, profile.family, profile.seniority, profile.to_dict()


class JobIngestionService:
    """
    The only persistence entry point the pipeline touches.

    Every method is fail-soft. A cold or unreachable database degrades JobRadar
    to its previous behaviour — an analysis that is computed and returned but
    not recorded — rather than failing the request.
    """

    def __init__(self, extractor_version: str = EXTRACTOR_VERSION):
        self.extractor_version = extractor_version
        self.enabled = is_configured()
        self._retry_after = 0.0
        if not self.enabled:
            print("DATABASE_URL is not set, job persistence is disabled")

    def _available(self) -> bool:
        return self.enabled and time.monotonic() >= self._retry_after

    def _record_failure(self, action: str, err: Exception) -> None:
        self._retry_after = time.monotonic() + FAILURE_COOLDOWN_SECONDS
        print(
            f"Persistence: could not {action}: {err} "
            f"(pausing writes for {FAILURE_COOLDOWN_SECONDS}s)"
        )

    def record_search(
        self,
        query,
        run_log: list[dict],
        jobs_returned: int,
        started_at: datetime,
        coverage: dict | None = None,
    ) -> int | None:
        if not self._available():
            return None

        try:
            with connection() as conn:
                search_id = search_repository.create_search(
                    conn, query, started_at, jobs_returned, coverage
                )
                search_repository.record_provider_runs(conn, search_id, run_log)
            return search_id
        except Exception as err:
            self._record_failure("record search", err)
            return None

    def persist_jobs(self, search_id: int | None, jobs: list, observe: bool = True,
                     profile: bool = True) -> dict[JobIdentity, int]:
        """
        `observe=False` is for the daily pool refresh: it re-sights thousands of
        unchanged postings every day, and one observation row per posting per
        day would outgrow the rest of the database. `last_seen_at` on the job
        already records that it is still live.

        `profile=False` leaves requirement profiles to a later refresh_profiles()
        call — the daily run profiles everything stale in one pass instead.
        """
        if not self._available() or not jobs:
            return {}

        try:
            records: list[JobRecord] = []
            ranks: dict[JobIdentity, int] = {}

            for rank, job in enumerate(jobs):
                identity, identity_source, fingerprint = resolve_identity(job)
                records.append(_to_record(job, identity, identity_source, fingerprint))
                ranks.setdefault(identity, rank)

            deduped, in_batch_duplicates = job_repository.dedupe(records)

            with connection() as conn:
                previous = job_repository.existing_payload_hashes(conn, deduped)
                upserted = job_repository.upsert_many(conn, deduped)

                job_ids = {
                    JobIdentity(row.provider, row.external_id): row.id
                    for row in upserted
                }

                observations = []
                for record in (deduped if observe else []):
                    identity = record.identity
                    job_id = job_ids.get(identity)
                    if job_id is None:
                        continue

                    seen_before = previous.get(identity)
                    changed = seen_before is not None and seen_before != record.payload_hash

                    observations.append(ObservationRecord(
                        job_id=job_id,
                        search_id=search_id,
                        provider=identity.provider,
                        result_rank=ranks.get(identity),
                        payload_hash=record.payload_hash,
                        payload_changed=changed,
                        # Already on jobs.raw_payload unless it drifted, in which
                        # case this is the only copy of the previous shape.
                        raw_payload=record.raw_payload if changed else None,
                    ))

                observation_repository.record_observations(conn, observations)

            new = sum(1 for row in upserted if row.inserted)
            print(
                f"Persisted {len(upserted)} jobs "
                f"({new} new, {len(upserted) - new} already known, "
                f"{in_batch_duplicates} duplicates within the batch)"
            )
        except Exception as err:
            self._record_failure("store jobs", err)
            return {}

        if profile:
            self.refresh_profiles(list(job_ids.values()))
        return job_ids

    def refresh_profiles(self, ids: list[int] | None = None) -> int:
        """
        Profile every job whose requirements profile is missing or stale — new,
        edited since, or read by older rules — or only those among `ids`.

        Unchanged postings are skipped by comparing a hash in SQL, so the daily
        run pays for what arrived, not for the whole pool. Returns how many were
        profiled; fail-soft like everything here.
        """
        if not self._available() or ids == []:
            return 0
        done, after = 0, 0
        try:
            while True:
                with connection() as conn:
                    rows = profile_repository.stale(conn, PROFILER_VERSION, ids, after)
                    if not rows:
                        return done
                    profile_repository.upsert(conn, [_profile_row(row) for row in rows])
                done += len(rows)
                after = rows[-1]["id"]
        except Exception as err:
            self._record_failure("profile jobs", err)
            return done

    def stored_skills(self, job_ids: list[int]) -> dict[int, list[str]]:
        """Skills an earlier run already extracted and that still hold, by job id."""
        if not self._available() or not job_ids:
            return {}
        try:
            with connection() as conn:
                return skill_repository.stored_skills(conn, job_ids, self.extractor_version)
        except Exception as err:
            self._record_failure("read stored skills", err)
            return {}

    def stored_profiles(self, job_ids: list[int]) -> dict[int, JobProfile]:
        """Requirement profiles that still describe their posting, by job id."""
        if not self._available() or not job_ids:
            return {}
        try:
            with connection() as conn:
                profiles = profile_repository.fresh(conn, PROFILER_VERSION, job_ids)
            return {job_id: JobProfile.from_dict(profile) for job_id, profile in profiles.items()}
        except Exception as err:
            self._record_failure("read stored profiles", err)
            return {}

    def persist_skills(
        self,
        job_ids: dict[JobIdentity, int],
        processed_jobs: list,
    ) -> None:
        if not self._available() or not job_ids or not processed_jobs:
            return

        try:
            per_job: dict[int, set[str]] = {}
            for processed in processed_jobs:
                identity, _, _ = resolve_identity(processed.job)
                job_id = job_ids.get(identity)
                if job_id is None:
                    continue
                per_job.setdefault(job_id, set()).update(
                    skill for skill in processed.skills if skill and skill.strip()
                )

            if not per_job:
                return

            all_names = {name for names in per_job.values() for name in names}

            with connection() as conn:
                skill_ids = skill_repository.get_or_create_skills(conn, all_names)

                job_skill_ids = {
                    job_id: {
                        skill_ids[key]
                        for key in (skill_repository.normalize_name(n) for n in names)
                        if key in skill_ids
                    }
                    for job_id, names in per_job.items()
                }

                written = skill_repository.replace_job_skills(
                    conn, job_skill_ids, self.extractor_version
                )

            print(
                f"Persisted {written} job-skill links across {len(job_skill_ids)} jobs "
                f"({len(skill_ids)} distinct skills, {self.extractor_version})"
            )

        except Exception as err:
            self._record_failure("store skills", err)
