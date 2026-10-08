"""
Collect the job pool: fetch every source, save each one on its own, read what
each new or changed job asks for, then count and (weekly) publish the market.

    python -m src.jobpool.daily                 fetch, store, profile, snapshot, publish if due
    python -m src.jobpool.daily --dry-run       fetch and report, store nothing
    python -m src.jobpool.daily --profile-only  profile what is stale, fetch nothing:
                                                the backfill after migration 014, or
                                                after PROFILER_VERSION is bumped

Runs every 6 hours (.github/workflows/job-pool.yml) inside the image the API
runs, never on a page load. Matching is not done here: profiles are per job,
matches are per user and computed on request (opportunities.py).

Each source is saved in its own transaction (ingestion.persist_source): its
jobs, its fetch in source_runs, and the closing rule for complete boards. One
source failing, or failing to save, never touches another's jobs. A source
failing every fetch for 7 days is reported as retired and its jobs closed.
Exits non-zero when most sources failed or nothing could be saved, so a broken
run shows up red instead of quietly leaving the pool stale.

Profiling is incremental. Only postings whose text changed, or that were read
by older rules (PROFILER_VERSION), are profiled again; the first run after a
rules change backfills the whole pool.

Last, the profiled pool is counted into the day's market snapshot (snapshot.py),
the internal record later comparisons are made from, and the weekly market
publication is made if it is due (publish.py). Neither failure turns the run
red; both show as warnings on the run's summary page.
"""
import sys
import time
from datetime import datetime, timedelta, timezone

from src.database.repositories import source_repository
from src.database.services.ingestion import JobIngestionService
from src.database.session import connection, wake
from src.jobpool import publish, snapshot
from src.jobpool.sources import MIN_HEALTHY_SOURCES, POOL_WINDOWS, Partial, closes_by_absence, fetch_all

# 30 days (the first cut) threw away live requisitions: 10 of 29 open Kenya
# roles and 91 of 164 Africa roles on the boards measured 2026-09-15 were
# 31-90 days old. Beyond 90 days postings are mostly evergreen. Stale rows are
# handled by retention (docs/decisions/job-retention.md), not by not storing.
MAX_AGE_DAYS = POOL_WINDOWS["age"]


def is_recent(job, now: datetime) -> bool:
    if not job.posted_at_utc:
        return False
    posted = datetime.fromisoformat(job.posted_at_utc)
    if posted.tzinfo is None:
        posted = posted.replace(tzinfo=timezone.utc)
    return now - posted <= timedelta(days=MAX_AGE_DAYS)


def profile_only() -> int:
    started = time.monotonic()
    profiled = JobIngestionService().refresh_profiles()
    print(f"profiled {profiled:,} postings in {time.monotonic() - started:.0f}s")
    return 0


def main(dry_run: bool = False) -> int:
    started, run_at = time.monotonic(), datetime.now(timezone.utc)
    results = fetch_all()
    healthy = sum(1 for _, _, err in results if err is None)
    recent = {source: [job for job in jobs or () if is_recent(job, run_at)] for source, jobs, _ in results}

    print(f"fetched {sum(len(jobs or ()) for _, jobs, _ in results):,} postings from {healthy}/{len(results)} sources "
          f"in {time.monotonic() - started:.0f}s; {sum(map(len, recent.values())):,} from the last {MAX_AGE_DAYS} days")
    dead = [f"{source} ({err})" for source, _, err in results if err]
    if dead:
        print(f"failed sources: {', '.join(dead)}")

    if healthy < len(results) * MIN_HEALTHY_SOURCES:
        print("most sources failed; not treating this run as a pool refresh")
        return 1
    if dry_run:
        return 0

    ingestion = JobIngestionService()
    if not ingestion.enabled:
        return 1
    try:
        wake()
    except Exception as err:
        print(f"::error title=Database unreachable::{_annotation(f'{type(err).__name__}: {err}')}")
        return 1
    if not save(ingestion, run_at, results, recent):
        print("nothing was saved; see the errors above")
        return 1
    retire(run_at)
    started = time.monotonic()
    profiled = ingestion.refresh_profiles()
    print(f"profiled {profiled:,} new or changed postings in {time.monotonic() - started:.0f}s")
    take_snapshot()
    publish_if_due()
    return 0


def save(ingestion, run_at: datetime, results: list, recent: dict) -> int:
    """Each source in its own transaction. Returns how many saved; a failed save is recorded as a failed fetch."""
    saved, stored, closed, failed = 0, 0, 0, []
    for source, jobs, err in results:
        # A Partial read stopped early: what it holds is stored, but its absences say nothing.
        closes = closes_by_absence(source) and not isinstance(jobs, Partial)
        try:
            out = ingestion.persist_source(run_at, source, jobs, recent[source], err, closes)
        except Exception as error:
            failed.append(f"{source} ({type(error).__name__})")
            try:
                ingestion.persist_source(run_at, source, None, [], f"save: {type(error).__name__}")
            except Exception:
                pass
            continue
        saved += out["ok"]
        stored += out["stored"]
        closed += out["closed"]
    print(f"saved {saved} sources: {stored:,} jobs stored, {closed:,} closed (missing from 2 full fetches)")
    if failed:
        print(f"::warning title=Sources not saved::{_annotation(', '.join(failed))}")
    return saved


def retire(run_at: datetime) -> None:
    """Report every source that has failed for 7 days; the first time, close its jobs (decisions/job-sources.md)."""
    try:
        with connection() as conn:
            for row in source_repository.retiring(conn, run_at):
                closed = 0 if row["marked"] else source_repository.retire(conn, run_at, row["source"])
                print(f"::warning title=Source retired::{row['source']} has failed every fetch since "
                      f"{row['since']:%Y-%m-%d}. {closed:,} jobs closed now. Remove it from companies.txt.")
    except Exception as err:
        print(f"::warning title=Retired sources not checked::{_annotation(f'{type(err).__name__}: {err}')}")


def publish_if_due() -> None:
    # Weekly, from the pool just refreshed (publish.py). A rejection keeps last
    # week's market up and is tried again next run; it must be seen, not fatal.
    try:
        result = publish.run()
    except Exception as err:
        print(f"::warning title=Market not published::{_annotation(f'{type(err).__name__}: {err}')}")
        return
    if result is None:
        return
    if result["status"] == "published":
        print(f"published the market for the week of {result['week']:%Y-%m-%d}: {result['jobs']:,} jobs")
    else:
        print(f"::warning title=Market held back::{_annotation(publish.held_back(result))}")


def take_snapshot() -> None:
    # After profiling, so the counts describe today's pool. A failure here must
    # not turn a good refresh red: the pool is fine, only today's record is
    # missing, and `python -m src.jobpool.snapshot` can take it later that day.
    # But it must be seen: a plain log line went unread while 2 to 5 October
    # wrote no snapshot at all. A GitHub Actions warning annotation shows on
    # the run's summary page and keeps the run green.
    try:
        written = snapshot.take()
        if written is not None:
            print(f"snapshot: {written} families")
    except Exception as err:
        print(f"::warning title=Market snapshot not taken::{_annotation(f'{type(err).__name__}: {err}')}")


def _annotation(text: str) -> str:
    """A workflow command's message, escaped as GitHub requires: one line."""
    return text.replace("%", "%25").replace("\r", "%0D").replace("\n", "%0A")


if __name__ == "__main__":
    sys.exit(profile_only() if "--profile-only" in sys.argv else main(dry_run="--dry-run" in sys.argv))
