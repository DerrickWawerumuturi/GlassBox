# Decision: an open weekly dataset of the published counts

**Status:** built 2026-10-13, not switched on (GitHub issue #7). The push to the
public repository waits for the founder: the repository, the token, and two emails below.
**Files:** `backend/src/jobpool/open_data.py`, `open_data_readme.md`,
`backend/src/database/repositories/publication_repository.py` (`published_weeks`),
`.github/workflows/job-pool.yml`, `backend/tests/test_open_data.py`.
Review page: `docs/local/open-data-review.html`. Preview: `docs/local/open-data-preview/`.

## Why

Research on 13 Oct found nobody publishing an open weekly dataset of skill
counts by job type. Open files are what others reuse and cite: AI answers,
newsletters, charts. Each reuse names Glassbox (the CC BY credit line).

## What is published

Exactly the numbers the site showed that week, read from `market_publications`
(never the pool, never the API). One folder per week plus all weeks files:

| File | Columns | From the page body |
|---|---|---|
| `job_types.csv` | week, job_type, jobs_counted, jobs_readable, employers | `jobs`, `readable`, `employers` |
| `skills.csv` | week, job_type, skill, jobs_naming, jobs_requiring, jobs_readable, share_naming, employers | `story.skills` (`any`, `required`, `employers`), display name from `names` |
| `experience.csv` | week, group, years_bucket, jobs | entry level page `experience` (`titled`, `software`) |

Plus `README.md` (what each number counts, sources, what's left out, the lean,
licence, citation, schema changes) and `datapackage.json` (Frictionless), both
written from `open_data.py` so they can't drift from the columns.

Rules, the site's own:

- **Breadth:** only skills named at 10 or more employers (`market_story.broad`).
  On the two published weeks every one of the 40 stored skills per page passed
  (the narrowest: 14 employers), so the rule cuts nothing yet; it will on a thinner week.
- **The 100 rule:** a page under `MIN_READABLE` readable jobs (`publishable`
  false) gets its `job_types` row but no skill rows.
- **Years** only where the publication has them (from the 12 Oct week).
- **No company names, titles, links or ad text.** The bodies hold titles and
  the largest employer's name; the exporter never reads those keys, and a test
  checks every file for them. Company names were considered and left out:
  they would make the files a list of who is hiring, which is the boards' product, not ours.

Only the 40 skills each page stores (`market_story.STORY_SKILLS`) can be
exported: a longer list would need the pool, and then the files would no longer
be the published numbers.

## Terms of the sources (checked 13 Oct 2026)

We publish only counts. No source's terms mention aggregate statistics; every
restriction found is about republishing listings. Not legal advice.

| Source | Terms read | What they say | Verdict |
|---|---|---|---|
| Greenhouse | docs.greenhouse.io/job-board.html | "Job Board data is publicly available, so authentication is not required for any GET endpoints." No reuse clause. | Fine |
| Ashby | developers.ashbyhq.com/docs/public-job-posting-api; ashbyhq.com/terms (customer terms) | No reuse, licence or attribution text for the public API. | Fine |
| Lever | github.com/lever/postings-api | "All job postings in the published state are publicly viewable. These jobs may be scraped by third parties." | Fine |
| Workable | workable.com/terms (customer terms) | No terms for the public widget API. | Fine (by silence) |
| Remote OK | the legal notice in remoteok.com/api | "Please link back (with follow, and without nofollow!) to the URL on Remote OK and mention Remote OK as a source" | Credit and a followed link |
| Remotive | remotive.com/remote-jobs/api; github.com/remotive-com/remote-jobs-api | "Please link back to the URL found on Remotive AND mention Remotive as a source"; "Please do not submit Remotive jobs to third Party websites" | Credit and link |
| **Arbeitnow** | arbeitnow.com/terms (no date shown) | API, clause 11: "a link back to Arbeitnow.com on your platform", and "may revoke the permission to use API at any time". Use licence, clause 2: "personal, non-commercial transitory viewing only"; "may not ... use the materials for any commercial purpose, or for any public display". | **Unclear.** Credit and link; ask first |
| Jobicy | jobicy.com/jobs-rss-feed; API `friendlyNotice` | "You may use Jobicy listings in your own products and user experiences without requesting individual permission"; "Please ensure Jobicy is clearly credited with a direct link to the source" | Credit and link |
| Himalayas | himalayas.app/api; himalayas.app/terms | "Anyone can use the interface, but please link back to the URL found on Himalayas AND mention Himalayas as the original source." Terms clause 30 bars automated "publication tools" without approval; the API page reads as that approval. | Credit and link |
| **We Work Remotely** | weworkremotely.com/api-terms-and-guidelines (403 to our fetch; read from search excerpts) | "attribute links back to We Work Remotely"; "Do not build an application, website, product, or business that attempts to harm, compete with, or replace We Work Remotely", naming "a job advertising or job search service"; fair use is case by case and theirs to confirm. | **Unclear.** Credit and link; ask first |
| MyJobMag | myjobmag.co.ke/terms (2012) | Disclaimers only; "You have the right to redistribute the service (alerts) we send to you." Feeds offered openly at /feeds/. | Fine |
| Corporate Staffing | corporatestaffing.co.ke/privacy-policy (no terms page) | Nothing on reuse. | Fine |
| Career Point Kenya | careerpointkenya.co.ke/privacy-policy (no terms page) | Nothing on reuse. | Fine |
| Jobweb Kenya | jobwebkenya.com/terms-conditions (empty) | Nothing on reuse. robots.txt: `Crawl-delay: 60`. | Fine |
| Summit Recruitment | summitrecruitment-search.com/privacy-policy (no terms page) | Nothing on reuse. **robots.txt disallows `/feed/`**, the address we read. | Publishing fine; **how we fetch is flagged** |
| Jobs in Kenya | jobsinkenya.co.ke/terms-conditions (empty) | Nothing on reuse. | Fine |

**Decision (proposed, founder to confirm):** include every source, with the
credit lines and links in the README. No source forbids publishing counts.
**Two need an email before the push is switched on:** Arbeitnow (its general
licence bars commercial use and "public display" of its materials, and it sells
a paid API) and We Work Remotely (its no compete clause, and fair use is theirs
to confirm). If either says no, the exporter can't drop it on its own: it reads
the published numbers, which include every source. The weekly count itself
would have to leave that source out, on the site too. Note the site already
shows these same numbers in public; the dataset adds a CC BY licence and a
machine readable form.

Two things outside this change, for the founder: the method page links only
Arbeitnow, while Remote OK, Remotive, Jobicy and Himalayas also ask for a link
(`frontend/src/lib/method-copy.ts`, `JOB_SITES`); and Summit's robots.txt
disallows the feed we read every six hours (ask, or drop the feed, `sources.py`).

## The automation (built, off)

`job-pool.yml`, after "Collect, count and publish":

1. The collect step keeps its log (`| tee collect.log`, `set -o pipefail`) and
   writes the week from the line `daily.publish_if_due` prints
   ("published the market for the week of 2026-10-12: ...") to the step output
   `published`. A test runs the step's `sed` on that function's real output.
2. "Add the week to the open dataset" runs only when `published` is set: at most
   once a week. Without `OPEN_DATA_TOKEN`: one line, "OPEN_DATA_TOKEN is not
   set: the open dataset is not updated", exit 0 (tested with git and docker faked).
   With it: shallow clone `DerrickWawerumuturi/glassbox-job-counts`, run
   `python -m src.jobpool.open_data --out /data --all` in the same `:live` image
   (as the runner's user, so the files are writable), commit "Week of <week>" if
   anything changed, push.
   `--all` rewrites every published week, so a week published by hand
   (`publish --now`) joins with the next scheduled one; files are deterministic,
   so unchanged weeks make no diff.

No API call, one `select` on a database the run has just used.

**Cost per week:** no paid service is called. One extra workflow step, once a
week (about a minute, on a runner that already pulled the image); one indexed
`select` on Neon inside a run that already woke it; about 30 KB of CSV per week
in a public repository. $0 against every free allowance.

## Founder steps

1. Send two short emails (see the review page for a draft): Arbeitnow
   (contact at arbeitnow.com) and We Work Remotely, asking whether weekly
   aggregate counts, credited and linked, are fine. Wait for both, or decide without.
2. Create a **public** GitHub repository `DerrickWawerumuturi/glassbox-job-counts`,
   with "Add a README" ticked (so its `main` branch exists; the first export replaces the README).
3. Create a **fine grained personal access token**: Repository access "Only
   select repositories", that one repository; Permissions, Repository, Contents
   "Read and write" (Metadata read is added automatically); nothing else.
   An expiry you will remember to renew (GitHub allows up to a year).
4. In the GlassBox repository: Settings, Secrets and variables, Actions, new
   repository secret `OPEN_DATA_TOKEN` with that token.
5. The next Monday's publication pushes both published weeks. To fill it now
   instead: from `backend/`, clone the dataset repository and run
   `python -m src.jobpool.open_data --out <clone> --all`, then commit and push it yourself.
6. Optional, later, not built: mirror to Hugging Face Datasets (a dataset repo
   with the same files; the README needs a YAML header with `license: cc-by-4.0`)
   and Kaggle (`kaggle datasets version` with a `dataset-metadata.json`). Each
   would be one more token and one more weekly step.

## Not done

Hugging Face and Kaggle mirrors; a DOI (Zenodo can mint one from a GitHub
release once the repository exists); skills beyond the 40 each page stores.
