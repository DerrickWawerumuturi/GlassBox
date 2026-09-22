# 2026-09-22 — the Market tab, one view at a time; phone table fits the screen

### Market charts

The tab was the landing flow's chart panels stacked in one long scroll, in a
green editorial style unlike the rest of the dashboard. It now has view chips
like Applications' filters (Overview, Demand, Your skills, Gaps, Landscape) and
the dashboard's own anatomy: hairline cells, mono labels, a table for gaps.
The view is kept in the URL (`?view=gaps`).

- **Colour means one thing:** green is on your CV, orange is not. Before, each
  bar's colour repeated its length. The pair is validated for colour-blind
  readers (dataviz validator, ΔE 9.6); `--chart-have` / `--chart-gap`.
- **Bars are labelled rows** (name, bar, value) with no axis to read. On a
  phone that also retired the fixed-width axis that cut names short.
- **Skill names read the way people write them:** "Python", not "Python
  (Programming Language)". The full name is kept on hover.
- **Coverage is a meter** inside its stat cell, not a donut in a section of
  its own. Footnotes and links are muted, so no third colour competes.
- **Gaps** show their bar under the name on a phone, and a Priority column
  only when some gap is high priority.
- **Landscape is a strip plot:** one lane for skills on your CV, one for
  missing ones, on a single demand axis. The old scatter's up-and-down position
  meant nothing.
- On a phone the chip row scrolls sideways, with a fade at the edge and the
  chosen chip kept in view.

Checked by rendering every view at 390px and 1280px in headless Chrome, with
views reached by clicking the chips and by loading their URLs. No page is wider
than the screen. A design review by a second model (Fable) on those screenshots
led to six changes, all made.

The landing flow's `/analysis` pages keep their panels for now.

### Applications on a phone

The table now uses a fixed layout below 640px. The status column gets the
width its chip needs, and the role column takes the rest, so both fit the
screen and long lines truncate instead of pushing status off-screen.

**Files:** `frontend/src/app/(product)/dashboard/market/page.tsx`,
`components/dashboard/MarketParts.tsx`, `components/dashboard/SkillStrip.tsx`
(new), `lib/market.ts` (`skillLabel`), `app/globals.css` (chart tokens),
`app/(product)/dashboard/applications/page.tsx`.
