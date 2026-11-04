# 2026-10-02 — the Market tab's charts in the brand, and a warmer desk

The approved designs in `docs/brand/charts.html` (round 2, 29 Sep), built into
the dashboard's Market tab. Every view is now the same object: a card
panel, a framed graph-paper plot, a short uppercase title, a mono
subtitle with the orange slash and a postings chip, a legend, two "Good to
know" bullets, a table twin and tooltips. Orange never marks data any more.

---

### After review: a warmer ground, plain card panels

**File:** `frontend/src/app/globals.css`

- The dark ground was near-black, and the panels cut out of it harshly
  (founder's review). It is now a warm charcoal, `oklch(0.205 0.006 70)`, with
  card, popover, muted, accent and sidebar lifted to match in the same hue. This
  changes every dashboard page; Overview, Opportunities, Applications and Skill
  gaps were rendered at 1280 and 390 to check.
- The chart panels were forest green. Next to the rest of the app's charcoal
  cards they read as another product. `--panel-chart*` now points at `--card`
  with neutral inks, and the deep drop shadow is gone. Green is kept for the
  data: on your CV.
- The light theme's `--panel-chart*` is unchanged. The app ships dark; paper
  light mode is its own later step.

### Step 1: type and colour roles (already in the tree, uncommitted)

**Files:** `frontend/src/app/layout.tsx`, `frontend/src/app/globals.css`,
`frontend/src/components/dashboard/bits.tsx`,
`frontend/src/app/(product)/dashboard/page.tsx`

- Schibsted Grotesk is loaded and is `--font-sans`, the body default. Space
  Grotesk stays the heading face; `font-heading` is now on the dashboard
  greeting h1 and `PageBar`'s h1.
- The seven-step type scale, `text-display` … `text-label`, as `@theme`
  tokens with line heights.
- Chart colour roles for both themes: `--chart-have` (green, on your CV),
  `--chart-gap` (neutral, not yet; always with a hatch or a ring) and
  `--chart-ink` (market-only data). `--chart-gap` was `var(--primary)`.
- The `bar-gap` utility: the CSS hatch for "not yet". Its comment pointed at
  `components/Market/ChartPatterns`, which did not exist. It does now (below).

### Step 2: the five views rebuilt

**Files:** `frontend/src/app/(product)/dashboard/market/page.tsx` (216 lines),
`frontend/src/components/dashboard/MarketParts.tsx` (262),
`frontend/src/components/dashboard/DemandBars.tsx` (116, new),
`frontend/src/components/dashboard/GapTally.tsx` (123, new),
`frontend/src/components/dashboard/SkillStrip.tsx` (246, rewritten),
`frontend/src/components/Market/ChartPatterns.tsx` (73, new),
`frontend/src/lib/chart-labels.ts` (114, new), `frontend/src/lib/market.ts`,
`frontend/src/app/globals.css`

- **Panel.** `--panel-chart*` tokens (ground, border, three inks, grid, major
  grid, frame) and a `.chart-panel-desk` colourway that re-scopes the surface
  tokens the way `.chart-panel-green` does. `ChartPanel` in `MarketParts.tsx`
  is the chrome every view uses; `StatTiles` the overview's numbers.
- **Charts are hand-built SVG**, not Recharts. The three charts need label
  measurement, tally geometry and a label placer that Recharts cannot do, and
  the mono font makes measurement a multiplication (0.6em a character).
  `ChartPatterns.tsx` holds the shared `<pattern>` hatch (`HatchDefs`, with a
  document-unique id so several charts can share a page) and the `PlotFrame`.
- **Demand**, "What companies ask for": ranked bars, top 12 with "Show all",
  "count/N" at the tips, green for yours and the hatch for not yet, one lime
  "1st" badge on the user's most asked-for skill when it is among the rows.
  The badge sits after the "count/N" label at every width, and the axis
  leaves room for it. A first build put it inside the bar's tip on phones,
  where it covered the bar end and the count; caught in review.
- **Your skills**: the same bars, all green.
- **Gaps**, "Not on your CV yet": the tally. One mark per posting, grouped in
  fives, the postings that ask drawn solid. The stroke pitch shrinks to fit
  the width, and a scan too wide for one line wraps its groups so every
  posting keeps its own mark. No lime, no red.
- **Landscape**, "Where your skills sit": two lanes on one axis, every
  "yours" dot labelled, the top three "not yet" too, one lime pill on the
  most-asked skill the CV lacks, a "+N more, 12% to 24%" note for the rest.
  Ties share one dot column and one label. `chart-labels.ts` carries the
  design's backtracking placer (three anchors, up to three lanes, leaders
  never cross a label). Under 600px the axis stands on the left, both lanes
  beside it and every label to its right, spread apart in one column
  (`spreadLabels`) so two skills with the same count can no longer overlap.
- **Overview**: three tiles (coverage as a hero number with a tally of the
  top skills in demand order, postings, gaps) and a compact preview of each
  chart linking to its chip. The `?view=` URL behaviour is unchanged.
- **Accessibility**: every hit area is focusable with a name; the tooltip
  follows focus as well as the pointer; each chart has a "View as table"
  twin. Nothing in a chart is set below 12px (checked in the DOM).
- `skillMarks()` in `market.ts` is the one transform the charts read: skills
  in demand order with their count, whole-number share and whether the CV
  has them.

### Docs

- `decisions/design-system.md`: the accent no longer drives the Market
  charts; a "Chart grammar" section with the colour roles; Schibsted Grotesk
  and the type scale under Typography.
- `architecture/frontend.md`: the new files and the styling paragraph.

### Verified

- `npx tsc --noEmit -p .` passes.
- `npx next build` passes.
- All five views rendered with the 58-posting fixture at 1280 and 390, scroll
  width equal to the viewport at both, no label collisions, nothing under
  12px inside a panel. Hover and keyboard tooltips and the table twin checked
  at 1280.

### Not verified

- Widths between 390 and 1280 (tablets, a narrow desktop window) were not
  rendered; the layouts switch at 520px (bars, tally) and 600px (landscape).
- Scans with far more postings (the tally wraps, the bars' "Show all" grows)
  or with no skills on the CV (the empty states still show) were reasoned
  through, not rendered.
- The shared dashboard chrome (`ViewChip` counts, `PageBar` meta) still has
  10-11px mono labels. It is used by every dashboard page and was left as is.
- No new data colour was introduced, so the palette validator was not rerun.
