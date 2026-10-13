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

## The CV button (2026-10-12)

"Compare your CV" (`components/cv-ask/CompareCv.tsx`), the one CV action on
the landing hero, a market page and the years page, is the shadcn button at
its own radius, `rounded-lg` (`--radius-lg`, 8px), 44px tall, 16px text,
orange (it acts). Not the pill (`rounded-full`) the older CV buttons use:
founder, 12 Oct 2026. Not a new token. The older pill buttons stay as they are.

**13 Oct: nothing under it** (founder: the line under it was too much text).
The component renders no element under the button at rest; while a scan runs,
one 12px mono status line ("Reading your CV. About a minute.") shows. The
trust facts live in the sheet the button opens. The "Free. One PDF. No account
needed." line beside "Add your CV" in Inside Glassbox is gone too.

**13 Oct, decided: the peek** (GitHub issue #6, founder's pick). The founder
didn't like the font, size or shape. Two candidates from his other app stash
(A pressed and B quiet, 56 and 52px, a hard offset shadow or a glow) were too
big. He asked for cosy and welcoming with a little personality, pointing at
albo.inc's header, where a small character peeks out of the A: a small,
delightful touch tied to the brand mark. Of three smaller looks (C peek, D a
CV page sliding into a glass box, E a Caveat note beside the button) he
picked **C**, and asked that its size and type stay exactly as shown. Review
of the round: `docs/local/cosy-button-review.html`.

**The peek family.** One style, `peek peek-button` in
`components/brand/peek.css`, with the glyph `PeekGlyph` (`brand/Peek.tsx`)
as the button's first child:

- 44px tall, padding 0 20px 0 15px, radius 12px, Space Grotesk 600 at 15px,
  tracking -0.005em, white on the orange in both themes, a lit top edge
  (inset 1px white at 20%) and a soft shadow in the orange. Hover lightens
  the orange 6%; a press sits it down 1px at 98.5%.
- The glyph is the wordmark's box O at 20px with its dot inside, in the text
  colour. On hover or keyboard focus the dot hops up 11 of 20 units and looks
  over the rim (it is drawn under the rim, so it comes from inside); a press
  drops it back. With reduced motion the dot still peeks, it just doesn't
  travel.
- **Who wears it: every orange button that takes a CV into the box, and only
  those.** Today: "Compare your CV" in the hero, on a market page and on the
  years page (`CompareCv`); "Add your CV" on /product (`AddCvButton`); "Add
  your CV" in Inside Glassbox (`Showcase`); "Find out" in the closing CV
  section (`CvSection`); in the CV sheet, "See them" and the kept CV button
  (`CvSheet`, full width). One primary action per screen keeps the moment
  special.
- **Who stays quiet, and why:** the header's "Try it out" in the Product menu
  and the phone menu (the header's mono capitals in a thin outline with a
  return key mark, founder 8 Oct; a 44px display face button would be a
  different header); "See your results" in the closing section (it goes
  somewhere, so it keeps its arrow); the dashboard's example banner button
  (a slim sticky bar; the dashboard stays quiet); sign in, sign up, the
  skills form, the dashboard dialogs (admin, not the CV). Secondary, ghost
  and link buttons, tabs, chips and form controls get shadcn's gentle press
  and nothing more.

**The wordmark's moment** (`brand/Logo.tsx`, `logo.css`): the header passes
`peek` and the dot hops up and looks over the rim of the box O, once about a
second after the page loads and then on hover or keyboard focus of the link;
with reduced motion nothing moves. The footer, the sidebar and the market
title bar render the same wordmark still. The logo files and the favicon are
untouched.

**Fixed with it:** `Logo.tsx` had copied the box O's path without the
outlined file's `fill-rule: evenodd`, so the inner square filled and the
header, footer, sidebar and title bar showed a solid block with the dot on
it. The O now renders as the rim with the dot inside, as the brand book
draws it. The OG and share images read the SVG files in `public/brand`,
which carry the rule, so they were right all along; the favicon and app
icons are the symbol, not the wordmark.
