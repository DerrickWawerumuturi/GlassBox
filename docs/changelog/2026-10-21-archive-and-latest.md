# 2026-10-21: /market opens on Latest; past weeks keep their pages

GitHub issue #16. Decisions: `docs/decisions/market-pages.md` ("The hub" and "Past weeks"),
`docs/decisions/market-publication.md` ("The frontend"). Review page: `docs/local/archive-and-latest-review.html`.

## The change

- **Latest on /market.** The hub opens on Latest: every card newest first by the day it came out (a story's
  `published`, the years card's week), then by the week it counts; how we count last. A story card's date is that
  day ("21 Oct 2026"). "By job type" is the second chip and keeps the market pages' order by CSS `order`, so the page
  holds one set of cards, newest first, and the CV card stays fifth in both views (`lib/market-hub.ts` `latestFirst`,
  `components/market-hub/HubFilter.tsx`, `app/market/page.tsx`).
- **Past weeks.** `/market/<page>/week/<monday>` renders a market page with that week's latest published row, dated at
  the top ("The week of 12 October 2026. This is a past week; the live page counts again every Monday." and "Latest
  count: AI jobs"), canonical to itself, its own address in the cite line, copied facts and Article markup. The live
  page and every past week end with "Past weeks" (`components/market-page/PastWeeks.tsx`), newest first with the jobs
  each counted; the byline links to it. The live week's address redirects to the live page. The years page keeps no
  archive (the entry level page's past weeks carry its numbers).
- **Reads** (`lib/published.ts`): `WEEKS`, one row per published week (the latest of each), the live week, and the jobs
  of each page with a count; `WEEK`, `pages -> name` of one week's latest published row. Same read only login and
  table. `lib/landing/look-server.ts` `weeksForPage` and `marketForWeek` keep the last good page on a failed read, as
  the live pages do.
- **Refresh.** No new path in `/api/revalidate`: its `/market` layout drop already covers every past week. Checked on
  `next start`: a new week published, the refresh called, and `/market/ai` listed the old live week, its past page
  rendered on the first visit (it had been a cached redirect), the sitemap listed it.
- **Sitemap.** Every past week, after the public pages, with no lastmod.

## Tests

`market-hub.test.ts` (Latest order, the dates, the views), `components/market-hub/hub.test.ts` (Latest pressed first,
the page newest first with `<time>` dates, CV card fifth in both orders), `published.test.ts` (the queries, past weeks
before the live one, one page of one row; on the local Postgres: one row per week, the latest published wins, rejected
rows and a week with no story list nothing), `components/market-page/past-weeks.test.ts` (the live page's list, the
past page's numbers, date line, canonical, title, cite path, redirect, 404s before any read), `page-wakes.test.ts` (the
archive route has `revalidate = false`, renders without a fetch, the sitemap lists past weeks), `revalidate.test.ts`
(dynamic params kept; the layout drop covers past weeks). Each was failed once with its change disabled.

## Cost

No timer, schedule, retry or background work. Per build: the weeks list (531 bytes locally) once per build worker,
and one page body (about 12 kB) per past week per market page, about 61 kB per past week; about 0.6 MB a build after
ten past weeks. Per day: none, outside builds and the Monday refresh, except the first visit to a past page after
a refresh (the list and one body) and a guessed Monday with no row (the list once, then a cached 404). No Azure API
call anywhere.
