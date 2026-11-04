# 2026-10-07: editorial market pages

The market pages now read as reporting: one template, five pages, written
from the counts. Plus a /market hub, two data fixes, a Resources menu and the
Arbeitnow link on /method.
Decision: `docs/decisions/market-pages.md` (The editorial template).
Design: `docs/decisions/design-system.md` (Source Serif 4, editorial figure
grammar). Review: `docs/local/editorial-market-pages.html`.

## Data fixes (requirements-v6)

- `roles.py`: `title_level()`. "Member of Technical Staff" is a role name, not
  a level (all 88 in the pool read as lead). An intern, working student,
  apprentice or new grad title is never senior or lead, unless the job runs
  the programme.
- `requirements.py`: "in / over / during the last / past N years" is prose
  (Monzo's "grown a lot in the last 10 years" read as 10 required years in an
  internship); an intern or graduate title that seems to require more than 3
  years reads as unstated.
- `PROFILER_VERSION` = `requirements-v6`. Run
  `python -m src.jobpool.daily --profile-only` on production before the push.
- Tests: `test_requirements.py`, 10 new cases; 7 fail with the fix disabled.

## Backend

- `src/jobpool/market_story.py` (new): each page's `story`, the counts its
  sections are written from: skills by category with employers and the
  comparison count, the headline skill, the squares as four counts, languages
  per job, the contrast, categories, years asked, and the sections the data
  supports. The breadth rule (`broad`, 10 employers) and every threshold are
  named constants.
- `market_pages.py`: every page carries its `story`; role pages compare with
  the family's senior jobs and count internships; the largest employer is named
  as most of its jobs spell it.
- Tests: `test_market_story.py` (12, new; 4 fail with the breadth rule
  disabled), `test_market_pages.py` (1 new; fails with the old naming).

## Frontend

- `app/market/[page]/`: the five pages from one template
  (`components/market-page/MarketArticle.tsx` and its parts); 404 for any other
  name. `app/market/page.tsx`: the hub. Both outside `(public)` so their share
  images keep plain addresses; `app/market/layout.tsx` adds the footer and
  Source Serif 4.
- `lib/market-pages.ts` (pages, fetch, types), `lib/market-story.ts` (every
  sentence, as templates), `lib/market-names.ts`; `lib/market-page.ts` keeps
  the small helpers.
- Share images for all five and the hub (`ShareImage.tsx`); Article and
  BreadcrumbList JSON-LD; data titles and descriptions; `max-image-preview:large`;
  sitemap with `lastmod` = the day counted.
- Header: a Resources menu (Market, How it works, How Glassbox counts), on
  phones too. Footer: "Market". /product and /method link the hub. The home
  count card links to the role page for its job type.
- /method names every job site we read and links to Arbeitnow
  (https://www.arbeitnow.com), as its free API asks; 261 company boards.
- Analytics: a market page name must be one of the five, or it is dropped.
- `EntryContrast`, `EntryCta`, `EntrySkills` removed: the figures replace them.
- Tests: `market-page.test.ts` (rewritten, on a real fixture), `seo.test.ts`
  (4 new), `analytics.test.ts` (1 new). 98 in all.

## Live numbers (7 Oct pool, v5 profiles, read only)

| Page | Jobs | Readable | Employers | Sections |
|---|---|---|---|---|
| entry-level-software | 136 | 135 | 67 | languages, contrast, categories, years, hiring |
| software-engineering | 1,379 | 1,366 | 256 | languages, categories, years, levels, hiring |
| ai | 288 | 287 | 107 | languages, contrast, categories, years, levels, hiring |
| machine-learning | 194 | 194 | 81 | languages, contrast, categories, years, levels, hiring |
| devops | 203 | 200 | 100 | languages, categories, years, levels, hiring |
