# 2026-10-05 — Market on a phone: a bottom tab bar

**Files:** `frontend/src/components/Market/ViewTabBar.tsx`, `ViewDial.tsx` (+ test),
`app/(product)/dashboard/market/page.tsx`.

With four views, the half-circle dial covered the charts on a phone. Under
640px the views are now a native-style tab bar: fixed to the bottom with
safe-area padding, four equal tabs, names only, the open one marked by a
short orange bar (orange acts, the needle's role), on the card surface with a
top hairline. The page leaves room so nothing hides behind it.

640–767px keeps the half dial; 768px and up keeps the dial column. All three
drive the same `?view=`. `modeFor(width)` picks the mode and is tested.

The Next dev "N" badge (dev only) sits over the first tab.
