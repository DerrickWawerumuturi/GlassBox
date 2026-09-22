# Todo

Deferred work, with enough context to pick it up cold.

## Bookmark UI (frontend)

The backend is done — `POST /dashboard/applications` toggles a bookmark on and
off. What is missing is the control on the jobs/analysis results that calls it.

See `architecture/applications-api.md` for the contract. Note `db_id` is null on
postings that were not persisted, and those cannot be bookmarked.

## Columns with no write path

`cover_letter` and `next_action_at` exist and nothing sets them. `notes` is
written by a spreadsheet import and shown in the tracker, but cannot be edited
there yet. Add to the transition body, or a separate PATCH, when the UI needs it.

## Rolling out fit matching (2026-09-22)

Deploying applies migration 014, which creates `job_profiles` empty.
Opportunities shows nothing until it is filled: run
`python -m src.jobpool.daily --profile-only` against production (~16k postings,
a few minutes, no ML stack), or dispatch the Job pool workflow. After that the
morning run keeps it current. Applications saved before this keep their old
`match_method` (`jobradar-similarity-v1`) and are not rescored.

## Matching: what the user cannot tell it yet

The candidate's role families come from the CV alone. Someone moving into a
new field (a developer targeting ML) cannot say so; a target-role preference
beside the location ones would feed `Candidate.families` directly. Part-time
and freelance roles count as full-time years.

## A reranker, once there are outcomes

`decisions/fit-matching.md` leaves a top-K slot after the gates. It needs
labels first: `application_events` outcomes against the `match_score` each
application was saved with.

## BrighterMonday

Kenya's largest board is not a source: its robots.txt disallows the `?q=` and
`?page=` URLs a crawler would need, and there is no feed. jobhunt fetches it
for one user; the pool does not.

## `DATABASE_URL_DIRECT`

The code reads `DATABASE_URL_DIRECT` for migrations; the local `.env` names it
`DATABASE_DIRECT_URL`, so local migrations fall back to the pooled URL.

## Toggle race

Two simultaneous clicks can both see "no existing row" and both insert; the
second hits `application_user_job_key`. Theoretical at current scale. The fix is
catching `UniqueViolation` in `toggle_bookmark` and treating it as already saved.

## Two system overviews

The merge brought `architecture/overview.md` (backend's) and
`overview-frontend.md` together. They share a title and opening but each traces
only its own half — pipeline vs routes. Reconcile into one now that there is
one repo; the backend copy is the more current of the two.

## No CLAUDE.md

`.gitignore` points at a `CLAUDE.md` that was never committed. Regenerate it for
the monorepo layout, not the old backend-only one.
