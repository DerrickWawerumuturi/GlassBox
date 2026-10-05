# 2026-10-01 — the pool now remembers what it asked for

Nothing could say what the job market asked for on a past day. Profiles are
overwritten when a posting changes, jobs will eventually be deleted, and the
daily run stores no sightings (`observe=False`, on purpose: one row per posting
per day is ~6M rows a year). Monthly posts and public role pages need "since
last month", so every day lost was lost for good.

---

### A daily market snapshot

**Files:** `backend/src/jobpool/snapshot.py` (new), `backend/src/database/repositories/snapshot_repository.py`
(new), `backend/src/database/migrations/015_market_snapshots.sql` (new), `backend/src/jobpool/daily.py`

After profiling, the daily run counts the live pool into `market_snapshots`:
one row per role family per day.

- **Roles, not listings.** A role cross-posted on several boards or cities counts
  once, with the Opportunities page's `duplicate_key`.
- **Readable postings are the denominator.** Postings under 800 characters
  (`thin`) count as roles but not toward skills. A summary that short says
  nothing about what is required.
- **Skills by kind:** `{skill: [required, preferred, mentioned]}`, plus the
  seniority mix.
- **The daily fetch only:** the same live pool as Opportunities
  (`profile_repository.POOL`), minus what users brought in. Scan results
  (JSearch, Jooble, The Muse) and pasted links are someone's private search,
  some of them under terms that keep the data private, and would make the counts
  depend on who used the app that day.
- **Re-running replaces the day.** The profiler version is part of the key, so a
  rules change starts a new series instead of mixing counts.
- **It never turns a good refresh red.** A failure is logged.
  `python -m src.jobpool.snapshot` takes it again.

About 20 rows a day, a few KB each, and no job ids, so the record survives any
later deletion of jobs. Why summaries and not sightings:
`decisions/market-snapshots.md`.

### Docs

- `architecture/backend.md`: `snapshot.py` in the layout, the snapshot step in
  "Daily pool and matching", `market_snapshots` beside the job tables.
- `decisions/job-retention.md`: step 3 of "before a cleanup job is written" now
  points at the snapshots, which already keep skill demand over time.

### Tests

- `tests/test_snapshot.py` (new, offline):
  - a role listed twice counts once;
  - only the daily fetch is counted, not users' scans or pasted links;
  - skills are counted by kind;
  - thin postings count as roles but not toward skills;
  - every family the profiler can assign is counted;
  - the daily run snapshots after profiling;
  - a failed snapshot does not fail the refresh.
- `tests/test_api_pool_and_import.py` (with the module's made-up providers standing in for daily boards): one row per family per day, re-running
  replaces it, a cross-post adds nothing, a new readable role adds one posting and
  one "react" requirement. It uses relative checks, because other modules may
  leave live jobs. `test_daily_pool.py` now stubs the snapshot, so it never writes.

Each guard was checked by switching its part off: removing the hook, the
source filter, the dedupe, the thin rule, the upsert's replace, or the `except` each failed the
matching test.

Backend: 278 passed against a local Postgres (`postgres:16-alpine` in Docker,
migrations 001–015 applied), and 253 passed + 2 skipped with `DATABASE_URL=""`.

`test_api_pool_and_import.py` grew from 386 to 438 lines, into the 400–500
"investigate" band. The snapshot test needs that module's `pool` fixture,
`posting()` helper and local-only guard. A separate module would duplicate all
three, so it stays here. Split the module by feature (pool, scans, import) if it
grows again.

### Deploying

Apply migration 015 (`python -m src.database.migrate`). The next 05:00 UTC run
takes the first snapshot. To start the record today:
`python -m src.jobpool.snapshot`.
