# 2026-10-06 — The home page arrives whole; Inside Glassbox; the header; /analysis on the dashboard

## The home page no longer flashes empty

**Cause:** the whole story below the hero waited for a browser fetch of
`/market/look`. The server HTML held the hero and the footer only, so for a
moment (seconds on a cold API) that was the page.

**Fix:** `app/(landing)/page.tsx` fetches today's count on the server
(`lib/landing/look-server.ts`: 4s timeout, any failure falls back to nothing)
and is static with ISR (`revalidate = 300`; `next build` lists `/` as ○ with
5m). The count, the job type cards, the wall, the glass, the closing preview and
the lower sections are in the HTML. Without the count (a cold API, a 503 while
it builds) the section frame and two shimmering skeleton cards render instead of
blank space, and the browser fetches it. Two first render differences that SSR
exposed were fixed: the paste shortcut label (⌘V or Ctrl+V) is read after
hydration, and the squares take a CSS default size until measured.

**Measured** (production builds on this laptop, local API, median of 7 runs):

| | first paint | count on screen |
|---|---|---|
| before, API warm | 384 ms | 773 ms |
| before, API 3 s slow | 100 ms | 3369 ms |
| after, API warm | 240 ms | 130 ms |
| after, API 3 s slow | 320 ms | 196 ms |

The HTML is larger (42 KB to 310 KB uncompressed), because the count travels in it.

## Header

Left: the wordmark, then Product, How we count, About, FAQ. Right: Dashboard
(signed in only, the dashboard needs an account), then the account menu or Sign
in. "Analysis" and "Profile" left the header; the profile stays in the account
menu. Product is a mega menu: each page with its icon, one line, and a small
drawing of it from today's jobs (`components/ProductThumb.tsx`), plus "See it with
your CV", which opens the upload. On a phone the hamburger opens a dropdown like
the account menu (founder's call); the Sheet component is gone.

## Inside Glassbox

A new chapter (03) after the glass: the four dashboard pages in tabs, drawn with
the product's own components (the needle dial and DemandBars, Bridges, the
skill tags and status chips) from today's real jobs and one example CV
(`lib/landing/showcase.ts`, tested). Labelled "example". The tabs step on the
4.6s timer, pause on hover or focus, and stay put with reduced motion. "Add your
CV" and "Sign up" beside it (`cta_clicked {where: inside}`). The product
components keep the app's colour tokens inside the landing scope (`.app-tokens`).

## How we count, What you get

Bento cards in the style of supabase.com's feature grid (1px borders, a small
drawing on top, a mono step number, a faint glow on hover) and the old JobRadar
"how it works" steps: Read (a stack of today's titles), Deduplicate (one job
from two boards, counted once), Match to real skill names (a phrase struck out
next to a skill), Count, with the date (today's count for one job type).
"What you get" uses the same cards with the product drawings, each linking to
`/product`.

## /analysis: the dashboard, without an account

The dashboard needs sign in, so the anonymous pages stay, now built from the
dashboard's own views: Market charts with the needle dial (`/analysis`),
Bridges (`/analysis/skills`), the scan's jobs as Opportunities cards
(`/analysis/jobs`, `rankedToRow`, tested); `/analysis/gaps` redirects to the
Gaps view. The dashboard's sidebar in a scan mode: only those pages, and "Sign up
to keep this scan." with a short Sign up button. The old chart components
(MarketOverview, SkillCoverage, SkillGapChart, SkillDemandChart,
UserSkillPresence, SkillLandscape, JobMatches, MarketCard, SkillBarChart and the
Panel parts) are deleted.

Fixed on the way: lucide's `LayoutDashboard` icon points at a file that doesn't
exist in the installed version; the header uses `LayoutGrid`.

## The soft light, and the menu's feel (founder's clarification)

- The dashboard prototype's pointer spotlight (`docs/local/dashboard-supabase.html`)
  is one global class, `.spotlight` (globals.css), moved by one listener
  (`components/SpotlightWatcher.tsx`, mouse only). Warm white at 6% on desk, ink at
  5% on paper, never orange, off on touch screens and with reduced motion. On the
  How we count and What you get cards, the mega menu's items and the Inside
  Glassbox frame.
- The mega menu opens and closes with a fade and a slight scale (0.97), has a
  hairline border and a soft shadow, and a pill slides between the top level items
  under the pointer.
- The dashboard pages themselves are unchanged (founder: no redesign there).
