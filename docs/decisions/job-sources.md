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
after another, so the source makes about 28 requests a day. A failed later page
ends the read with what was already read: the pool's live window (3 days) covers
a missed sighting. A failed first page fails the source, as before.

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
