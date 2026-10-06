# Frontend architecture

Next.js 16 App Router app. Signed-in users work in `/dashboard`; the landing
page's anonymous scan shows its result under `/analysis`.

## Layout

```
src/
  app/
    layout.tsx                   fonts, dark lock, SessionProvider, AnalysisProvider, CVProvider, Toaster
    auth.ts, proxy.ts            NextAuth (Google); the token subject is Google's account id
    api/token/route.ts           mints the short-lived JWT the backend verifies
    api/logo/route.ts            same-origin company-logo proxy
    (landing)/page.tsx           landing, static with ISR (5 min), today's count fetched on the server (lib/landing/look-server.ts): "Look around first" (components/landing), metadata from its copy
    (public)/product, about      long explainers (components/site/Explainer.tsx, ISR); words in lib/site-copy.ts;
                                 screenshots in public/product (docs/local/render/product-shots.mjs)
    (auth)/sign-in/page.tsx
    (product)/
      analysis/…                 a scan without an account, on the dashboard's views: market · skills · jobs (gaps redirects);
                                 before a scan, the example (lib/example-scan.json) under an Example banner
      onboarding/page.tsx        CV breakdown after sign-in
      dashboard/
        layout.tsx               sidebar shell + ApplicationsProvider + OpportunitiesProvider
        page.tsx                 overview
        applications/page.tsx    the tracker: a table from sm up, ApplicationCards below sm;
                                 AppliedDatePicker changes the applied date (Calendar in a Popover)
        opportunities/page.tsx   the daily pool matched to the CV
        market/page.tsx          the scan's market, one view at a time, picked on a needle dial (?view=demand)
        gaps/page.tsx            the skills page: Bridges, from your skills to what the scan's jobs ask for
        scan, profile
  app/fonts/                     the four brand faces, self-hosted woff2 (next/font/local), OFL licences
  app/experiments/market-navigation/  dev-only lab of the four rotary concepts (404 in production)
  components/
    Market/                      the needle dial, ViewDial and the tab bar; ChartPatterns (hatch, plot frame);
                                 ChartPatterns.tsx holds the SVG hatch and plot frame;
                                 NeedleDial.tsx the Market view dial, ViewDial.tsx where it sits
                                 (left column on a desktop, half circle on a small tablet),
                                 ViewTabBar.tsx the bottom tab bar on a phone
    dashboard/                   dashboard pieces; ApplicationParts.tsx holds the tracker's cells
                                 and menus, AddApplicationDialog.tsx the paste-a-link flow,
                                 ImportApplicationsDialog.tsx the spreadsheet import,
                                 ApplicationSheet.tsx a row's long-press sheet on phones,
                                 OpportunityCard/OpportunityPeek a match and its reasons,
                                 MarketParts.tsx the Market tab's chart chrome (panel, tooltip,
                                 table twin, stat tiles), DemandBars / GapTally its hand-built
                                 SVG charts, Bridges.tsx the skills page's chart
    landing/                     the landing page: LookAround.tsx runs it; CountCard (job types,
                                 levels, the squares), Wall (titles behind the count), GlassSection
                                 (an ad on the glass, paste your own), CvSection, LowerSections,
                                 StickyCta; useStepper.ts the shared 4.6s timer; useCvScan.tsx the
                                 upload dialog; copy.ts every word on the page; landing.css scoped `.la`
    ui/                          shadcn primitives (@base-ui/react) and registry components
  lib/
    api.ts                       every backend call; `authed()` attaches the token
    analysis-store.tsx           the analysis, cached in localStorage and on the account
    cv-store.tsx                 the CV, same pattern
    applications-store.tsx       tracked applications, optimistic writes, per-user cache
    site-copy.ts                 the header's Product menu, /product and /about, in one place
    application-rows.ts          the applied day as a date, which row clicks select (tested)
    opportunities-store.tsx      matched pool jobs, per-user cache
    market.ts                    display transforms over the analysis
    market-views.ts              the Market tab's four views and the ?view= fallback
    theme.ts                     Theme (System/Dark/Light), the no-flash <head> script, ?paper= previews
    latest-cv.ts                 the kept CV skills: hook, dates, reuse errors, the privacy line
    analytics.ts                 PostHog: the only events, property allowlists, scrub (decisions/analytics.md)
    skill-bridges.ts             what Bridges reads: skill pairs, reach, most connected, roles
    use-rotor.ts                 the dial's motion: aim, ease, snap, wheel, drag, keys
    landing/look.ts              GET /market/look and the count's helpers (squares, wall, asks);
                                 look.fixture.json for tests and renders only
    landing/ad.ts                POST /market/ad: a pasted ad or link, read on the server
    dashboard-data.ts            opportunity rows, tier labels, date and age labels
  types/jobradar.ts              API contract
```

## State

Four providers, one per kind of data, all following the same rule: paint
from `localStorage` immediately, then reconcile with the API. The API scales
to zero and a cold start takes ~30s, so nothing waits on it to render.

- `AnalysisProvider` — `hydrated` is false until localStorage has been read;
  **route guards must wait for it**, or returning visitors are bounced off
  the analysis on first paint.
- `CVProvider` — migrates a local CV up to the account on first sign-in.
- `ApplicationsProvider` — cache keyed by user id; writes are optimistic and
  reverted on failure; `syncing` is true while the cached rows are unconfirmed.
