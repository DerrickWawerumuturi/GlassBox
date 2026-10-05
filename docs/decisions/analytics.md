# Decision: product analytics with PostHog, and what it may never see

**Status:** wired 2026-10-05, not yet shipped. **Files:** `frontend/src/lib/analytics.ts`,
`components/AnalyticsProvider.tsx`, `next.config.ts` (the `/ingest` proxy),
`.env.example` (`NEXT_PUBLIC_POSTHOG_KEY`, `NEXT_PUBLIC_POSTHOG_HOST`).

## Why

The launch plan needs a handful of numbers: how many people scan, how long a
scan takes, which pages they open. Nothing more. The product's promise is
counted clarity about the job market, not about the person using it, so the
analytics are cut to the events below and fenced in code.

## Where it goes

PostHog **US cloud** (`us.i.posthog.com`; the project key authenticates
there, not on EU). Requests go to our own origin at `/ingest`, which
`next.config.ts` rewrites to the PostHog host. That is PostHog's recommended
setup: blockers that drop `*.posthog.com` don't drop ours. The host can be
changed with `NEXT_PUBLIC_POSTHOG_HOST`.

## What is sent

| Event | Properties |
|---|---|
| `$pageview` | the path only, e.g. `/dashboard/market` (no query string, no hash) |
| `scan_started`, `cv_uploaded`, `cv_reused` | none |
| `scan_finished` | `duration_s`, `jobs` (jobs found) |
| `scan_failed` | `stage`: `upload` or `reuse` |
| `view_opened` | `page` (overview, market, skills, opportunities, applications), `view` (a Market view) |
| `signed_up` | none (not wired yet, see below) |

PostHog adds its own context: browser, OS, device type, screen size,
language, and the page path. The referrer and campaign parameters are not
saved. `$pageleave` is on.

## What is never sent

- CV contents, file names, skills, job titles, names or emails.
- Query strings (a URL can carry anything).
- Anything from autocapture (off) or session recording (off).

This is enforced, not just intended. `track()` only accepts the events above,
each with a property allowlist, and `before_send` (`scrub`) drops any other
event, cuts URLs to paths, removes referrers, and strips properties outside
the allowlist. Tests feed it a file name, skills and an email and check that
none comes out (`lib/analytics.test.ts`).

## Storage and consent

- `persistence: 'memory'`: no cookies, no localStorage. A full page load
  starts a new anonymous id; moving between pages in the app keeps it.
- `respect_dnt: true`: a browser sending Do Not Track sends nothing.
- `ip: false`: PostHog is asked not to keep the IP.
- No key, no analytics: without `NEXT_PUBLIC_POSTHOG_KEY` nothing loads.

## People

A signed-in user is identified by a one-way hash of their account id
(`u_` + 32 hex), never the id itself, a name or an email. Signing out resets.

## Follow-ups (backend)

- **`signed_up`:** the frontend cannot tell a first sign-in from a later one.
  The backend creates the user on first touch (`resolve_user_id`); it should
  say so (e.g. `created: true` on the first call), and the frontend sends
  `signed_up` then.
- **Identify by the internal user id:** the frontend never sees it. Until an
  endpoint returns it, the hash above stands in.

## Testing note

PostHog ignores bots, including automated browsers (`navigator.webdriver`,
"HeadlessChrome"). Browser checks must mask both to see events leave; a real
browser is unaffected. React's dev mode runs effects twice, so dev sends
`view_opened` twice; production sends it once.
