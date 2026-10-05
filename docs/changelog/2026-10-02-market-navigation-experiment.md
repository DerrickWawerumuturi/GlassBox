# 2026-10-02 — Market Charts navigation experiment (not in the app)

A lab for rotary navigation in Market Charts, built to be tried, not shipped.
The Market tab and the global navigation are untouched.

**Where:** `frontend/src/app/experiments/market-navigation/` (open
`http://localhost:3000/experiments/market-navigation` with `npm run dev`).
The page calls `notFound()` in production and is `noindex`, so a commit
cannot ship it (checked: the production build serves it as a 404).

---

### What is in it

- **A · Left arc.** A big arc anchored left; the sections ride it and the
  active one sits level with the chart. Turns; ends are fixed.
- **B · Needle dial.** The labels never move; a needle turns to the active
  one. Added after the research: marking-menu studies (Kurtenbach & Buxton)
  found speed comes from muscle memory of fixed positions, which a turning
  ring takes away. B tests that against A, C and D.
- **C · Orbit.** The sections orbit an invisible centre; the front is active,
  the rest shrink and fade by depth. Wraps round.
- **D · Edge wheel.** A wheel far bigger than the screen; only its rim shows,
  marked like a ruler, labels engraved inside it. Turns; ends are fixed.
- **Baseline · Plain tabs**, for comparison.
- **Speed test:** six timed "Go to X" jumps per concept, median shown. Kept
  in that browser tab's sessionStorage only.

All four share one engine (`_lab/useRotor.ts`): drag with a little momentum,
snap to the nearest section, wheel and trackpad (accumulated, one section a
step), arrow keys, Home/End, keys 1–6, click. The selection commits on
release, not mid-drag, so the chart does not flicker. Each concept nudges
once when it appears, to show it turns. Reduced motion turns every change
into a jump.

Underneath every concept is a plain ARIA tablist of real buttons (the curve
is only their position), so screen readers and keyboards get ordinary tabs.

Phones: A and D move to a bottom arc, B to a half circle on the bottom edge,
C lies flat; you swipe sideways.

### Checked

- tsc and `next build` pass.
- A script (`docs/local/render/lab.mjs`) drove every concept at 1280 and 390
  through keys, arrows, wheel, drag and click: every input moves the
  selection, nothing scrolls sideways, no console errors.
- Found by that script: in A and D, a view that has turned off-screen cannot
  be clicked; you turn, scroll or press its number. B, C and the tabs never
  hide a view.

### Not checked

- Real touch devices (the script emulates a phone width, with a mouse).
- Screen readers (the structure is a standard tablist, not tried with
  VoiceOver).
- Next's dev-only "N" badge sits over the bottom-left of the phone bands in
  development; it is not in production builds.

### B refined (founder picked the needle dial)

**Files:** `_lab/NeedleDial.tsx` (new, B only), `_lab/useRotor.ts`,
`_lab/concepts.ts`, `_lab/RingNav.tsx` (B's old code removed), `_lab/Lab.tsx`

- **Aim, don't turn.** Press anywhere on the dial and the needle swings to
  the view in that direction; drag to slide between views; release opens it.
  Nothing opens until release. Turning the needle was B's slowest input.
- **Hover glides the needle** to the view under the pointer, as a preview,
  and back when the pointer leaves. Hover never opens a view.
- **Smooth motion.** The spring bounced; it is now an ease-out with a 70 ms
  time constant and no overshoot (it affects all four concepts). A probe
  (`docs/local/render/needle-probe.mjs`) samples the needle every frame on a
  hover sweep: no overshoot, no backward frames, settled about 0.5 s after
  the sweep starts. The probe caught one bug on the way: right after a
  retarget, the frame timestamp can precede the restart time, and the
  negative step twitched the needle backwards; the step is now clamped.
- A soft wedge lights the active view; minor ticks between views.
- Names only. Headline numbers beside each name were tried and removed by
  the founder.
- The desktop dial is sticky, so it stays in view beside a long chart.

### Brand colour, and a preview on the real page

- **Orange needle.** Needle, tip, hub and the lit wedge use `--primary` (orange
  acts); labels stay in text tokens; ticks and track stay grid grey. Not green
  ("on your CV") and not lime (a chart's one highlight).
- `NeedleDial` now takes its items, radius and controlled-panel id as props.
- **Preview route:** `/dashboard/market-dial` (dev only, 404 in production).
  It renders the real Market page untouched inside the real dashboard shell,
  hides its chips with CSS, and puts the dial in a left column under the
  title bar. The dial drives the same `?view=` URL as the chips. Rendered at
  1440, 1280 (sidebar open and collapsed), 1024 and 390; aiming at Gaps opens
  the real Gaps chart at every desktop width; no sideways scroll.
- **What it showed:** the dial costs 260px. With the sidebar open, that
  squeezes Overview's two-column grid (panels about 345px at 1280) and breaks
  it at 1024 (titles wrap to three lines). With the sidebar collapsed to
  icons, 1280 looks like today's tab. Undecided: how to pay for the width.

### Sidebar collapses for the dial; the dial moves left-centre; the click glitch

**Files:** `frontend/src/components/dashboard/Sidebar.tsx`, `_lab/useRotor.ts`,
`_lab/NeedleDial.tsx`, `dashboard/market-dial/_preview/DialPreview.tsx`

- **Sidebar auto-collapse (founder's call).** `AUTO_COLLAPSE` lists pages that
  open with the sidebar on icons: only `/dashboard/market-dial` for now, and
  the Market tab once the dial ships there. The saved preference is never
  overwritten: expanding on such a page lasts for the visit, and other pages
  keep the saved setting. Checked with the preference "open": Overview 240px,
  dial page 66px, Expand gives 240px and the saved value stays "0", back on
  Overview 240px, dial page again 66px.
- **Left-centre.** The dial's column is one window tall and sticky, so the
  dial sits at the middle of the left edge (centre 454px of 860 at the top,
  406px after scrolling).
- **The click glitch, three causes:**
  1. On release the dial fell back to the parent's index, which comes from
     the URL a few frames later, so the old label lit up again before the new
     one. The dial now keeps its own selection, set the moment you commit.
     A probe with a human-length click (120 ms press) read
     `Demand > Your skills > Demand > Your skills` before and
     `Demand > Your skills` after. (The probe's first version clicked within
     one frame and missed it; the press-hold step was added for that.)
  2. The rotor's sync effect depended on `onSelect`, which the preview
     recreates each render, so a re-render mid-hover re-sent the current view
     to the URL and snapped the needle back. `goTo`/`step` now read
     `onSelect` from a ref, and the effect follows only a genuinely new index
     without echoing it.
  3. The active label switched face and size (14 to 18px, Space Grotesk), so
     the text jumped. All labels now share one face and size; active is
     weight and ink, eased over 200 ms.
- The teaching nudge plays once per browser (`localStorage`
  `needle-dial-nudged`), not on every visit, where it read as a twitch.
- Re-run after the changes: every lab concept at 1280 and 390, the dial
  tests, the hover probe (no overshoot, no backward frames), tsc and
  `next build` (both experiment routes 404 in production).
