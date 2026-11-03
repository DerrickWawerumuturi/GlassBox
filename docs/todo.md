# Todo

Open product work that is not already tracked in the decisions or changelog.

## Columns with no write path

`cover_letter` and `next_action_at` exist and nothing sets them. `notes` is
written by a spreadsheet import and shown in the tracker, but cannot be edited
there yet. Add to the transition body, or a separate PATCH, when the UI needs it.

## Matching: what the user cannot tell it yet

The candidate's role families come from the CV alone. Someone moving into a
new field (a developer targeting ML) cannot say so; a target-role preference
beside the location ones would feed `Candidate.families` directly. Part-time
and freelance roles count as full-time years.

## A reranker, once there are outcomes

`decisions/fit-matching.md` leaves a top-K slot after the gates. It needs
labels first: `application_events` outcomes against the `match_score` each
application was saved with.

## Local migration variable (unverified)

The migration connection reads `DATABASE_URL_DIRECT` in
`backend/src/database/session.py`. An earlier local note reported that the
ignored `.env` used `DATABASE_DIRECT_URL`; that file was not inspected during
this cleanup. If local migrations fail, verify the key name without exposing
its value.
