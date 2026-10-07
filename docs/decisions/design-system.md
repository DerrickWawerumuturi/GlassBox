# Decision: design system

**Files:** `src/app/globals.css`, `src/app/layout.tsx`

## Direction

Dark editorial data-visualization: a warm charcoal ground, one vivid accent, bold
tight display type against monospace captions, hairline rules.

The ground was near-black (`oklch(0.155 0.004 260)`) until 2026-10-02. Against it
every panel cut out harshly. It is now `oklch(0.205 0.006 70)`, and the surfaces
(card, popover, muted, sidebar) step from it in the same warm hue.

Chosen from two references. The rejected alternative was a warm off-white SaaS
analysis; density and card-layering ideas were borrowed from it, but the ground
and the type treatment come from the editorial reference.

## Tokens live in CSS, not a config file

Tailwind v4 is CSS-first. **There is no `tailwind.config`.** Every token is
declared in `src/app/globals.css`:

- `@theme inline` — maps tokens to utility names. A `--color-foo` here generates
  `bg-foo`, `text-foo`, `ring-foo`.
- `:root` — light values: "paper" (see Light mode below).
- `.dark` — the shipping palette.

The app is **locked to dark** via `className="dark"` on `<html>` in
`layout.tsx`. `next-themes` is installed but only referenced by `ui/sonner.tsx`;
there is no toggle, deliberately — committing to one look means it can be good,
rather than acceptable in two.

## The palette

| Role | Value |
|---|---|
| Ground | `oklch(0.155 0.004 260)` — near-black |
| Surfaces | three raised steps: card → popover → muted |
| Hairline | `oklch(1 0 0 / 8%)` |
| Text | warm white, plus a muted step |
| **Accent** | **`#f5532a`** orange-red |

The accent drives `--primary` and the legacy `--chart-1…5` ramp that the
anonymous `/analysis` charts still read. It no longer drives the Market tab's
charts: there, orange is the brand and never marks data (see "Chart grammar"
below). Accent use is restricted to: the primary CTA, the active-tab indicator,
section heading ticks, small numerals and the slash in a chart subtitle.
Everywhere else is foreground/muted ink. **Text wears text tokens, never the
series colour.**

## Chart grammar (Market tab, 2026-10-02)

The approved designs are `docs/brand/charts.html`. Every chart is an object on
the desk, and every chart is the same object:

- the plain card surface every other section uses (`.chart-panel.chart-panel-desk`,
  tokens `--panel-chart*`, which point at `--card`). The first build used a
  forest green-black panel; next to the rest of the app it looked like another
  product, so colour stays in the data (green = yours) and off the ground;
- a rounded plot frame with a fine graph-paper grid
  (`components/Market/ChartPatterns.tsx`, `PlotFrame`);
- a short uppercase title in Space Grotesk, five words or fewer;
- a mono subtitle: the finding, an orange slash, a "N postings" chip. The
  slash is the only orange in a chart;
- a legend, a "Good to know" row of at most two bullets, a "View as table"
  twin, and hover or keyboard tooltips on every mark.

Colour roles, each a token in `globals.css`:

| Role | Token | Means |
|---|---|---|
| Green, solid | `--chart-have` | on your CV |
| Neutral hatch (`.bar-gap`, `HatchDefs`) or hollow ring | `--chart-gap` | not on your CV yet |
| Neutral ink | `--chart-ink` | market-only data, no "you" in it |
| Lime | `--accent-lime` | one highlighter per chart: a "1st" badge or one pill |
| Orange | `--primary` | never in data |

`--chart-have` and `--chart-gap` are validated as a pair for colour-blind
separation on the panel ground; the hatch and the ring are the second
encoding, so the pair never relies on hue alone. Nothing in a chart is set
below 12px: ticks are 12px regular mono, titles 18-20px, hero numbers 40px.

## Charts must read tokens

```tsx
fill="var(--chart-3)"      // correct
fill="#f5532a"             // never
```

Recharts accepts CSS custom properties directly. Hard-coding a colour in a chart
breaks the one-place-to-change property that makes this system worth having.

## Light mode: paper (2026-10-05)

The founder picked "Folk" of three paper variants: page `#f7f3ef`, cards
`#fbf9f6`, ink `#21201c`, muted `#63635e`, warm hairlines. Never pure white.
Theme (Light / Dark / System, System by default) sits in the account menu;
`lib/theme.ts` sets the class before paint.

The brand colours hold on paper with their own light values: a darker
"have" green for marks and for text (`--chart-have-ink`), orange a touch
deeper so white button text reads, and a lime-ink hairline on lime pills
(`--accent-lime-edge`), because lime is barely lighter than cream. Lime text
turns to the lime ink. Chart panels re-scope to dark alphas; the plot well is
`--chart-well`. Measured in `docs/changelog/2026-10-05-paper-light-mode.md`.

