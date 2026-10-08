# Decision: collect every 6 hours, publish the market once a week

**Status:** built 2026-10-08, founder approved (design: `docs/local/market-publication-design.html`).
**Files:** `backend/src/jobpool/publish.py`, `market_look.py`, `daily.py`, `sources.py`,
`backend/src/database/repositories/{source,publication}_repository.py`,
`backend/src/database/backfill_job_source.py`, migrations `018_job_sources.sql`,
`019_market_publications.sql`, `.github/workflows/{job-pool,deploy}.yml`,
`frontend/src/lib/landing/look-server.ts`, `frontend/src/lib/market-pages.ts`.

## Why

Collecting jobs was mostly healthy; publishing the market was fragile. The API
counted the live pool on demand, in a process that scales to zero, and the site
saved whatever it got: a 4 s fetch at `next build` against a sleeping API
prerendered an empty `/market`, an empty pool (3 days without a refresh, or a
profiler version skew) passed as a valid count with 0 jobs, and the date shown
was when the API built the count, not when the jobs were read. Two collection
runs died on a missing package (the workflow installed its own list), two on a
cold database (no retry), and the 05:00 cron started 4 to 7 hours late every day.

## The design

1. **Collect** every 6 hours (`job-pool.yml`, `17 */6 * * *`), inside the image
   the API runs (`jobradar:live`). Each source is saved in its own transaction
   with its fetch in `source_runs`. Jobs close on evidence (`job-sources.md`,
   "Closing jobs"). One retry on the first database connection (`session.wake`).
2. **Check** once a week: after every run, `publish.run()` asks whether this
   ISO week (Monday 00:00 UTC) has a publication. If not, it builds a candidate
   from the pool just refreshed and checks the gates.
3. **Publish** if every gate passes: the `/market/look` body and every
   `/market/page/*` body go into `market_publications`. If one fails, a
   `rejected` row stores the reasons, last week's market stays up, a warning
   annotation shows on the run, and the next run (6 hours later) tries again.

### The gates (`publish.GATES`)

| Gate | Passes when |
|---|---|
| fresh | a collection run in the last 24 hours where at least half the sources answered |
| profiles | no job is waiting to be read under the current `PROFILER_VERSION` |
| coverage | sources that answered in the last 24 hours carried at least 90% of the jobs all sources carried a week ago (each source's latest good count 1 to 8 days back); passes with no history |
| jobs | at least 5,000 counted jobs, every job type |
| pages | every page that was publishable in the last publication has at least 100 readable jobs |
| swing | total counted jobs within -25% and +60% of the last publication, unless the founder accepts it |

17,467 counted jobs on 2026-10-08, every page at 274 readable or more; adding
80 boards moved the total +54% in a day, which is why the upper bound is 60%.

### Serving

`market_look.refresh()` loads the latest published row at startup and checks
for a newer id every 10 minutes (one indexed row; the payload is read only when
the id changes). A request only reads what is loaded. Once a publication has
been served the API never counts the pool again; a failed read keeps the last
one. **Before the first publication exists** the API counts the live pool as it
did before (dated by the latest sighting), so the deploy can't empty `/market`.
503 "The count is loading" is left only for the seconds a fresh process takes
to read the row.

Every body carries `taken_at` (the publication's `as_of`: when the jobs were
collected) and `week` (its Monday). Pages say "Counted in the week of 5 October
2026 · Updated every Monday"; the home page "4,768 tech jobs counted this week".
The CV scan and Opportunities still read the live pool and keep "today's jobs".

### The frontend

- A body with 0 jobs (a page) or no jobs in any job type (the look) is no count:
  refused on the server render and in the browser, never drawn.
- At `next build` the fetch waits up to 90 s (`BUILD_WAIT_MS`, retries every
  5 s, each attempt up to 30 s so a replica can wake). If the API still hasn't
  answered, the build fails and Vercel keeps the previous deployment. Checked
  locally: with the API down the build failed after 3 min ("didn't answer in
  90 s; failing the build"). A body the API did send but that has no jobs isn't
  waited for.
- In a running server a failed revalidation still throws, so Next keeps the
  last good page (`market-look.md`).

### Workflows

`deploy.yml` tags the image `:live` only after the container app runs it, and
its job shares the concurrency group `pool-and-deploy` with `job-pool.yml`
(queued, never cancelled), so a collector on the old image can't undo the
deploy's re-profile. `job-pool.yml` logs in with `AZURE_CREDENTIALS`, pulls
`:live` and runs `python -m src.jobpool.daily` with only `DATABASE_URL` passed
(by name; its parts masked as before). No package list to drift.

### Daily snapshots

`market_snapshots` stays the internal daily history (`market-snapshots.md`),
unchanged. Public week on week comparisons should come from publications.

## Founder runbook

**Before the push**, on production, from `backend/` (in this order):

1. `python -m src.database.migrate` — applies 018 (jobs.source, closed_at, missed_fetches, source_runs) and 019 (market_publications). Additive; the running API ignores them.
2. `python -m src.database.backfill_job_source --dry-run` — expect about 19,250 of about 19,360 live rows placed (measured read only on 2026-10-08).
3. `python -m src.database.backfill_job_source` — sets them, in one transaction. Rows it can't place keep the old 3 day rule until the collector next sees them.

**After the deploy** (the deploy run must be green, so `jobradar:live` exists):

4. Run the collector once: GitHub, Actions, "refresh job pool", Run workflow (or `gh workflow run job-pool.yml`). This week has no publication, so that run publishes the first one if its gates pass.
5. If its summary shows "Market held back", read the reason with `python -m src.jobpool.publish --status`. To publish anyway once the cause is fixed: `python -m src.jobpool.publish --now`. A flagged swing only: `python -m src.jobpool.publish --accept 2026-10-05` (this week's Monday, or `2026-W41`).

**How to check it worked:**

- `python -m src.jobpool.publish --status` lists the row: `published`, week of 2026-10-05, about 17,000 to 20,000 jobs, as of the run's time.
- `curl -s https://jobradar-backend.agreeabledune-79b95957.southafricanorth.azurecontainerapps.io/market/look | python3 -c "import json,sys; d=json.load(sys.stdin); print(d['week'], d['taken_at'])"` prints `2026-10-05` and the run's time (within 10 minutes of publishing; the API checks every 10).
- seeglassbox.com/market says "Counted in the week of 5 October 2026 · Updated every Monday" after the next revalidation (5 minutes).
- Collector health: `select source, ok, jobs, whole, closed, retired, error from source_runs where run_at = (select max(run_at) from source_runs) order by ok, jobs desc;`

## Not done (parked in the design)

ATS webhooks, Google's Indexing API, deleting old jobs, email alerts, keeping the
API awake, an Azure scheduled job instead of GitHub Actions. A profiler version
change mid week doesn't trigger a new publication: the published skill keys can
differ from a fresh CV scan's until the next Monday.
