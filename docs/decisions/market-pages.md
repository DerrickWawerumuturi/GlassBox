# Decision: public market pages, starting with entry level software

**Status:** built 2026-10-07, not yet pushed.
**Files:** `backend/src/jobpool/market_pages.py`, `market_look.py` (builds it),
`backend/src/api/market.py` (`GET /market/page/{name}`); frontend
`app/(public)/market/entry-level-software/` (page and share image),
`app/(public)/method/page.tsx`, `lib/market-page.ts`, `lib/method-copy.ts`,
`components/market-page/`. Tests: `test_market_pages.py`, `market-page.test.ts`,
`analytics.test.ts`.

## Why these pages

The first pages decision (`docs/local/first-pages-decision.html`, 7 Oct)
found one Learner question the data answers honestly today: what entry level
software jobs ask for. Search results for it are opinion lists; a counted
answer is rare, and it has a real finding: entry level ads name languages,
senior ads name systems. A junior reading it has a CV to check, so the page
ends in the same CV scan as everywhere else.

`/method` answers "can I trust these numbers?" for every page: sources, the
hand picked employer list and its skew, one job counted once, how skills,
levels and years are read, and what we can't see. Every line is written from
the code it describes, named beside it in `lib/method-copy.ts`.

## Definitions

- **Counted like the product.** The same live pool and rules as the landing
  count and the daily snapshot: `snapshot.counted()` (daily sources only, the
  same title at the same employer once, across boards and cities), profiles at
  the current `PROFILER_VERSION`. Skills are counted over readable jobs
  (profile not `thin`). The page reads families, levels and years from the
  stored profiles, so a fix to `roles.py` or `requirements.py` reaches it with
  the next profiler version, with no rule copied.
- **Software, broadly:** `software_engineering`, `backend`, `frontend`,
  `full_stack`, `mobile` (`market_pages.SOFTWARE`).
- **Entry level** (`market_pages.is_entry_level`), any of:
  1. the product's junior level: `intern`, `entry` or `junior`;
  2. an early career title (`entry_title`, the one place this rule lives):
     intern, internship, co op, werkstudent, working student, praktikum,
     apprentice; or graduate, grad, new grad, entry level, early career,
     junior, jr when no senior word (senior, staff, lead, principal, manager,
     director, head, architect, chief, vp) sits beside them;
  3. a **required** figure of 2 years or less, unless the level is senior,
     lead or principal. "Ideally 2 years" does not count.
- **Senior**, for the contrast: senior, lead or principal level in the same
  families, minus anything entry level.
- **Internships:** level `intern` or an intern title.
- **Remote:** the board's remote flag.
- **US vs elsewhere** (`market_pages.place`): the location text split on
  `;`, `|`, `/` and "or", each part read by `location.country_named`, the
  helper ranking already uses. Any US part makes it US; only other countries
  makes it elsewhere; no country named ("Remote", "Hybrid") is counted as
  unknown, never guessed.
- **Employers:** distinct employers by the duplicate rule's company key, so
  "Shift" and "Shift Ltd" are one.

## The 100 rule

`publishable` is false under 100 readable entry level jobs. Then the page
shows the count, the job list and counts of internships, remote jobs and
places, and says plainly why it shows no shares. No skill table, no contrast
chart, no "X of Y" fact, no largest employer's share: under 100 jobs a share
describes a few employers more than the market (Stripe alone was 13 of about
88 clean software engineering jobs on 6 Oct). The share image follows the
same rule.

## The endpoint

`GET /market/page/entry-level-software`. Built with `/market/look` from one
read of the pool (`market_look.compute` returns both), so the two never
disagree and the pool is read once. Same cache rules: built in the
background, stale while rebuilding, 503 with `Retry-After` before the first
build, `Cache-Control: public, max-age=3600`, gzip. An unknown page name is a
404 before anything is read; the name is checked against `PAGES`.

Returned: `taken_at`, `profiler_version`, `families`, `min_readable`,
`publishable`, `jobs`, `readable`, `employers`, `internships`, `remote`,
`places {us, elsewhere, unknown}`, `largest_employer {name, jobs}`, `skills`
(top 15 by readable entry level jobs naming it: `any`, `required`,
`senior_any`, `senior_required`), `contrast` (up to 4 skills leaning to entry
level and 4 to senior, at least 3 points apart, from the top 40 of either),
`senior {jobs, readable}`, `required_median {entry, senior}`, `titles` (up to
40, `[title, company, level, required years]`, one employer at a time) and
`names` (display names). Never a job's text.

## The page

`/market/entry-level-software`, server rendered and rebuilt at most every 5
minutes (ISR), with the landing page's rule: a failed fetch during a
revalidation throws, so the last good page stays (`builtForPage` in
`look-server.ts`, shared by both). Sections: the question as the title, one
sentence with the count, date and what it counts; three counted facts with a
copy control; the skills table; the CV ask; the entry vs senior chart (chart
grammar, table twin); who is hiring; the titles; how we counted, linking to
`/method`. No advice anywhere.

**Loop pieces** (decision page section 04):

- *Copy a fact:* the sentence plus the page URL with
  `?utm_source=copy&utm_campaign=entry-level-software`. Analytics
  `fact_copied {page}`, never the sentence.
- *Share preview:* `opengraph-image.tsx` beside the page draws the headline
  fact, its count and date on the desk, in the brand faces. next/og reads
  ttf, not woff2, so `app/fonts/og/` holds static cuts of the same files
  (made with fontTools: woff2 decompressed, instanced at one weight, Latin
  subset; about 50 KB in all).
- *The CTA carries the page:* `cta_clicked {where: "entry-level-software"}`,
  and `scan_started` / `scan_finished` carry `from: "entry-level-software"`,
  so visits can be followed to finished scans. The visitor stays on the page
  after the scan and the skills table lights up: green for a skill on their
  CV, a grey dashed mark for one not on it yet (the landing page's rule:
  only their own scan, `useHave`).

## Later

A 30 day window once snapshot history allows (raises the count, smooths the
internship season). The same template for software engineering, AI, machine
learning and DevOps only after this page shows it converts.
