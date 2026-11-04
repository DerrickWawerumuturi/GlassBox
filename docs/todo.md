# Todo

Open product work not already tracked in decisions or changelog. This list is not a deployment checklist.

## Bookmark UI

The backend supports `POST /dashboard/applications` to toggle a bookmark. Add the control to job/analysis results when that UI work is prioritized. `db_id` is null for jobs that were not persisted and those cannot be bookmarked. See [`architecture/applications-api.md`](architecture/applications-api.md).

## Application fields with no write path

`cover_letter` and `next_action_at` exist but have no write path. `notes` is written by spreadsheet import and shown in the tracker, but cannot yet be edited there. Add to the transition body or a separate PATCH when the UI needs it.

## Matching scope

Candidate role families currently come from the CV. A person moving into a new field cannot state a target role; a target-role preference could feed `Candidate.families`. Part-time and freelance roles currently count as full-time years. See [`decisions/fit-matching.md`](decisions/fit-matching.md).

## Reranking after outcome data

The fit matcher leaves a top-K slot after the gates. Revisit only when there are enough `application_events` outcomes to evaluate against saved `match_score` values.

## Source coverage

BrighterMonday is not currently part of the pool: the documented search URLs are disallowed by its robots rules and no feed was identified. Recheck only if the source offers a permitted access method.

## Toggle race

Two simultaneous bookmark toggles can both observe no row and race on `application_user_job_key`. This was considered theoretical at current scale; handle the unique violation as already saved if the user-visible error becomes material.

## Local migration variable (unverified)

The migration connection reads `DATABASE_URL_DIRECT` in `backend/src/database/session.py`. An earlier local note reported a different key name in the ignored local configuration; that file was not inspected. If local migrations fail, verify the key name without exposing its value.
