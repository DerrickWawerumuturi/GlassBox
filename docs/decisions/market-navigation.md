# Decision: Market charts views are picked on a needle dial

**Status:** in place (2026-10-02). **Files:** `frontend/src/components/Market/NeedleDial.tsx`,
`ViewDial.tsx`, `frontend/src/lib/use-rotor.ts`, `dashboard/market/page.tsx`,
`components/dashboard/Sidebar.tsx` (`AUTO_COLLAPSE`)

## Why

The Market tab's five views (Overview, Demand, Your skills, Gaps, Landscape)
sat in a row of chips like every other page. The founder wanted the market to
read as dimensions you turn between, not a list of filters, without losing
the speed of tabs.

## How it was chosen

A lab (`/experiments/market-navigation`, dev only) built four rotary concepts
plus plain tabs: a left arc, a needle dial, an orbit and an edge wheel. The
research behind it (pie menus, Callahan et al. 1988; marking menus,
Kurtenbach & Buxton; Surface Dial; the Samsung bezel; Path; Awwwards dials)
said:

- radial menus are fast only when every item keeps a fixed place, because
  speed comes from muscle memory of direction;
- a wheel suits long lists, not five destinations;
- for five items, tabs are as fast or faster. A dial earns its place through
  character and clarity, not speed.

So the needle dial won on evidence and in use. Its labels never move, so each
view keeps its direction. The founder tried all four and picked it.

## How it works

- **Aim, don't turn.** Press anywhere on the dial and the needle swings to
  the view in that direction. Drag to slide between views; release opens it.
  Hover glides the needle to the view under the pointer as a preview.
- **Every other way works too:** click a label, scroll, arrow keys,
  Home/End, number keys. Underneath it is a plain ARIA tablist, so screen
  readers and keyboards get ordinary tabs.
- **Motion:** an ease-out with no overshoot (70 ms time constant). Reduced
  motion makes every change a jump. A one-time nudge shows a first-time
  visitor that it moves.
- **Colour:** the needle, its tip, the hub and the lit wedge are orange (the
  colour that acts). Labels stay in text tokens; ticks and track are grid
  grey. Not green ("on your CV") and not lime (a chart's one highlight).
- **Names only.** Headline numbers beside each name were tried and removed.

## Where it sits

- **Desktop:** a 260px column on the left, one window tall and sticky, so the
  dial stays at the middle of the left edge.
- **The sidebar collapses to icons on this page** to pay for that column
  (`AUTO_COLLAPSE`). With both open, Overview's two-column grid was squeezed
  at 1280px and broke at 1024px. The saved preference is never overwritten;
  expanding here lasts for the visit.
- **Phone (under 768px):** a half circle on the bottom edge, in thumb reach.
  The app's own phone nav is at the top, so they do not meet.

## What was given up

- The chips' counts (Demand 20, Your skills 7, Gaps 6).
- The dial is not faster than tabs; it should not be sold as faster.
