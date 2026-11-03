# Shared visual language

Filled in after inspecting the repository on 14 Oct 2026. Sources: `frontend/src/app/globals.css`, `docs/decisions/design-system.md`, `docs/brand/guidelines.html`, `frontend/src/components/market-page/`.

## How the current system is implemented

- **Tokens in CSS, no config.** Tailwind v4, CSS first. `globals.css` declares every token: `:root` is paper light (`#f7f3ef` page, `#fbf9f6` card, `#21201c` ink), `.dark` is warm charcoal (`oklch(0.205 0.006 70)`). `@theme inline` maps them to utilities (`bg-card`, `text-muted-foreground`, `bg-accent-lime`). Theme is set per user (light, dark, system).
- **Fonts, self hosted** in `src/app/fonts/`: Space Grotesk (display, `font-heading`), Schibsted Grotesk (UI body, `font-sans`), JetBrains Mono (labels, `font-mono`), Caveat (notes, `font-hand`), Source Serif 4 (reading text on market pages only, `font-read`, loaded in `app/market/layout.tsx`).
- **Type scale tokens** `--text-display` 56 / h1 40 / h2 28 / h3 20 / body 16 / small 14 / label 12. Market pages use their own measured sizes (H1 36/56, dek 20/23, reading 18/19, chart titles 16 uppercase, mono 12). **Keep existing sizes.**
- **Colour roles** (data never wears orange): green `--chart-have` counts what you have; grey hatch `--chart-gap` is "not on your CV yet" or "not stated"; neutral ink `--chart-ink` for market only data; lime `--accent-lime` is the one highlight per chart; orange `--primary` acts (buttons, links, the logo dot). Soft red only for a missing skill on one job.
- **Charts are server HTML.** `Figures.tsx` (`Figure`, `BarRows`, `PairRows`, `Stacked`, `TableTwin`) and `LeadSquares.tsx` render divs with `role="img"` and a data `aria-label`, plus a table twin. SVG charts use `components/Market/ChartPatterns.tsx` (hatch, plot frame). Recharts is installed but only the legacy `/analysis` charts use it. `motion` is installed and used in the dashboard; the market pages use CSS transitions with `prefers-reduced-motion` handled in `editorial.module.css`.
- **The market page shell** `MarketArticle.tsx`: breadcrumb, H1 as the finding, serif dek, byline with share actions, lead visual (one square per job), framing, "At a glance" with copy links, finding sections (`StorySections.tsx`), FAQ, CV ask, "How we counted", rail. `YearsArticle.tsx` is a shorter variant: pull stat, one figure, questions, method.
- **Data path.** Pages are static (`revalidate = false`), read the published week from Neon with the read only role, rebuild on the Monday refresh or deploy, and never call the Azure API. Share images are `opengraph-image.tsx` per route.

## Shared between product and publication (fixed)

- The wordmark and the peek button family (`components/brand`), the navbar and footer.
- The five fonts and their roles. Reading text in Source Serif 4.
- The colour roles above, in both themes. Orange never marks data.
- Source line under every figure: "Source: Glassbox count, week of …", a link to how we counted, a cite line.
- Numbers name what they count. Denominators shown. "Not stated" is hatched grey everywhere.
- The CV ask (`MarketCvAsk`) as the route into the product, at the end, once.
- Accessibility floor: `role="img"` with a full text label, a table twin for every chart, keyboard focus, reduced motion.

## A story may set its own

- Page composition and widths (the product column is 680px with a 300px rail; a story may go wider, full bleed or narrower).
- Chart geometry and annotation: unit charts, ladders, dumbbells, typographic charts, hand drawn marks, custom SVG.
- Display treatment: one display size moment, mono annotations, Caveat notes used as a storyteller's hand.
- Pacing and scroll sequence, including stepped reveals when they explain.
- An illustration style, if the brief gives a reason (see `REFERENCE_LIBRARY.md`, Chalabi).
- **Its own creative style** (founder, 15 Oct 2026): every story may look different, as every Pudding story does. Objects, palette and illustration style belong to the story; the fixed list above does not change.
- A second data colour, only with a reason written in the brief, and never orange.

## Constraints that matter

- Files ≤300 lines preferred; split above 400. Tests: `tsc`, vitest, `next build`. Backend counts need a test that fails without the fix.
- Public pages never call the API; story data is computed by the Monday publication (`backend/src/jobpool/market_pages.py`) and read from `market_publications`. A story that needs a new count adds it there, with a test, and ships only after the next publication holds it.
- Every page works at 390px with no sideways scroll, in both themes.
- Share image per story (`opengraph-image.tsx`), 1200×630, drawn from the same data.
- Font files are already loaded; no new web font without a reason and the OFL file beside it.
- Fonts: nothing in a chart below 12px.

## Editorial type (founder, 15 Oct 2026)
Visual essays set headings and reading text in **Hanken Grotesk** (self hosted, OFL beside the file): reading text about 20px (18px on phones) in a 600px column, headings 600 to 700 weight, captions in italic 15px under each figure. Caveat for hand notes. Space Grotesk and JetBrains Mono stay in the product, not in the essays. Source Serif 4 stays on the market pages until the founder says otherwise.

## Story palette (first essay, proposed)
Data colours chosen for the story, each with a meaning stated in a key: white for "no level word", sky for level II or mid, lavender for senior or staff, yellow for associate or level I, lime for junior. Orange still never marks data; it is the button and the pen notes. Illustration (the sign, the dolls) may use its own colours.

## Market home (experiment, 15 Oct 2026)
Prototype `docs/local/editorial-sprint/market-home/`: /market after The Pudding's home. Filters as sticker chips with drawn icons (one swiping row on phones), three columns of square covers (two on tablets, one on phones), a pill and a date above each, a short Hanken title and the finding below. Each cover is drawn in its story's own style, and its object carries the story's number: a cut paper pie (entry level), a rail of tags (years), highlighted classifieds (software engineering), chat bubbles in a two colour print (AI), a blueprint measuring cylinder (machine learning), a see-saw (DevOps), tally marks under a lens on graph paper (method). The CV ask sits in the grid where The Pudding puts its newsletter. Numbers are the live pages' own.
