# Decision: market snapshots, not job sightings

**Status:** in place from migration 015.
**Files:** `backend/src/jobpool/snapshot.py`, `backend/src/database/repositories/snapshot_repository.py`,
`backend/src/database/migrations/015_market_snapshots.sql`, called from `backend/src/jobpool/daily.py`

## The question

Monthly posts ("The Count") and public role pages need history: "SQL is
required in 56% of data-analyst postings, up from 51% last month". Before this,
nothing could answer "what was asked for on a past day":

- `job_profiles` is overwritten when a posting's text changes.
- Jobs will be deleted once a retention policy is agreed (`job-retention.md`).
- `first_seen_at` / `last_seen_at` say roughly when a job was live, not what it
  asked for then.

## Options considered

| Option | Cost | Verdict |
|---|---|---|
| `observe=True` in the daily run: one `job_observations` row per posting per day | ~16k rows a day, ~6M a year, mostly identical | Rejected. Stores sightings to answer questions that only need counts. It is why `observe=False` was chosen in the first place (`ingestion.persist_jobs`). |
| Reconstruct from `first_seen_at` / `last_seen_at` | Free | Rejected. Loses changed requirements and deleted jobs. |
| **A daily summary per role family** | ~20 rows a day, a few KB each | **Chosen.** It stores exactly what gets published. |

## What a row holds

One row per `(taken_on, profiler_version, family)`:

- `postings`: live roles. A role cross-posted on several boards or cities counts
  once, with the same `duplicate_key` the Opportunities page uses.
- `readable`: of those, postings long enough to read (profile not `thin`, under
  800 characters). This is the denominator for skill shares. Thin postings still
  count as roles.
- `seniority`: roles per level, so the entry-level share can be tracked.
- `skills`: `{skill: [required, preferred, mentioned]}` over readable postings.

The pool counted is `profile_repository.POOL` (the Opportunities query) for every
family and level, so "live" means the same thing in both. **Only postings the
daily fetch collects are counted** (`DAILY_SOURCES`: the full boards and the
Kenyan feeds). Users' scans (JSearch, Jooble, The Muse) and pasted links (`url`)
also land in the pool, but they are excluded:

- a pasted link is someone's private job search;
- JSearch's and Jooble's terms keep their data private;
- they would make the counts depend on who used the app that day, not on the
  market.

## Rules

- **Re-running on a day replaces that day's row.** The snapshot describes the
  pool after the latest refresh; it is not a sighting.
- **The profiler version is part of the key.** Counts read by different rules are
  not comparable. A rules change starts a new series instead of breaking the old
  one.
- **It never fails the refresh.** A failed snapshot is logged; the pool is fine.
  `python -m src.jobpool.snapshot` takes it again the same day.
- **No job ids are stored.** Snapshots survive any deletion of jobs.

## Not done yet

- Reading the history (role pages, monthly posts) comes with those features.
- Remote eligibility ("open worldwide") is not counted: the current classifier
  judges eligibility for one candidate's country, not in general. Add it when a
  country-free classification exists.
- History starts on the first day this runs. Nothing before it can be recovered.
