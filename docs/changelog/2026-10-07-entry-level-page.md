# 2026-10-07: the entry level software page and /method

The first public market page: "What do entry level software jobs ask for?",
counted from the live pool, and a page that says how Glassbox counts.
Decision: `docs/decisions/market-pages.md`. Review: `docs/local/entry-level-page.html`.

## Backend

- `src/jobpool/market_pages.py` (new): the page's definitions (software
  broadly, entry level, internships, US vs elsewhere) and its body.
- `market_look.compute` builds `/market/look` and every market page from one
  read of the pool. `look()` and the new `page(name)` read the same cache.
- `GET /market/page/{name}`: built, cached, stale while rebuilding, 503 before
  the first build, 404 for an unknown name before anything is read.
- Tests: `test_market_pages.py` (new, 50 cases); `test_market_look.py` cache
  tests use the new built shape, and the local database test checks the page
  moves with the count.

## Frontend

- `/market/entry-level-software`: server rendered, ISR every 5 minutes, keeps
  the last good page when the API fails during a revalidation.
- Its own share image (`opengraph-image.tsx`) with the headline fact, in the
  brand faces (static ttf cuts in `app/fonts/og/`).
- Copy a fact: sentence plus a tagged link; `fact_copied {page}`.
- The CV ask carries the page into the click and the scan
  (`cta_clicked`, `scan_started.from`, `scan_finished.from`); the table lights
  up after the scan.
- `/method`: how Glassbox counts, written from the code. One correction to the
  brief: job skills are read by fixed rules against a list of 250 skills, not
  by a language model. Only the CV is read by a model.
- Wiring: both pages in `PUBLIC_PATHS` (so the sitemap), canonical and share
  block by `publicPage`, which gains `ownImage` for a page with its own share
  image. Linked from the site footer and from the Market section of /product.
- Shared pieces: `builtForPage` (look-server.ts) for any built body;
  `useHave` (the visitor's skills) now used by the landing page too;
  `ChartPanel` takes a custom table twin (`TableTwin`).

## Numbers on the 7 Oct pool (v4 profiles, read only)

164 entry level software jobs, 163 readable, at 73 employers. 50 internships,
33 marked remote. 82 in the US, 57 elsewhere, 25 with no country. Stripe
lists 18. Python is named in 68 of 163. Production has no v5 profiles yet, so
until the daily refresh re-profiles the pool the live page shows 0 jobs and
the "under 100" message. Recount after the v5 refresh before sharing anything.

## Docs

`decisions/market-pages.md` (new), `decisions/market-look.md` (one build for
the count and the pages), `decisions/analytics.md` (the new event and
properties), `architecture/backend.md`, `architecture/frontend.md`.

## Also: an empty count is no count

`lib/landing/look-server.ts` accepted a `/market/look` answer with no job types
(`families: {}`) as a good count, and the home page crashed rendering it. That
answer is real: an API on a new profiler version before the pool is re-read
(found when a local API on `requirements-v5` broke `next build`). It is now
treated as unavailable: a revalidation keeps the last good page, a build renders
without the count. Test in `look-server.test.ts` (fails without the fix).
