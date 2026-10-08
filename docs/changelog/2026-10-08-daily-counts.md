# 2026-10-08 — Daily counts on the server

Decision: `docs/decisions/analytics.md`, "Server side counts".
Review page: `docs/local/daily-counts.html`.

PostHog misses anyone with an ad blocker or Do Not Track. The API now counts
scans and new accounts itself, as totals per UTC day. Numbers only: no user
ids, addresses, file names or CV content.

- Migration 020: `daily_counts` (`day` primary key; `scans_started`,
  `scans_finished`, `scans_failed`, `cv_reused`, `accounts_created`).
- A scan is one `POST /analyze` or `POST /analyze/reuse`. `/cv/parse` is the
  other half of an upload scan and is not counted, so a scan counts once.
- `accounts_created` is counted where `X-Account-Created` is set.
- Counting runs on one background thread. A failed write is logged and
  dropped; the request never waits and never fails because of it.
- Read command: `python -m src.api.daily_counts --days 14` (a select only).
- `/privacy`, Analytics: "Our own server also counts scans and new accounts
  each day, as totals. Never who." `/your-cv` is unchanged: a daily total
  keeps nothing about the person.
- Tests: `tests/test_daily_counts.py`, 13 (2 need a local Postgres).

## Founder runbook

1. Before the push, on production: `cd backend && python -m src.database.migrate`
   (applies `020_daily_counts`; `--status` first to see it pending). Deploying
   first is harmless too: each count fails, is logged and dropped until the
   table exists.
2. Push, and check "deploy backend" is green.
3. After a scan on the live site: `cd backend && python -m src.api.daily_counts --days 14`.
