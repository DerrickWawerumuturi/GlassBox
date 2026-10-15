# 2026-10-16: the years page, "Count the rings" (refs #13)

The founder approved the prototype on 16 Oct 2026 (`docs/local/editorial-sprint/years-page/`), and Alfa Slab One.
Decision: `docs/decisions/market-pages.md` ("Years of experience", "Count the rings") and `design-system.md`
(typography). Brand book: the log, section 06 and still open. Review page: `docs/local/years-rings-review.html`.

## The change

- **A woodpile seen end on**, one log end per job, its rings the years the job asks for: lime paint two years or
  less, bare wood three or four, dark heartwood five or more; a sealed grey hatched end states no number; a bare log
  (only its pith) asks for none. `components/years/`: `logs.ts` (one log, on a canvas or as SVG), `pile.ts` (the rack,
  its key and layers, the sort, reading a log), `Woodpile.tsx` (client), `Figures.tsx` (server SVG: the specimen board,
  the ringed logs, the rounds), `years.module.css`.
- **The page** (`YearsArticle.tsx`): the kicker "Count the rings · week of …" in Alfa Slab One, the H1 and dek as
  before, the byline and its share buttons, pile one (early career titles, mixed, pen note on a sealed end), the
  stamped count "306 of 328", how to read a log end, the ones that state a number (one log each; above 60, one per
  group with its count), pile two (every software job, opened stacked, pen note on a heartwood log), the line for all
  software jobs, the rows as logs on their side cut by share, the table twin, the questions as text, the CV ask, the
  method and the cite.
- **Still the weekly page.** New functions in `lib/years-answer.ts`, each from the week's `experience` counts:
  `kicker`, `stamp`, `pileCaption`, `ringedHeading`, `ringedLine`, `yardLead`, `roundsLine`, `logWords`, `logKinds`,
  `pileGroups`, `yearsSections` (and `asking`, `jobs`, `rowLabel` exported). A part the counts can't fill leaves the
  page. Metadata, canonical, share image, sitemap entry, structured data (Article, BreadcrumbList, FAQPage) and the
  Monday rebuild are unchanged.
- **Interactions.** "Stack by rings" / "Mix them back" sorts a pile into layers (instant with reduced motion); a tap,
  a mouse hover or the arrow keys on the focused pile read one log ("Log 143 of 328. This job states no number of
  years."). The table twin and each pile's label carry every count for a screen reader or without script.
- **Alfa Slab One** (OFL, reserved name, so uncut; only wrapped as WOFF2, 35 KB) in `app/fonts/alfa-slab-one.woff2`
  with `OFL-alfa-slab-one.txt`, loaded by this route only, with Hanken Grotesk.
- The /market card keeps its tags cover and "306 empty tags" for now (still open in the brand book).

## Cost

None. The page stays static and rebuilds with the Monday publication as before; no new data, request or schedule.

## Tests

`lib/years-answer.test.ts` (+6): the kicker, the stamp, one log per job, each pile's key top layer first without empty
kinds, every new line on the real week, and the prototype's two made up weeks (most state a number: the headline
flips; a thin week: no ringed logs, no yard, one sealed round; the singular). `components/years/years.test.ts` (8): the
page rendered on the real week (kicker, H1, dek, the two piles, the key, the ringed logs, the rounds, the FAQ as text,
the table, the cite) and on both made up weeks, and Alfa Slab One with its licence, imported by this route only.
Each failed once with its fix broken (sections always shown, empty kinds kept, no grouping above 60, the kicker
without its week). tsc, vitest (352), `next build` against the local site database; Playwright at 1280 and 390,
light and dark, reduced motion: no sideways scroll, no console errors; a tap (touch on the phone), an arrow key,
stack and mix played. Every number on the built page is in the week's counts or arithmetic the page shows (17, 253,
328, 378, 3,595: sums of counts in the table; 15, the CV ask's skills).
