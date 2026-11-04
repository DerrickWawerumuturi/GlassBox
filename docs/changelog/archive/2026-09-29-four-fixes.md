# 2026-09-29 — a status that wouldn't change, a landing page that wouldn't stay, an empty Opportunities

Four bugs found by using the dashboard on a phone.

---

### The status menu ignored the tap

`StatusDisclosure` renders its menu inside the row, and the row starts a
450 ms long-press timer on `touchstart`. A tap that rested a moment longer on
"Withdrawn" fired the long press: the action sheet opened and `endPress`
cancelled the touch, so the status never changed.

`startPress` now ignores a touch that lands on a control (`button, a, input,
label, select`). The long press still opens the sheet from anywhere else in
the row.

### A closed row faded the control the user had just used

Rejected and withdrawn rows were drawn at `opacity-55`, which dimmed the whole
row, the status menu included. They now read quieter through
`text-muted-foreground`, and every chip and control stays at full strength.

### Opportunities started empty, then jumped

Two causes:

- **The cache stored nothing.** The whole list is hundreds of jobs; over the
  browser's storage quota `setItem` throws and the `catch` swallowed it, so
  there was never a cached list to paint. Only the first 40 rows are cached
  now, and a failed write clears the key instead of leaving a stale one.
- **The list waited for the server.** It now paints the cached rows at once.
  Jobs that arrive afterwards are announced with a pill ("3 new jobs", with the
  companies' logos) and are shown when the reader taps it, so nothing shifts
  under a finger. An explicit refresh, or a CV edit, still replaces the list.

The API's cold start also played a part: loading the analysis models on start-up
holds the GIL, so the first dashboard requests queued behind it on a 2 vCPU
container. The warm-up now waits `JOBRADAR_WARM_AFTER_SECONDS` (20 s) —
`/analyze` still loads the stack itself if it asks first.

### The landing page bounced signed-in visitors

`LandingRedirect` sent anyone with a session to `/dashboard` on sight, so the
marketing page could only be seen by signing out. It is deleted. The header's
dashboard link now shows for anyone signed in (before, it needed a CV or an
analysis cached in that browser).

### Also

The "what Jobradar does" cards point at the new screenshots
(`/assets/process01–04.png`), in order, in a 16:10 frame that suits their shape;
the old per-image crops went with the old files.

**Files:** `frontend/src/app/(product)/dashboard/applications/page.tsx`,
`opportunities/page.tsx`, `lib/opportunities-store.tsx`, `components/Navbar.tsx`,
`components/About.tsx`, `app/(landing)/page.tsx`,
`components/LandingRedirect.tsx` (deleted), `backend/main.py`.
