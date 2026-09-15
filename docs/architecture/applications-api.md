# Applications API

Application tracking for the dashboard. All routes require
`Authorization: Bearer <jwt>`; the user is taken from the token's `sub`.

## Routes

| Method | Path | Body | Returns |
|---|---|---|---|
| POST | `/dashboard/applications` | `BookmarkRequest` | `{"bookmarked": bool, "application_id": int\|null}` |
| POST | `/dashboard/applications/extract` | `{"url": str}` | `ExtractedJob` — see [From a job link](#from-a-job-link) |
| POST | `/dashboard/applications/from-url` | `UrlApplicationRequest` | `{"application_id": int}` |
| GET | `/dashboard/applications` | — | list of applications |
| POST | `/dashboard/applications/{id}/transition` | `TransitionRequest` | `{"status": "<new>"}` |
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

## Status codes

| code | meaning |
|---|---|
| 401 | bad token, or an outdated app session (non-numeric subject) |
| 404 | application not found, not yours, or unknown `job_id` |
| 409 | un-bookmarking an application that has been sent, or `from-url` for a job already tracked |
| 422 | body failed validation, or `extract` given an unusable/private URL (`detail` is user-facing) |

404 covers "not yours" deliberately, so ids cannot be probed.

## Transitions

Any transition between the six statuses is allowed, including backwards — a
misclick is corrected by transitioning again, and both moves stay in the
timeline. Returning to `saved` is impossible once applied.
