# 2026-10-08 — Collect every 6 hours, publish the market once a week

Decision: `docs/decisions/market-publication.md` (with the founder runbook).
Review page: `docs/local/market-publication.html`.

## Collection

- `job-pool.yml` runs every 6 hours inside the deployed image (`jobradar:live`,
  tagged by `deploy.yml` after the container app takes it). No package list of
  its own; deploy and collection never overlap (`pool-and-deploy` group).
- Each source is saved in its own transaction (`ingestion.persist_source`) and
  recorded in `source_runs`. One retry on the first database connection
  (`session.wake`).
- Closing rule: a job from a complete board (ATS boards, Arbeitnow) closes after
  2 full fetches of its own source miss it. A failed, partial, empty or under
  half fetch closes nothing. Window feeds close by age. A source failing for 7
  days is retired (its jobs closed, a warning on every run).
- The 6 dead Greenhouse boards are out of `companies.txt` (404 again today).
- Migration 018: `jobs.source`, `closed_at`, `missed_fetches`, `source_runs`.
  Backfill: `python -m src.database.backfill_job_source`.

## Publication

- Migration 019: `market_publications`. `python -m src.jobpool.publish`
  (`--now`, `--accept <week>`, `--status`); called after every collection run.
- Six gates: fresh, profiles, coverage, jobs, pages, swing.
- `/market/look` and `/market/page/*` serve only the latest publication. The
  live count stays as the fallback until the first one exists.

## Frontend

- A count with 0 jobs is refused (pages, the landing look, the browser fetch).
- `next build` waits up to 90 s for the API, then fails.
- Dates by week: "Counted in the week of 5 October 2026 · Updated every Monday";
  home "4,768 tech jobs counted this week". About 30 lines that called the
  published count "today's" changed; the CV scan and Opportunities keep "today's jobs".
- No question lines on the market pages: above the finding "The skills AI jobs
  name, counted"; chart subtitles say what the share is of.
- Founder, same day: hub cards are the week, the finding, its count and "Read
  more" (the squares are gone); pages with no count have no card; a level with
  no jobs is left out of the levels sentence.
- `/method` says the truth: read every 6 hours, 255 boards, the closing rule,
  published weekly after its checks.

## Tests

Backend: `test_collection.py`, `test_publish.py`, `test_job_pool_workflow.py`
(new; replaces `test_daily_imports.py`), `test_daily_pool.py` and
`test_snapshot.py` rewritten for per source saving. Frontend: refusal and
build wait in `look-server.test.ts`, `look.test.ts`; week wording, statement
subtitles and zero levels in `market-page.test.ts`, `copy.test.ts`, `seo.test.ts`.
Each new test failed once with its fix disabled.
