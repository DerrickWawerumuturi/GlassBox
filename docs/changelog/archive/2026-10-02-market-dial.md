# 2026-10-02 — Market charts: a needle dial instead of chips

The dial from the navigation lab is now the Market tab's view selector
(`decisions/market-navigation.md`).

**Files:**
- `frontend/src/components/Market/NeedleDial.tsx` (moved from the lab)
- `frontend/src/lib/use-rotor.ts` (moved from the lab's `useRotor.ts`)
- `frontend/src/components/Market/ViewDial.tsx` (new: desktop column or phone band)
- `frontend/src/app/(product)/dashboard/market/page.tsx`: the chip toolbar
  and its scroll-into-view effect are gone; the dial drives the same
  `?view=` URL; the views sit in a `tabpanel` the dial controls.
- `frontend/src/components/dashboard/Sidebar.tsx`: `AUTO_COLLAPSE` now holds
  `/dashboard/market`.
- `frontend/src/app/(product)/dashboard/market-dial/` (the preview route)
  deleted; the lab imports the dial from its new home.

## Checked

- tsc and `next build` pass.
- The real tab at 1280 and 390: all five views, no sideways scroll.
- Sidebar, with the saved preference "open": Overview 240px, Market 66px,
  Expand gives 240px without saving, back on Overview 240px.
- The dial sits at the middle of the left edge (centre 454px of 860, 406px
  after scrolling).
- Click probe on the real tab: each click lights the new label once, the
  needle never reverses, one URL change per click; the human-length click
  that showed the old flicker is clean.

## Not checked

- Real touch and trackpads (simulated input only).
- VoiceOver.
- A scan with no market (the empty state shows no dial; reasoned, not rendered).
