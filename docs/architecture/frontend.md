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
    (landing)/page.tsx           landing + anonymous upload
    (auth)/sign-in/page.tsx
    (product)/
      analysis/…                 overview · skills · gaps · jobs for an anonymous scan
      onboarding/page.tsx        CV breakdown after sign-in
      dashboard/
        layout.tsx               sidebar shell + ApplicationsProvider
        page.tsx                 overview
        applications/page.tsx    the tracker table
        opportunities, market, gaps, scan, profile
  components/
    Market/                      analysis charts, shared by /analysis and /dashboard
    dashboard/                   dashboard pieces; ApplicationParts.tsx holds the tracker's cells
                                 and menus, AddApplicationDialog.tsx the paste-a-link flow
    ui/                          shadcn primitives (@base-ui/react) and registry components
  lib/
    api.ts                       every backend call; `authed()` attaches the token
    analysis-store.tsx           the analysis, cached in localStorage and on the account
    cv-store.tsx                 the CV, same pattern
    applications-store.tsx       tracked applications, optimistic writes, per-user cache
    market.ts                    display transforms over the analysis
    dashboard-data.ts            analysis -> opportunity rows
  types/jobradar.ts              API contract
```

## State

Three providers, one per kind of data, all following the same rule: paint
from `localStorage` immediately, then reconcile with the API. The API scales
to zero and a cold start takes ~30s, so nothing waits on it to render.

- `AnalysisProvider` — `hydrated` is false until localStorage has been read;
  **route guards must wait for it**, or returning visitors are bounced off
  the analysis on first paint.
- `CVProvider` — migrates a local CV up to the account on first sign-in.
- `ApplicationsProvider` — cache keyed by user id; writes are optimistic and
  reverted on failure; `syncing` is true while the cached rows are unconfirmed.

See `decisions/state-management.md`.

## Routing

The four `/analysis` routes share `analysis/layout.tsx`, which renders the tab
nav and redirects to `/` when `hydrated && !analysis`. The `/dashboard` routes
share the sidebar layout.

Nested layouts must be typed with Next's generated `LayoutProps<"/analysis">`.
An inline `{ children: React.ReactNode }` fails typed-route validation in
Next 16.

## Dashboard sections

All under `src/components/Market/`. Each answers one question:

| Component | Question |
|---|---|
| `MarketOverview` / `MarketCard` | What was analyzed? |
| `SkillDemandChart` | What does the market ask for? |
| `UserSkillPresence` | How common are my skills? |
| `SkillGapChart` | What am I missing? |
| `SkillCoverage` | How much of the core skillset do I cover? |
| `JobMatches` | Which jobs fit me? |
| `SkillLandscape` | Where do I sit overall? |

`SkillBarChart` is the shared Recharts horizontal bar chart used by the demand
and my-skills sections. `SkillGapChart` deliberately does not use it — its rows
carry a reason as well as a magnitude.

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
| `skillKey` / `toSkillKeys` | One spelling per skill: lowercased, without the `(Programming Language)` qualifier or `.js` |

Sorting always copies, and is applied even where the backend already sorts, so a
backend change cannot silently reorder a chart.

## Styling

Tailwind v4 with **no config file**. Every token lives in
`src/app/globals.css` inside `@theme inline`, `:root` and `.dark`.

The app is locked to dark via `className="dark"` on `<html>`. A single accent
(`#f5532a`) drives `--primary` and the `--chart-*` ramp, so all five charts
repaint from one token change. Charts read colour via `var(--chart-3)` rather
than literals — never hard-code a colour in a chart.

Fonts: Space Grotesk (display/body, `font-space`) and JetBrains Mono
(`font-mono`, used for every number, axis tick and small-caps label).

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
npm run build   # production build; also the only type-check gate
npx tsc --noEmit
```

There is no lint config.

## Known limitations

- `overall_score` compresses into roughly 0.2–0.5, so a strong match displays
  near 48% rather than 90%.
- `experience_score` barely varies, because few postings carry an
  `experience_level`. `JobMatches` detects and discloses a constant sub-score.
- There is no frontend test runner; the browser checks used for the tracker
  live outside the repo.
