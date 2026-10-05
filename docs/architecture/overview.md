# System overview

JobRadar answers: *where does this CV stand in the job market, which jobs does
it actually fit, and what should be learned next?* — and keeps track of the
applications that follow.

It is one repository, two deployables and a scheduled job:

| Part | Path | Runs on | Role |
|---|---|---|---|
| API | `backend/` | Azure Container Apps | Produces the intelligence |
| Dashboard | `frontend/` | Vercel | Presents the intelligence |
| Daily pool refresh | `backend/src/jobpool/daily.py` | GitHub Actions, 05:00 UTC | Collects and reads jobs |

The API and dashboard share a repo but never a process. The boundary is
deliberate and load-bearing: **all analysis happens server-side.** The frontend
may reshape numbers for display (`0.5555` → `55.6%`) but never recomputes
similarity, frequency, fit or gaps.

## Two pipelines

Collecting jobs and matching them are separate, so neither waits on the other.

```
DAILY (job-pool.yml, 05:00 UTC, no ML stack)
  sources.fetch_all — ATS boards (companies.txt), remote aggregators,
                      Kenyan RSS boards: 24 threads, each source isolated
     │  list[Job]                      normalise: one Job shape for every board
     ▼
  keep postings from the last 90 days
     ▼
  persist_jobs — upsert on (provider, external_id)         jobs
     │            first_seen_at never moves, last_seen_at every sighting,
     │            updated_at only when the stored posting changed
     ▼
  refresh_profiles — only new, edited, or read by older rules   job_profiles
                     family · level · years · required/preferred skills ·
                     work authorisation · language      (~10-35 ms a posting)

ON REQUEST
  GET /dashboard/opportunities
     saved CV ──► Candidate (skills, years per track, level, location)
     job_profiles (live pool, family-prefiltered) ──► match() per job
     ──► gates · quality · multipliers · reasons ──► fold duplicates
     ──► newest first (posted, else estimated, else fetched)

  POST /analyze   (a scan: the market around a CV)
     PDF ──► Groq ──► ParsedQuery
         ──► SearchEngine: JSearch · Muse · Jooble · the pool   (concurrent legs)
         ──► persist + profile ──► MiniLM off-market filter
         ──► skills: each posting's requirement profile (skills.txt), stored ones reused
         ──► MarketAnalyzer (demand, gaps, coverage)
         └─► match() per job on its stored profile (ranked_jobs)
```

One match score everywhere: pool jobs, analysis jobs and pasted links all go
through `src/matching` (`decisions/unified-matching.md`), which measures fit —
eligibility, level, years, required skills — rather than text similarity
(`decisions/fit-matching.md`).

## Response contract (`/analyze`)

```jsonc
{
  "market": {
    "jobs_analyzed": 20,
    "top_skills":          [{ "skill", "job_count", "frequency" }],
    "skill_gaps":          [ ...same shape... ],
    "user_skill_presence": [ ...same shape... ],
    "skill_coverage": { "covered": 2, "total": 20, "coverage": 0.1 }
  },
  "search": { "location": {...}, "scopes": [...], "jobs_returned": 25, ... },
  "ranked_jobs": [
    {
      "job": { "job": { "db_id", "title", "company", ... }, "skills": [...] },
      "overall_score",                              // match score / 100
      "title_score", "skills_score",                // role fit, required-skill coverage
      "experience_score", "location_score",         // the two multipliers
      "location_tier",
      "match": { "score", "tier", "reasons", "blockers", "required", ... }
    }
  ]
}
```

`GET /dashboard/opportunities` returns the same `match` object per job, plus
`listed_at` and `date_basis` (`posted` · `estimated` · `fetched`). Contracts
for the tracker and import: `architecture/applications-api.md`.

Note the double nesting on `ranked_jobs[i].job.job` — it falls out of the
scored result wrapping a `ProcessedJob`, which wraps a `Job`. The frontend type
mirrors this exactly (`frontend/src/types/jobradar.ts`).

## Performance shape

- **A scan** used to spend ~80% of its time in SkillNer extraction for the
  market statistics. Since 2026-10-01, skills come from requirement profiles, at
  milliseconds a posting, so the search and the LLM read of the CV dominate. Matching the scan's jobs is milliseconds. A scan's jobs join
  the pool as they are stored, and the user's cached Opportunities list is
  dropped when the scan finishes, so they show there at once.
- **Opportunities** read up to 5,000 stored profiles and score them in about
  0.2 s. The exception is the first request in a fresh container: it resolves
  each distinct location string once, about 3 s for 5,000 jobs, and every user
  after it shares those lookups. The result is cached per user and CV for ten
  minutes, and the dashboard paints its own cached copy while it waits.
- **The daily run** fetches ~16k postings from ~200 sources in a minute or
  two and profiles only what changed — typically 700-850 postings a day.

## Operational notes

- `job_radar_agent` is a module-level singleton, so models load once at import;
  startup warms it in the background and no other route waits on it.
- `/analyze` is serialised behind an `asyncio.Lock`; concurrent uploads queue.
- `GET /health` is a cheap liveness probe the dashboard polls.
- After migration 014 (or a `PROFILER_VERSION` bump) run
  `python -m src.jobpool.daily --profile-only`, or wait for the morning run,
  before Opportunities has anything to show.
