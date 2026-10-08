# Decision: job retention

**Status:** signals in place, no deletion implemented.
**Files:** `backend/src/database/migrations/011_job_lifecycle.sql`,
`backend/src/jobpool/retention.py`

## Why nothing is deleted yet

The daily pool adds about 2 MB a day. The obvious fix, deleting old postings,
destroys the data JobRadar most wants to learn from later: which jobs users were
shown, saved and applied to, what those jobs asked for, and how the applications
turned out. That history cannot be rebuilt after the fact. Deletion waits for an
agreed policy; what exists now is enough to write one and to run it safely.

## What protects a job today

| Rule | Enforced by |
|---|---|
| A job with any application cannot be deleted | `application.job_id … on delete restrict` — the database refuses, whatever the caller |
| Interest is recorded when it happens | trigger on `application` sets `jobs.last_interaction_at` on save, apply or status change |
| Being shown in a result list is recorded | trigger on `analyses` sets `jobs.last_shown_at` for every ranked job |
| Archiving is reversible | `jobs.archived_at` is a mark, not a delete; archived jobs leave the pool and URL lookups |
| Closing is not deleting | `jobs.closed_at` (2026-10-08) takes a job out of the live pool when its board stops listing it (`job-sources.md`, "Closing jobs"); the row and its history stay, and it reopens if listed again |

## Lifecycle classes

`job_retention` (a view) classifies every job. Evaluated top to bottom:

| Class | Condition | Proposed handling |
|---|---|---|
| `protected` | has an application | keep forever |
| `interacted` | `last_interaction_at` within 365 days | keep |
| `shown` | `last_shown_at` within 180 days | keep |
| `active` | still seen by the daily fetch within 30 days | keep, it is live |
| `stale` | none of the above | eligible for archive, then delete after a further grace period |

The windows are proposals, not policy. `python -m src.jobpool.retention` prints
the current counts per class without changing anything. On 2026-09-15: 14
protected, 42 shown, 5,744 active, 0 stale.

## Before a cleanup job is written

1. Agree the windows above.
2. Archive first (`archived_at = now()` for `stale`), delete only rows archived
   for longer than a grace period, and never delete `protected` rows — the
   foreign key already guarantees the last.
3. Decide what a deleted job leaves behind. Skill demand over time is already
   kept: `market_snapshots` records the live pool's counts every day
   (`decisions/market-snapshots.md`), so deleting jobs no longer loses it.
4. Views of a job page are not recorded at all yet. If they become a signal they
   need their own table; `last_shown_at` is not a substitute.

## Derived rows follow their job

`job_skills` and `job_profiles` are derived from a job and deleted with it
(`on delete cascade`); nothing about them needs a policy of its own.
`job_profiles` adds one ~300-byte row per job. Imported applications that match
a pool job link to it, which makes that job `protected` like any other.
