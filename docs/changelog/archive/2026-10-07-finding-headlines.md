# 2026-10-07: finding headlines

Each market page's H1 is now its lead finding, chosen by rules from the data:
"Two in three AI jobs name LLMs", "“Entry level” usually means two years".
The question moves to a line above the headline and stays in the title and
the meta description. The hub's cards lead with the same finding beside 100
squares that show its share. Decision: `docs/decisions/market-pages.md`
("Finding headlines"). Review: `docs/local/finding-headlines.html`.

## Backend

- `market_story.finding` (new): the first pattern that applies (years, share,
  tied, pair, half, leads), with named thresholds; `fraction` says "two in
  three" only within 2 points. `story` returns `finding`, and its `headline`
  skill skips the page's defining skill (`market_pages.DEFINING`, beside
  `ROLES`).
- `skills.inline` and `COMMON_NOUNS`: a skill's name mid sentence ("distributed
  systems"); pages return `inline_names`. "Machine Learning", "Deep Learning"
  and "Computer Vision" are sentence case in `skills.txt`.
- `src/cv/upload.py` (new): `/analyze` and `/cv/parse` refuse a file over
  10 MB (413) or one that isn't a PDF by its first bytes (415), and a request
  that declares too big a body before reading it. Checked before the queue.

## Frontend

- `lib/market-story.ts`: `headline`, `findingCount`, `findingShare`,
  `cardLine`, `inlineName`, `say`, `fractionPhrase`; the dek, "At a glance"
  (the headline's finding first), the description and the cite line follow
  the finding. The years section no longer repeats the H1.
- `MarketArticle`: question above, finding as H1; title bar, share button and
  Article markup use the headline (`seo.marketStructuredData`).
- Hub (`app/market/page.tsx`): cards with kicker, headline, question and
  count, `FindingSquare` (new), "Read".
- Share image per page (`ShareImage.findingImage`): the headline, the count,
  the squares.
- Charts: skill names wrap and drop examples in brackets (`chartName`), never
  an ellipsis.
- CV sheet: the example counts out of the ask's own total ("6 of 10" from the
  landing count); "Use last CV" and "See them"; a 415 reads "isn't a PDF".

## Tests

Backend `test_market_story.py` (finding patterns at their thresholds, the
defining skill), `test_skills_vocabulary.py` (inline names), `test_cv_upload.py`
(new: 413, 415, the declared size, exactly 10 MB), fixtures in
`test_latest_cv.py`, `test_api_pool_and_import.py` and `test_scan.py` follow.
Frontend `market-page.test.ts` (headline per page and per pattern, dek,
glance, hub line, chart names), `cv-ask.test.ts` (example total, 415),
`copy.test.ts` (no button exception), `seo.test.ts`. The market story fixture
is rebuilt from the same 7 Oct rows and now has four pages.

## Verified

Local production build on :3100 against a read only stub of production's
8 Oct rows (v6 profiles): hub and the five pages at 1440 and 390, dark and
light, no sideways scroll, no chart label cut off, no page errors; the sheet
from a market page ("9 of 15") and from the landing count ("6 of 10"); the
five share images. Screenshots: `docs/local/shots/finding-headlines/`.