- `OpportunitiesProvider` — `GET /dashboard/opportunities`, cached per user
  (the first 40 rows: the whole list would blow the browser's storage quota,
  and a write over it stores nothing at all). The cached list paints at once
  and is never swapped underneath the reader: jobs that arrive after it are
  announced as `incoming`, and `showIncoming()` puts them in. An explicit
  `refresh()` (retry, a finished scan) replaces the list, as does a CV edit,
  which changes every match. `status` is `signed-out`, `loading`, `ready`,
  `no-cv` (the API's 404) or `error`. Opportunities, the overview's good fits,
  the gaps page and the sidebar count all read it; none of them needs a scan.

See `decisions/state-management.md`.

## Routing

The four `/analysis` routes share `analysis/layout.tsx`, which renders the tab
nav and redirects to `/` when `hydrated && !analysis`. The `/dashboard` routes
share the sidebar layout.

**Nothing sends a signed-in visitor away from the landing page.** It used to
redirect them to the dashboard on sight, which made the marketing page
unreachable without signing out. The header carries the dashboard link
instead, for anyone signed in or holding a local CV or analysis.

Nested layouts must be typed with Next's generated `LayoutProps<"/analysis">`.
An inline `{ children: React.ReactNode }` fails typed-route validation in
Next 16.

## Dashboard sections

The Market charts (`components/dashboard/MarketCharts.tsx`: the needle dial and its
four views, DemandBars, GapTally) and Bridges (`components/dashboard/SkillsView.tsx`)
are one implementation each, used by `/dashboard/market` and `/dashboard/gaps` and,
for a scan without an account, `/analysis` and `/analysis/skills`. `/analysis/jobs`
shows the scan's jobs as Opportunities cards (`rankedToRow` in `lib/dashboard-data.ts`).
The sidebar has a `scan` mode for those pages. The landing page's "Inside Glassbox"
draws the same components from today's jobs and an example CV
(`lib/landing/showcase.ts`). The old per section charts (MarketOverview,
SkillDemandChart, SkillGapChart, SkillLandscape, JobMatches…) were deleted on 6 Oct 2026.

See `decisions/data-visualization.md`.

## Display transforms

`src/lib/market.ts` holds every transform over the API response. Components do
not compute; they call these.

| Function | Purpose |
|---|---|
| `toPercent` / `formatPercent` | Ratio → 0–100 |
| `coveragePercent` | Derives coverage from `covered / total` |
| `byDemand` | Sorts a **copy** descending |
| `significantGaps` | Filters to `GAP_FREQUENCY_THRESHOLD` (20%) |
| `gapPriority` | High (≥40%) vs medium |
| `partitionJobSkills` | Splits a posting's skills into have/missing |
| `isConstantScore` | Detects sub-scores identical across all jobs |

`src/lib/dashboard-data.ts` does the same for Opportunities: `toRow`, the tier
labels, `ageLabel` ("Today", "2 hours ago", "Yesterday", "3 days ago",
"Sep 18, 2026"; hours only when the source gave a time) and `dateLabel`, which
marks an estimated date with "≈" and a fetch date as "Found …".
| `skillKey` / `toSkillKeys` | One spelling per skill: lowercased, without the `(Programming Language)` qualifier or `.js` |

Sorting always copies, and is applied even where the backend already sorts, so a
backend change cannot silently reorder a chart.

## Styling

Tailwind v4 with **no config file**. Every token lives in
`src/app/globals.css` inside `@theme inline`, `:root` and `.dark`.

The app is locked to dark via `className="dark"` on `<html>`. A single accent
(`#f5532a`) drives `--primary` and the legacy `--chart-1…5` ramp the
`/analysis` charts read. The Market tab's charts read the colour roles instead
(`--chart-have` green for on your CV, `--chart-gap` neutral with a hatch or a
ring for not yet, `--chart-ink` for market-only data, lime for one highlight)
and never put orange in data. Charts read colour via `var(--chart-have)` rather
than literals — never hard-code a colour in a chart.

Fonts: Space Grotesk (`font-heading`, headings and chart titles), Schibsted
Grotesk (`font-sans`, body) and JetBrains Mono (`font-mono`, used for every
number, axis tick and small-caps label).

See `decisions/design-system.md`.

## UI primitives

`src/components/ui/` is shadcn built on **`@base-ui/react`, not Radix**:

- Composition uses a `render` prop, not `asChild`.
- Parts are `Backdrop` / `Popup`, not `Overlay` / `Content`.
- State variants are `data-open:` / `data-closed:`.

Add components with `npx shadcn@latest add <name>` and merge by hand; several
have local edits.

## Backend connection

`src/lib/api.ts` is the only place the backend is called. `API_BASE_URL` comes
from `NEXT_PUBLIC_API_BASE_URL`. Signed-in calls go through `authed()`, which
fetches a 15-minute token from `/api/token`. Timeouts are 60s for ordinary
calls, long enough to outlast a cold start, and longer for analysis.

## Commands

```bash
npm run dev     # http://localhost:3000
npm run build   # production build and type-check
npx tsc --noEmit
npm test        # vitest: unit tests for pure logic (src/**/*.test.ts)
```

There is no lint config.

## Known limitations

- A match's `reasons` are written by the backend; the frontend shows them in
  order and never composes its own.
- Vitest covers pure logic only (`lib/*.test.ts`); there are no component or
  browser tests in the repo. The browser checks used for charts and the
  tracker live outside it.
