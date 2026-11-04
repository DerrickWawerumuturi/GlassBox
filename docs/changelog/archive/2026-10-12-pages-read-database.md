# 2026-10-12: public pages read the published week from the database (fixes #5)

Decision: `docs/decisions/market-publication.md` ("The frontend"),
`docs/decisions/deployment.md` ("Public pages read the database", "The site's
database login"), `docs/decisions/market-look.md`.
Review page: `docs/local/pages-read-database-review.html`.

## The problem

After #4 the public pages still rebuilt once a day against the API, and the
weekly refresh woke the API on purpose before revalidating. The API scales to
zero and is billed per awake second. The week's numbers were already stored
in `market_publications`.

## The change

- Frontend: `lib/published.ts` (server only) reads the latest published row
  from `market_publications`, the same row the API serves, over
  `MARKET_DATABASE_URL` (postgres.js). `look` and `pages[name]` are the API's
  bodies as stored; nothing was computed on top, so no logic moved.
- `lib/landing/look-server.ts` reads that instead of fetching the API;
  `marketForPage` and `allMarkets` moved there from `market-pages.ts`, so the
  database code can't reach a client bundle (`server-only`).
- Every public page, share image and the sitemap: `revalidate = false`. Built
  at deploy, rebuilt only by `/api/revalidate`.
- `/api/revalidate` first reads the publication itself and drops nothing when
  it can't (503). Measured with `next start`: after `revalidatePath`, a page
  whose render fails answers 500, not the old page.
- `next build` fails, saying why, without `MARKET_DATABASE_URL`, when nothing
  is published, or when the database doesn't answer in 30 s. Vercel then keeps
  the last deployment.
- Backend: `refresh_site.py` no longer wakes the API before revalidating.

## Measured locally

`next build` against a local Postgres as a read only login (only `select` on
`market_publications`): every public route prerendered with the count, each
with `initialRevalidateSeconds: false`. The login's password and the variable
name are in no file under `.next/static`. With `next start`: a new row showed
nothing until `/api/revalidate`, then the new number; with the login's
`select` revoked, `/api/revalidate` answered 503 and the pages kept the last
number (200); with it granted back, the next revalidate showed the newer row.

## Tests

Frontend: `published.test.ts` (new: the query, retries at build, failing the
build without the address; on a local Postgres, the row picked from
`published.fixture.json`), `look-server.test.ts` (rewritten for database
reads), `page-wakes.test.ts` (every route reading the count has
`revalidate = false`, no route has a numeric one, rendering the public pages
makes no fetch), `revalidate.test.ts` (nothing dropped when the read fails).
Backend: `test_publish.py` (the API serves the fixture's row as stored),
`test_refresh_site.py` (the refresh never calls the API). Each failed once with
its fix disabled.

## Before the push

The founder created `glassbox_site` on Neon and sets `MARKET_DATABASE_URL` on
Vercel (Production and Preview) before pushing (`deployment.md`).
