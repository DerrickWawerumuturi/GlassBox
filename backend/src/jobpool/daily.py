"""
Refresh the job pool: fetch every source, keep recent postings, store them.

    python -m src.jobpool.daily            fetch and store
    python -m src.jobpool.daily --dry-run  fetch and report, store nothing

Runs on a schedule (.github/workflows/job-pool.yml), never on a page load.
Exits non-zero when most sources failed or nothing could be stored, so a
broken run shows up red instead of quietly leaving the pool stale.
"""
import sys
import time
from datetime import datetime, timedelta, timezone

from src.database.services.ingestion import JobIngestionService
from src.jobpool.sources import fetch_all

# 30 days (the first cut) threw away live requisitions: 10 of 29 open Kenya
# roles and 91 of 164 Africa roles on the boards measured 2026-09-15 were
# 31-90 days old. Beyond 90 days postings are mostly evergreen. Stale rows are
# handled by retention (docs/decisions/job-retention.md), not by not storing.
MAX_AGE_DAYS = 90
MIN_HEALTHY_SOURCES = 0.5


def is_recent(job, now: datetime) -> bool:
    if not job.posted_at_utc:
        return False
    posted = datetime.fromisoformat(job.posted_at_utc)
    if posted.tzinfo is None:
        posted = posted.replace(tzinfo=timezone.utc)
    return now - posted <= timedelta(days=MAX_AGE_DAYS)


def main(dry_run: bool = False) -> int:
    started = time.monotonic()
    jobs, report = fetch_all()
    healthy = sum(1 for _, _, err in report if err is None)
    now = datetime.now(timezone.utc)
    recent = [job for job in jobs if is_recent(job, now)]

    print(f"fetched {len(jobs):,} postings from {healthy}/{len(report)} sources "
          f"in {time.monotonic() - started:.0f}s; {len(recent):,} from the last {MAX_AGE_DAYS} days")
    dead = [f"{name} ({err})" for name, _, err in report if err]
    if dead:
        print(f"failed sources: {', '.join(dead)}")

    if healthy < len(report) * MIN_HEALTHY_SOURCES:
        print("most sources failed; not treating this run as a pool refresh")
        return 1
    if dry_run:
        return 0

    ingestion = JobIngestionService()
    stored = ingestion.persist_jobs(None, recent, observe=False)
    if recent and not stored:
        print("nothing was stored; see the persistence error above")
        return 1
    return 0


if __name__ == "__main__":
    sys.exit(main(dry_run="--dry-run" in sys.argv))
