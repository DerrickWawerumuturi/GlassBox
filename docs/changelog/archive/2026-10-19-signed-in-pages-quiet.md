# 2026-10-19: signed in visits to public pages no longer wake the API (fixes #15)

The founder asked on 19 Oct 2026 why the API still woke so often after the 12 Oct fix. The container app's own
logs answered it: scanners, signed in page loads, deploy health checks, and no market rebuilds since 12 Oct.
Decision: `docs/decisions/deployment.md` ("Signed in page loads stop waking the API"). Review page:
`docs/local/signed-in-quiet-review.html`.

## The change

- **`lib/account-sync.ts`**: `isProductPath` (`/dashboard`, `/analysis`, `/onboarding` and below) and
  `shouldSyncAccount` (signed in and on one of them).
- **`lib/analysis-store.tsx`, `lib/cv-store.tsx`**: this browser's copy paints on every page, as before. The
  account's stored scan and CV are fetched only when `shouldSyncAccount` is true, once per page load; a fetch cut
  off by leaving the page is asked again on the next product page. Moving local work up to the account still
  happens, on the first product page.
- **`lib/latest-cv.ts`, `components/cv-ask/useCvScan.tsx`**: `useLatestCV(when)`. The CV sheet passes its open
  state, so the kept CV is read when the sheet opens. The dashboard's scan and profile pages read it on load, as
  before.

## What a visitor sees

- Signed out: nothing changes.
- Signed in, on a public page: the skills lit on the landing and market pages come from this browser's copy. In
  a browser that has never opened the dashboard or run a scan, they light up after the first visit to either.
- Signed in, opening the CV sheet: "Use the skills from your last CV" appears once the API answers. Upload works
  at once, as before.
- The dashboard: unchanged.

## Cost

Fewer calls, never more: no new request, schedule or background work. Each avoided wake saves about 6 awake
minutes of the container app and about 0.025 Neon compute hours.

## Same day, Azure settings (founder's yes, not code)

The container app went from 2 vCPU / 4 GiB to 1 vCPU / 2 GiB (revision `--0000052`, healthy).
