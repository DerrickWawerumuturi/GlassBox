# 2026-09-22 — fit matching, Opportunities from the daily pool, spreadsheet import

A one-year React developer scored **61.9%** for "Senior React Engineer, 5+
years", and a Nairobi candidate's top match (74.8%) was a job requiring US work
authorisation. The match score measured how alike two texts were, not whether
the candidate could get the job. Opportunities also existed only inside a scan:
the daily pool of ~16k postings was collected every morning and never shown to
anyone who had not just run one.

Three changes. Matching is the one the other two lean on.

---

### Matching: fit, not similarity

**Files:** `backend/src/matching/` (new: `skills.py` + `skills.txt`, `roles.py`,
`requirements.py`, `candidate.py`, `matcher.py`), `JobRadarAgent.score_jobs`,
`jobpool/service.py`, `services/applications.py`, `services/users.py`

Each posting is read once into a profile: role family, level, required years,
required/preferred skills by section, and work authorisation, language and PhD
requirements stated in the body. The CV becomes a candidate: canonical skills,
and professional years per track worked out from position dates. `match()`
applies gates first (can't hold it, two levels up, three years short, wrong
language, not technical). Then it scores quality, multiplies by experience and
location, and writes the reasons. The brief's cases, old → new:

| Case | Old | New |
|---|---|---|
| 1-yr React dev → Senior React, 5+ yrs | 61.9% | 10, out of reach: "Senior role", "Asks 5+ years" |
| same dev → Junior Frontend | — | 100, strong |
| ML learner → ML Intern / ML Engineer 3+ | 64.1% for the senior ML role | 76 strong / 18 out of reach |
| React/Node/PG → Junior Full-Stack | 85.5% | 100, strong |
| Kenya → US-only, or US authorisation in the text | 68.1% / 74.8% (ranked 1st) | 25, out of reach: "Not open to candidates in Kenya" |

Embeddings leave matching. MiniLM remains only as the off-market filter before
the market statistics are counted, and SkillNer/EMSI remain only for those
charts. `SimilarityEngine.py` held two classes; the scorer is gone, so the file
is now `MarketAnalyzer.py`.

Why these choices and not a cross-encoder or LLM extraction:
`decisions/fit-matching.md`.

### Opportunities without a scan

**Files:** `migrations/014_job_profiles.sql`, `repositories/profile_repository.py`,
`services/ingestion.py`, `jobpool/daily.py`, `jobpool/opportunities.py`,
`jobpool/sources.py`, `main.py` (`GET /dashboard/opportunities`)

The daily run now profiles what it stores, but only postings that are new,
edited (`content_hash`) or read by older rules (`PROFILER_VERSION`). That is
about 15–35 ms a posting, with no ML stack in the Action.
`GET /dashboard/opportunities` matches the live pool to the saved CV on
request. It prefilters in SQL to the role families the CV points at, folds
cross-posted copies into one row, and caches the result per user and CV for ten
minutes.

Ordering is newest first, by the posting's own date. A board that says only
"2 days ago" gets an estimate, marked `≈`. A board that says nothing gets the
date JobRadar first fetched it, shown as "Found …". `posted_at` is still never
invented. `jobs.updated_at` now moves only when a posting actually changed, not
on every sighting.

Sources: six Kenyan job boards' RSS feeds, and three employers added to
`companies.txt`. `fetch_all` keeps its signature; jobhunt,
which imports it, now also receives those boards.

### Applications: import, and two dates

**Files:** `services/spreadsheet.py`, `services/application_import.py`,
`repositories/application_repository.py`, `main.py` (`import/preview`, `import`),
`ImportApplicationsDialog.tsx`, `applications/page.tsx`

A tracker spreadsheet (`.xlsx`/`.csv`) is previewed before anything is written:

- the header row is found, and columns are mapped from their headers or values;
  the user can correct the mapping;
- dates are read in the sheet's own order;
- every row is marked ready, warning, duplicate or error.

Duplicates are matched by normalised link, or by company + role within 60 days.
The same role further apart is flagged as a possible re-application and left
unticked. An imported "Interview" row gets the saved → applied → interview
timeline it would have had.

`added_at` (entered JobRadar) is now separate from `applied_at` (the user's
date, or "unknown"). The list is ordered by `added_at`.

### Also

- `current_user`: an expired token was a 500; now 401.
- `location.country_named` and `remote_eligibility` are cached per process. They
  are pure functions of their strings, and pycountry's fuzzy search behind them
  was the slow part of ranking. It was cached per user before, so every new
  user paid it again: 5,000 jobs now take 0.3 s for a second user, against
  about 3 s for the first.
- A scan reads each posting once. SkillNer runs only on postings no earlier run
  has extracted; the rest keep their stored skills, provided the posting has
  not changed since. Each job is scored on its stored profile rather than
  profiled a second time. Before, SkillNer re-read every posting on every scan
  (about 5 s each, measured), even when its skills were already stored.
- A scan's jobs show in Opportunities as soon as it finishes. The user's cached
  list (10 minutes, keyed by CV) is dropped at the end of the scan, and the
  dashboard refetches. Before, re-scanning the same CV could leave Opportunities
  without the new jobs for up to 10 minutes.
- Migration 014 relaxes the `applied_at` check: a `saved` row still has none,
  but an applied row may now have no date, which an import from a sheet without
  dates needs.

### Tests

`test_matching.py` (the brief's cases A–D, jobhunt's tier cases, seven defects
found on the real pool), `test_requirements.py`, `test_scan.py` (each posting
read once), and `test_api_pool_and_import.py` (against a local Postgres; skipped
otherwise). Backend: 267 passed against a local Postgres; 246 passed with the
two database modules skipped, as CI runs them.

### Rollout

The deploy applies migration 014, which creates an empty `job_profiles` table.
Run `python -m src.jobpool.daily --profile-only`, or dispatch the Job pool
workflow, before Opportunities has anything to show. See `todo.md`.
