# Applications API

Application tracking for the dashboard. All routes require
`Authorization: Bearer <jwt>`; the user is taken from the token's `sub`.

## Routes

| Method | Path | Body | Returns |
|---|---|---|---|
| POST | `/dashboard/applications` | `BookmarkRequest` | `{"bookmarked": bool, "application_id": int\|null}` |
| POST | `/dashboard/applications/manual` | `ManualApplicationRequest` | `{"application_id": int}` |
| POST | `/dashboard/applications/extract` | `{"url": str}` | `ExtractedJob` — see [From a job link](#from-a-job-link) |
| POST | `/dashboard/applications/from-url` | `UrlApplicationRequest` | `{"application_id": int}` |
| POST | `/dashboard/applications/import/preview` | multipart: `file`, `mapping?`, `date_order?` | `ImportPreview` — see [From a spreadsheet](#from-a-spreadsheet) |
| POST | `/dashboard/applications/import` | `ImportRequest` | `{"created", "application_ids", "skipped"}` |
| GET | `/dashboard/applications` | — | list of applications, most recently added first |
| POST | `/dashboard/applications/{id}/transition` | `TransitionRequest` | `{"status": "<new>"}` |
| DELETE | `/dashboard/applications/{id}` | — | `{"deleted": id}` |
| GET | `/dashboard/applications/{id}/history` | — | event timeline, newest first |

Accounts are created on a user's first write; there is no separate provisioning
call. Tokens whose subject is not a numeric Google id are refused (401) on
every route.

## Bodies

```jsonc
// BookmarkRequest — job_id required, the rest snapshot the posting on create
{ "job_id": 2242, "title": "ML Engineer", "company": "Acme",
  "source": "linkedin", "match_score": 0.62, "cv_snapshot": { } }

// TransitionRequest — to_status required
{ "to_status": "applied", "occurred_at": null,
  "scheduled_for": null, "note": "applied on their site" }
```

`to_status` is one of `applied · screening · interview · offer · rejected ·
withdrawn`. `saved` is not accepted: it is a creation state only.

`occurred_at` defaults to now; send it only when backdating (a rejection read
days after it was decided).

## Two dates

Every application carries both, and they are never merged:

- `added_at` — when it entered JobRadar (`applications.created_at`). Set by the
  server, never edited. The list is ordered by it, newest first, then by
  `applied_at`, then id — so a spreadsheet imported today lists above last
  week's manual entries, in the file's own order.
- `applied_at` — when the user applied, as they said. Null for `saved`, and for
  an import whose sheet gave no date (the row says "unknown"; nothing is
  invented).

## Bookmarking

`POST /dashboard/applications` is a **toggle**. No application for that job
creates one at `saved`; an existing one at `saved` is deleted; an existing one
at any other status returns **409**, because deleting it would cascade away its
event history.

`job_id` is the `db_id` on each posting in the `/analyze` response. It is
**null** when persistence was disabled or failed — those postings cannot be
bookmarked and the control should be disabled rather than posting null.

## From a job link

`extract` never fails on a partial read. It returns what it found, `missing`
(review fields still empty), and `message` explaining why, in words fit to show.
Sources are tried in order: the job pool (`method: "pool"`), the ATS API
(`greenhouse` / `lever` / `ashby`), JSON-LD (`json-ld`), page meta tags
(`page-meta`), the URL slug (`url-path`). Sites that block bots (Indeed,
Glassdoor) come back as `method: "none"` with a message.

`job_id` is set only for structured results, which join the shared pool. Pass
it to `from-url` so the application links to that job. The reviewed values are
stored on the application and win in the list; the shared `jobs` row is never
edited by a user.

`UrlApplicationRequest`: `url`, `title` (required), `job_id`, `company`,
`location`, `workplace` (`remote|hybrid|onsite`), `employment_type`, `salary`
(free text), `source`, `status` (`saved` default, or `applied`), `cv_snapshot`.

`extract` also returns `match` — how the posting fits the saved CV, from the
same matcher as Opportunities (null without a CV). `from-url` scores the job
again on the server when it is saved, from its stored profile; nothing the
client sends is taken as a score.

## From a spreadsheet

For a tracker kept before JobRadar. Two calls, and nothing is written until the
second:

1. **`import/preview`** reads the file (`.xlsx` or `.csv`, 5 MB, 2,000 rows)
   and returns what importing it would do. `.xls` and other formats are a 422
   with a message fit to show. The header row is found among the first ten
   (the sheet with the best header wins in a workbook); columns are mapped from
   header synonyms ("Role", "Position", "Job title" → title), else from their
   values (a column of links → url), and each column says how (`header` ·
   `values` · `you`). Dates are read in both orders; `date_order` is `dmy` or
   `mdy`, with `date_order_ambiguous` when the sheet cannot tell.

   Each row comes back as `ready`, `warning` (imported, with a note — a missing
   company, an unreadable date), `duplicate` (skipped) or `error` (no title),
   with `include` preset. The preview is stateless: to correct it, send the
   same file with `mapping` = `{"<column index>": "<field>" | null}` and/or
   `date_order`.

2. **`import`** takes the rows the user confirmed (`ImportRow`: `title`
   required; `company`, `url` (http/https), `location`, `workplace`,
   `applied_at` (date), `status`, `employment_type`, `salary`, `source`,
   `notes`). Duplicates are checked again against the account as it is now, so a
   double submit imports nothing twice. Each row is its own savepoint: one bad
   row is reported in `skipped`, not fatal.

**Duplicates.** Certain (skipped): the same job link — compared without
`www`, trailing slash or tracking parameters — or the same company and role
applied within 60 days of each other (or with either date unknown). Possible
(shown, unticked): the same company and role further apart, which is usually a
re-application. Rows are compared with
the account and with earlier rows of the same file.

**History.** An imported row at `interview` gets the timeline a user would have
recorded: `saved` when added, `applied` on its date (noon UTC; the day is what
the sheet knows), then `interview` — the last note saying it is the status when
imported. A link that matches a job in the pool links the application to it.

## Status codes

| code | meaning |
|---|---|
| 401 | bad token, or an outdated app session (non-numeric subject) |
| 404 | application not found, not yours, or unknown `job_id` |
| 409 | un-bookmarking an application that has been sent, or `from-url` for a job already tracked |
| 422 | body failed validation, `extract` given an unusable/private URL, or a spreadsheet that cannot be read (`detail` is user-facing) |

404 covers "not yours" deliberately, so ids cannot be probed.

## Transitions

Any transition between the six statuses is allowed, including backwards — a
misclick is corrected by transitioning again, and both moves stay in the
timeline. Returning to `saved` is impossible once applied.
