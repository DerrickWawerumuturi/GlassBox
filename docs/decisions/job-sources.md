# Decision: which sources the daily pool reads

**Status:** in place (2026-10-07).
**Files:** `backend/src/jobpool/sources.py`, `backend/src/jobpool/companies.txt`

Every source the daily refresh reads is in `sources.py`; company boards are
lines in `companies.txt` (`<ats>:<slug>`, Greenhouse, Ashby, Lever or Workable).
What a source adds is judged by the pool's own rules: its jobs are profiled in
memory (`requirements.profile_job`), counted once per role (`duplicate_key`)
against what the pool already holds, and only jobs from the last 90 days count.

## Adding a company board

A board is worth a line when it adds jobs the counts are about, without
diluting them. For early career boards (2026-10-07) the rule was:

- at least 5% of the board's recent jobs are early career tech
  (`market_pages.is_entry_level` on a tech family);
- at least 35% of its recent jobs are tech (the pool is 42%);
- at least 3 early career tech jobs if any are outside the US, else at least 5.

Big boards that are mostly senior (Anduril: 1,273 recent jobs, 56 early career)
or mostly non tech (DoorDash, HelloFresh) are left out: they would add more
noise to every share than they add early career jobs.

Some companies run separate campus boards (`klaviyocampus`,
`tenstorrentuniversity`, `asteraearlycareer2027`). Guessing them does not work:
545 guesses (`<slug>university`, `campus`, `earlycareers`, ...) for the boards
already listed found none. They are found from where the jobs are linked.

**Discovery lists are not sources.** The SimplifyJobs New Grad and Internship
READMEs carry no licence. They were read only for company names and board slugs;
every job counted comes from the company's own public board API.

**Held, not added:** `greenhouse:spacex` passes the rule (279 early career tech
jobs, 129 of them software) but would be a fifth of all entry level software on
its own, all in the US. Adding it is a product call, not a data one.

## Arbeitnow

Its free API (no key, "please do not abuse", a link back asked for in its
terms; no stated rate limit) serves the whole feed in pages: 325 jobs on pages 1
and 2, then 100 a page, ending at page 28 on 2026-10-07. That is about a week of
jobs. Pages 1 and 2 alone, read until then, held 25 of the feed's 101 early
career tech jobs; every later page added 1 to 5, so no page was worth skipping.

`arbeitnow()` now reads until the feed says there is no next page, at most
`ARBEITNOW_PAGES` (40, env `JOBRADAR_POOL_ARBEITNOW_PAGES`). Pages are read one
after another, so the source makes about 28 requests a run. A failed later page
ends the read with what was already read, marked `Partial`: those jobs are
stored, but the read closes nothing (below). A failed first page fails the
source, as before.

## Closing jobs (2026-10-08)

Before, a job was live while it had been seen in the last 3 days, so a failed
fetch and a closed job looked the same, and two failed days put the whole pool
near the edge. Greenhouse, Ashby and Lever's public APIs list only open jobs and
have no closed flag; the convention for pull feeds (Indeed, LinkedIn XML) is
that a job missing from a complete, successfully read feed has closed. So:

- **Complete boards** (`sources.FULL_BOARDS`: every ATS board, and Arbeitnow's
  whole feed): a job closes (`jobs.closed_at`) when 2 full fetches of its own
  source in a row don't list it (`jobs.missed_fetches`). Listed again, it reopens.
- A fetch is **full** only when it succeeded, was read to its end (not
  `Partial`), listed at least one job and at least half the source's usual
  count (the median of its last 5 successful fetches): APIs fail by answering
  200 with a short list. A failed or short fetch closes nothing and counts no miss.
- **Window feeds** (RemoteOK, Remotive, Jobicy, Himalayas, We Work Remotely,
  the Kenyan RSS boards) list only their newest jobs. Jobs dropping out of
  Himalayas and Jobicy had lived 0.3 and 0.7 days on average, against 8.5 for
  Greenhouse and Ashby: scrolled off, not closed. They close by age only: seen
  in the last 30 days, posted in the last 90 (`POOL_WINDOWS`). They were in
  `FULL_BOARDS` until now, with the 3 day rule.
- Every source's fetch is a `source_runs` row (ok, jobs listed, whole, closed,
  error). A source that has failed every fetch for 7 days is **retired**: its
  jobs close, the row is marked, and every run shows a warning annotation until
  it comes out of `companies.txt`.
- The live pool (Opportunities, analyses, the market count) is: not closed,
  posted in the last 90 days, seen in the last 30. A complete board's row with
  no `source` yet (from before migration 018, not placed by the backfill) keeps
  the old 3 day rule until its next sighting.

For Opportunities, everything else is unchanged: window feed jobs now stay up
to 30 days after their last sighting (they had 3), and a complete board drops a
closed job within about 12 hours (two 6 hourly runs) instead of 3 days, and keeps
its jobs through an outage instead of losing them after 3 days.

Removed 2026-10-08, a 404 on every fetch for 5 to 21 days (checked again that
day): Greenhouse postman, instabase, victory, outschool, amplitude, hightouch.
255 boards remain.

Every 6 hours, each source is saved in its own transaction
(`ingestion.persist_source`): one source failing, or failing to save, never
touches another's jobs. The run is red only when most sources fail or nothing
could be saved. The collector runs in the API's own image
(`market-publication.md`).

## Budget

The 7 Oct run fetched 16,992 jobs from 194 sources in 28 s and profiled 1,584
in 23 s, inside a 20 minute job. The early career boards add about 7,700 jobs to
fetch (80 boards) and Arbeitnow about 2,300; the first run after profiles about
6,000 new jobs (about 1.5 min at the measured ~15 ms each), later runs only what
is new. The longest single source is Arbeitnow's 28 sequential requests, about
a minute.

Not yet used, measured in the early career research: SmartRecruiters (public
posting API, strong in India and the EU), Workday career sites (where most
internships are, but not a published API), Personio and Recruitee feeds (EU),
Arbeitnow's UK API (`arbeitnow.co.uk`, same shape).
