# Decision: product analytics with PostHog, and what it may never see

**Status:** live since 2026-10-05 (the production key is set). Visit sources and
`signed_up` added 2026-10-07. **Files:** `frontend/src/lib/analytics.ts`,
`components/AnalyticsProvider.tsx`, `lib/api.ts` (`signed_up`), `next.config.ts`
(the `/ingest` proxy), `.env.example` (`NEXT_PUBLIC_POSTHOG_KEY`,
`NEXT_PUBLIC_POSTHOG_HOST`); backend `main.py` (`X-Account-Created`).

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
| `$pageview` | the path only, e.g. `/dashboard/market` (no query string, no hash); the first of a page load also `ref_domain` and `utm_*` (see below) |
| `scan_started`, `cv_uploaded`, `cv_reused` | none |
| `scan_finished` | `duration_s`, `jobs` (jobs found) |
| `scan_failed` | `stage`: `upload` or `reuse` |
| `view_opened` | `page` (overview, market, skills, opportunities, applications), `view` (a Market view) |
| `ad_pasted` | `kind`: `text` or `url` (never the ad itself) |
| `cta_clicked` | `where`: `sticky`, `closing` or `inside` (the landing page's CV asks; the hero has none since 5 Oct), or `product` (/product) |
| `signed_up` | none; sent once, on the response that created the account (see below) |

PostHog adds its own context: browser, OS, device type, screen size,
language, and the page path. Its own referrer and campaign properties stay
off (`save_referrer`, `save_campaign_params`); ours below replace them.
`$pageleave` is on.

## Where a visit came from (2026-10-07)

Channel tests (Reddit, LinkedIn, newsletters) need to know where a visit came
from, and nothing more. The first pageview of a page load carries:

- `ref_domain`: the referring site's hostname only, `www.` dropped
  (`https://www.reddit.com/r/x?y=1` becomes `reddit.com`). Our own site is
  dropped, and so is a referrer that is not http or https. After the Google
  sign in round trip the browser may report `accounts.google.com`.
- `utm_source`, `utm_medium`, `utm_campaign`, `utm_term`, `utm_content`, each
  trimmed to 100 characters. A value that looks like an address or an email
  (`://`, `?`, `&`, `=`, `#`, `@`) is dropped.

`visitSource` builds them; `scrub` checks them again before sending:
`ref_domain` must be a bare hostname and every utm value passes the same rule,
or the property goes. PostHog's own events may carry no other properties of
ours: `$pageview` only these six, `$pageleave` and `$identify` none.
"First page of a visit" is the first pageview after a full page load, since
memory persistence starts a new anonymous id on each one anyway.

## What is never sent

- CV contents, file names, skills, job titles, names or emails.
- Query strings (a URL can carry anything), full referrer addresses.
- Anything from autocapture (off) or session recording (off).

This is enforced, not just intended. `track()` only accepts the events above,
each with a property allowlist, and `before_send` (`scrub`) drops any other
event, cuts URLs to paths, removes PostHog's referrers, and strips properties
outside the allowlist. Tests feed it a file name, skills and an email, a full
referrer address and a query string, and check that none comes out
(`lib/analytics.test.ts`).

## Storage and consent

- `persistence: 'memory'`: no cookies, no localStorage. A full page load
  starts a new anonymous id; moving between pages in the app keeps it.
- `respect_dnt: true`: a browser sending Do Not Track sends nothing.
- `ip: false`: PostHog is asked not to keep the IP.
- No key, no analytics: without `NEXT_PUBLIC_POSTHOG_KEY` nothing loads.

## People

A signed-in user is identified by a one-way hash of their account id
(`u_` + 32 hex), never the id itself, a name or an email. Signing out resets.

## signed_up (2026-10-07)

Signing in with Google provisions nothing: NextAuth runs without a database,
and the backend creates the user on their first write (`resolve_user_id`
with `create=True`; reads never create). So only the backend knows when an
account is new. The upsert returns `(xmax = 0) as created`, true only for a
fresh insert, and the request's response carries `X-Account-Created: 1`
(a per request flag in `services/users.py`, set by a middleware in
`main.py`, exposed through CORS). `lib/api.ts` sends `signed_up` when it sees
the header. Two first writes racing get one insert, so one header.

A request that creates the account and then fails sends no header (its
transaction may have rolled back), so in that rare case `signed_up` is missed
rather than sent twice. Deleting the account and coming back counts as a new
sign up.

## Follow-ups

- **Identify by the internal user id:** the frontend never sees it. Until an
  endpoint returns it, the hash above stands in.

## Testing note

PostHog ignores bots, including automated browsers (`navigator.webdriver`,
"HeadlessChrome"). Browser checks must mask both to see events leave; a real
browser is unaffected. React's dev mode runs effects twice, so dev sends
`view_opened` twice; production sends it once.
