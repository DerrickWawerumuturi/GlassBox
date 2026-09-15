# Decision: one match score for every job

**Status:** entrypoint in place; pasted jobs not scored yet.
**Files:** `backend/src/Agent/Framework/JobRadarAgent.py` (`score_jobs`),
`backend/src/Agent/Framework/SimilarityEngine.py`,
`backend/src/Agent/utils/location.py`, migration `013_match_method.sql`

## The rule

There is no second scoring algorithm. A job found by an analysis, a job from
the daily pool and a job a user pasted all get their score from
`JobRadarAgent.score_jobs(query, processed_jobs, location_prefs)`:

| Component | Weight | Source |
|---|---|---|
| skills | 0.45 | embedding similarity, CV skills vs SkillNer-extracted job skills |
| title | 0.25 | embedding similarity |
| experience | 0.10 | embedding similarity |
| location | 0.20 | tier fit from the user's location preferences |

Pool and analysis jobs already take this path. `application.match_method`
records which scorer produced `match_score`, so a future scorer version never
gets compared with an old one as if they were the same scale.

## Why pasted jobs are not scored yet

A pasted job is already stored in `jobs` with a `job_id`. The missing input is
the user's side: `score_jobs` needs the ParsedQuery that the LLM derives from
the CV, and that is not stored. Deriving it again on every paste costs an LLM
call and several seconds on a flow meant to feel instant. The review screen
shows skill overlap in the meantime.

## Adding it

1. Store the ParsedQuery alongside the saved analysis (or the CV) when it is
   produced.
2. After `POST /dashboard/applications/from-url`, score in the background:
   build a `ProcessedJob` with `parse_retrieved_jobs([job])`, call
   `score_jobs(stored_query, [processed], LocationPreferences.resolve(...))`,
   and write `match_score` and `match_method = 'jobradar-similarity-v1'`.
3. `application_unscored_idx` finds everything still waiting, including rows
   created before step 2 existed.
