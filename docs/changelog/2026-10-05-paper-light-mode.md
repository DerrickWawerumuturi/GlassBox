# 2026-10-05 — Paper light mode and a Theme control

**Files:** `frontend/src/app/globals.css`, `lib/theme.ts` (+ test), `components/ThemeMenu.tsx`,
`app/layout.tsx`, `components/Navbar.tsx`, `components/dashboard/Sidebar.tsx`,
`components/dashboard/Bridges.tsx`, `DemandBars.tsx`, `components/Market/ChartPatterns.tsx`.

## Paper

A soft warm white for light mode, never pure white. Three variants were
compared (a "Folk", b "Brown paper" in the desk's hue, c "Near white"); the
founder picked **a "Folk"**: page `#f7f3ef`, cards `#fbf9f6`, ink `#21201c`,
muted `#63635e`, warm hairlines. b, c and the `?paper=` preview are removed.
Decision: `decisions/design-system.md`, "Light mode: paper".

Brand colours on paper (contrast measured in the browser):

- Green "have": a darker mark (5.3:1) and a darker text ink `--chart-have-ink` (7.2:1). Bridges' names use it (mint on the desk).
- Orange: a touch deeper on paper so white button text reads (4.7:1). Still only on actions.
- Lime is 1.2:1 on cream: lime pills and the "1st" badge get a lime-ink hairline (`--accent-lime-edge`); lime text turns to the lime ink.
- Gaps stay grey and hatched (4:1).
- Chart panels re-scope to dark alphas on paper; the plot well is a token (`--chart-well`) instead of a hardcoded black.

## Theme control

Theme: Light / Dark / System as a Sun / Moon / Monitor segmented row in both
account menus (shadcn mode-toggle pattern, menu radio items, labelled). Kept
in localStorage (try/catch), System by default. A small script in `<head>`
sets the class before paint, so there is no flash; switching turns
transitions off for a frame. next-themes was not used: it renders its script
from a client component, which React 19 warns about in dev.

Note: with System as the default, people on a light OS see paper once this ships.