## Missing for one job: soft red (2026-10-05)

One exception to "gaps are grey and hatched". On Opportunities, where a
missing skill decides whether one specific job fits, it is a soft red chip:
outline and faint fill in `--missing` (oklch 0.63 0.2 25 on the desk), text in
`--missing-ink` for 4.5:1, and a minus icon so colour is not the only signal.
It is never the action orange. Gaps in the market (charts, Overview, Your
skills, /analysis) stay grey and hatched or dashed.

## Typography

- **Space Grotesk** (`font-space`, `font-heading`) — display. Bold, tight,
  uppercase for headings; `font-heading` on every h1 and chart title.
- **Schibsted Grotesk** (`font-sans`, the body default) — reading text.
  Warmer and calmer at 14-16px than Space Grotesk, whose quirks suit headlines.
- **JetBrains Mono** (`font-mono`) — every number, axis tick, unit, percent
  label, legend entry and small-caps label.

The type scale is seven tokens in `@theme`: `text-display` (3.5rem), `text-h1`
(2.5rem), `text-h2` (1.75rem), `text-h3` (1.25rem), `text-body` (1rem),
`text-small` (0.875rem) and `text-label` (0.75rem), each with its line height.
`text-label` is the floor; nothing new goes below 12px.

Numbers are treated as the hero. The mono/display contrast is most of what makes
the reference read as technical rather than generic.

**2026-10-05:** the four faces are self-hosted (`frontend/src/app/fonts`,
`next/font/local`), so the dev server no longer falls back to Arial. The
seven-step scale (56/40/28/20/16/14/12) is a guide for new work. Existing
sizes stay as they are, by the founder's call on 2026-10-05: a sweep onto the
scale was tried and reverted. The sidebar keeps its compact sizes.

**2026-10-07: Source Serif 4 for editorial reading text.** The market pages
read as reporting, and their long paragraphs, deks, captions and findings are
set in Source Serif 4 (`font-read`): 19px on a desktop, 18px on a phone,
line height 1.7. Self hosted (`app/fonts/source-serif-4.woff2`, OFL beside
it), cut with fontTools to Latin + Latin Extended, weights 400-700, optical
size pinned at 20 (72 KB). Loaded by `app/market/layout.tsx` only, so no other
page pays for it. Headlines stay Space Grotesk, labels and numbers JetBrains
Mono, and the product keeps Schibsted Grotesk.

## Editorial figure grammar (market pages, 2026-10-07)

The chart grammar above, as a figure in a story (`components/market-page/Figures.tsx`):

- a `<figure>` on the card surface, radius 12, padding 22;
- an uppercase Space Grotesk title, five words or fewer ("Languages they name");
- a mono subtitle: what the share is of, the orange slash, then job chips
  ("135 jobs"); the slash is the only orange in the figure;
- the picture as server HTML, not a client chart: `role="img"` and an
  `aria-label` that reads the data aloud, so it works with no script, in a
  screenshot and to a screen reader;
- neutral ink bars; the comparison set as a grey tick (`--chart-gap`) or a
  faint bar (`foreground/35`); lime on one row only; hatched for "not stated"
  or "no country";
- a Source Serif caption that says how to read it, then a mono source line
  ("Source: Glassbox count, 7 October 2026 · how we count");
- a "View as table" twin where a chart has many rows.

After a visitor's own scan a skill's label carries green (on the CV) or a grey
dashed square (not yet); nothing else in the figure changes colour. A pull
stat ("52 of 69", Space Grotesk 88px) is the one big number moment besides the
lead visual. Sections are far apart (112px desktop, 80 phone), and the lead
visual sits 132px (88 on a phone) under the byline.

## A bug worth remembering

`--font-sans` was previously defined as `var(--font-sans)` — self-referential,
so it resolved to nothing and the whole `font-sans` stack silently fell back to
the browser default. `--font-mono` was never mapped at all despite the font
being loaded.

Both are fixed. Self-referential CSS custom properties fail silently: no
console error, no build failure, just a font that is quietly wrong.

## Working within this

- Add tokens to `globals.css`; do not introduce component-level colour.
- New shadcn components are built on `@base-ui/react`, not Radix — `render`
  props rather than `asChild`, `Backdrop`/`Popup` rather than `Overlay`/
  `Content`, `data-open:`/`data-closed:` state variants.
- Layered surfaces, not borders, carry hierarchy. Borders are hairlines.

## Not verified

None of this has been looked at in a browser. It is compiler-verified only.
Outstanding visual checks: the hero image against the near-black card (a
light-toned illustration may fight it), the donut's centred label, legend
placement on the landscape chart, and the 375px breakpoint where the compact
axis engages.
