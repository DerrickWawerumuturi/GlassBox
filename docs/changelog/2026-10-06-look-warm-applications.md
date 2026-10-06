# 2026-10-06 — Today's count never waits; applications: dates, columns, phone cards

**Files:** backend `src/jobpool/market_look.py`, `src/api/market.py`, `main.py`
(lifespan, GZip, `POST /dashboard/applications/{id}/applied`),
`src/database/services/applications.py`, `repositories/application_repository.py`,
`src/Agent/utils/types.py`, tests `test_market_look.py`, `test_api_user_data.py`.
Frontend `lib/landing/look.ts` (+ test), `app/(product)/dashboard/applications/page.tsx`,
`components/dashboard/ApplicationCards.tsx`, `AppliedDatePicker.tsx`,
`lib/application-rows.ts` (+ test), `lib/applications-store.tsx`, `lib/api.ts`,
`app/(product)/dashboard/page.tsx`, shadcn `calendar`, `checkbox`.

## /market/look never makes a visitor wait

- Built in the background at startup, rebuilt every 50 minutes, stale served
  while a rebuild runs, the last good count kept when one fails. Before the
  first build: 503 with Retry-After at once, and the landing page asks again.
  Details in `decisions/market-look.md`.
- GZip on the whole API (bodies over 1 KB): the count goes from about 183 KB to 40 KB.
- Tests: a warm cache serves 50 requests without a build; an old one is served
  while one rebuild starts; a failed rebuild keeps the last count; one rebuild at
  a time; a request before the first build answers 503 and never builds; the
  lifespan builds it; the response is gzipped.

## Applications

- **Selecting a second row by its checkbox works.** While selecting, the row
  caught every click to toggle itself, including the checkbox's: it toggled the
  row, cancelled the click, and the browser undid the tick. The row now leaves
  the checkbox and the date picker their own clicks (`rowClickToggles`).
- **The applied date is editable:** a shadcn Calendar in a Popover, saved through
  `POST /dashboard/applications/{id}/applied {applied_on}` (a day, kept at noon UTC
  like an imported sheet's). Not for a job only saved, not a future day, only your
  own rows.
- **Columns:** Title, Company, Date, Source, Status, Applied with, Location, Match.
  "Added" is gone. "Date" is the applied date. "Applied with" is the CV the job was
  saved with (it was "CV"). Match is last: applications include jobs from outside
  our pool. On narrower screens Company shows from md, Source from lg, Location
  from xl and Applied with from 2xl. Under 1280 the table scrolls sideways.
- **Phones get cards, not a squeezed table:** title and company, the status chip,
  the applied date (tap for the calendar), and source, place and match on one line.
  Each card has a checkbox; the long press still opens the sheet.
- Native checkboxes became shadcn Checkbox.

## Overview: Your pipeline

On a phone the five stage labels collided. They now sit three over two, each cell
the full width of its row; five across from sm up. Font sizes unchanged.
