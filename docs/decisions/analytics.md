# Decision: product analytics with PostHog, and what it may never see

**Status:** live since 2026-10-05 (the production key is set). Visit sources and
`signed_up` added 2026-10-07. **Files:** `frontend/src/lib/analytics.ts`,
`components/AnalyticsProvider.tsx`, `lib/api.ts` (`signed_up`), `next.config.ts`
(the `/ingest` proxy), `.env.example` (`NEXT_PUBLIC_POSTHOG_KEY`,
`NEXT_PUBLIC_POSTHOG_HOST`); backend `main.py` (`X-Account-Created`). Server side
daily counts since 2026-10-08: `src/api/daily_counts.py`.

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
| `scan_started` | `from`: the market page the scan started on (`entry-level-software`), else nothing |
| `cv_uploaded`, `cv_reused` | none |
| `scan_finished` | `duration_s`, `jobs` (jobs found), `from` as on `scan_started` |
| `scan_failed` | `stage`: `upload` or `reuse`; `reason` (since 2026-10-12): `timeout`, `too_big`, `not_pdf`, `server` (a 500: the server's fault or a PDF it couldn't read, which it answers the same way), `network` (the request never reached the API), `not_kept` (a rescan with nothing kept) or `other`. A kind from `failReason` in `lib/cv-ask.ts`, never the error's text |
| `file_refused` | `reason`: `not_pdf` or `too_big`. A chosen file the sheet refuses before anything is sent (since 2026-10-12; before, these visitors looked like they closed the sheet). Never the file's name, type or size |
| `view_opened` | `page` (overview, market, skills, opportunities, applications), `view` (a Market view) |
| `ad_pasted` | `kind`: `text` or `url` (never the ad itself) |
| `cta_clicked` | `where`: `hero`, `inside` or `closing` (the landing page's CV asks; `hero` since 2026-10-12), `header` (Try it out in the desktop Product menu, 12 to 15 Oct 2026: the menu became a plain link) or `menu` (the same in the phone menu, since 2026-10-12), `product` (/product) or `about` (/about, since 2026-10-15), a market page's name (`entry-level-software`), `years` (the years of experience page, since 2026-10-12), a story's place (`story_pick_a_side`, `story_the_lobby`, `story_contents_may_vary`, `story_peak_python`, `story_within_eleven_jobs`) or `market` (the /market grid's CV card), both since 2026-10-15. A story's scan events carry its market page's name in `from`; its visit source rides on the pageview, as on the market pages. Retired 12 Oct with the question ask: `count`, `sticky`, and the `ask` property (`card` or `sticky`) |
| `fact_copied` | `page`: the market page whose fact was copied (`entry-level-software`); never the sentence |
| `story_interacted` | `story`: the story's address (`is-entry-level-dead`, `pick-a-side`, `the-lobby`, `contents-may-vary`, `peak-python`, `within-eleven-jobs`); `kind`: the first interaction the reader used, by a short name: `pick_side`, `scratch`, `reveal_all` (Pick a side), `lift`, `all_floors` (the lobby), `open_box`, `ingredient`, `show_none` (Contents may vary), `arm`, `peak_list` (Peak Python), `crane`, `fly_over` (Within eleven jobs), `guess`, `show_count` (Is entry level dead?, since 2026-10-19: setting a guess, and asking for our count). Once per page view (`storyInteracted` in `lib/analytics.ts`), so it counts readers who play, not taps; never a guess, a pick or a skill. Not sent when the box opens by itself as it scrolls into view, nor when the guess shows our count as the ladder scrolls into view. Since 2026-10-15. A story's page view carries the visit's `ref_domain` and `utm_*` the way every page does (the provider sits in the root layout) |
| `cv_handoff` | `how`: `copy` (the link reached the clipboard) or `share` (the phone's share sheet sent it; a closed sheet sends nothing); `where`: the same place names as `cta_clicked`. The phone handoff beside a CV button on a phone or tablet (`lib/cv-handoff.ts`, `decisions/cv-ask.md`). Never the link, the page's query or where it was sent. Since 2026-10-16. The laptop visit it starts carries `utm_medium=phone-handoff` on its first pageview, with the original `utm_source` kept (see below) |
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
- `utm_medium=phone-handoff` (since 2026-10-16) marks a visit that started
  from a link a phone visitor copied or shared to themselves (`cv_handoff`).
  The link keeps the visit's `utm_source`, so a LinkedIn visit taken to a
  laptop reads `linkedin` + `phone-handoff`.

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

## Server side counts (2026-10-08)

PostHog misses whoever blocks it: an ad blocker, Do Not Track. The API counts
the few things that matter itself, as daily totals in `daily_counts`
(migration 020): one row per UTC day, five counters, nothing else. No user id,
no address, no file name, no CV content, no row per person.

| Counter | Adds one when |
|---|---|
| `scans_started` | a `POST /analyze` or `POST /analyze/reuse` reaches its route |
| `scans_finished` | that request returns a result |
| `scans_failed` | that request raises: not a PDF, nothing kept to reuse, any error |
| `cv_reused` | a `POST /analyze/reuse` reaches its route (also in `scans_started`) |
| `accounts_created` | a response carries `X-Account-Created` (a first write that worked; see `signed_up`) |

**What a scan is.** An upload scan is two requests sent at once: `/cv/parse`
finds the skills, `/analyze` compares them with the jobs, and `/analyze` alone
decides whether the scan worked (`lib/cv-ask.ts`, `runUpload`). So a scan is
one `/analyze` or `/analyze/reuse` request, and `/cv/parse` is not counted.
A body that says it is over 10 MB is refused by a middleware before any route
and is not counted; a file that reaches `/analyze` and isn't a PDF is started
and failed. `scans_started - scans_finished - scans_failed` is scans cut off
by a restart. These match PostHog's `scan_started`, `scan_finished`,
`scan_failed`, `cv_reused` and `signed_up`, so the gap between them is what
PostHog misses.

**Never at the request's cost.** `daily_counts.count()` hands the write to one
background thread and returns; the request never waits on the database. A
write that fails is printed (`daily count not kept (...)`) and dropped. One
thread keeps the counts in order and holds at most one pooled connection.
Without `DATABASE_URL` nothing is counted. The write is one
`insert ... on conflict (day) do update set x = x + 1`, so two requests
counting at once both land, even the first two of a day.

**Reading them** (a select only, safe on production):

```
cd backend && python -m src.api.daily_counts --days 14
```

prints one line a UTC day (a day with no row as zeros) and the total of the
last 7 days.

The privacy page says it: "Our own server also counts scans and new accounts
each day, as totals. Never who." (`decisions/privacy-pages.md`).

## Follow-ups

- **Identify by the internal user id:** the frontend never sees it. Until an
  endpoint returns it, the hash above stands in.

## Testing note

PostHog ignores bots, including automated browsers (`navigator.webdriver`,
"HeadlessChrome"). Browser checks must mask both to see events leave; a real
browser is unaffected. React's dev mode runs effects twice, so dev sends
`view_opened` twice; production sends it once.


### Asks inside a story (2026-10-21)

Is entry level dead? asks for the CV twice more besides its ending: after the guess shows our count
(`cta_clicked` where `story_is_entry_level_dead_guess`) and at the internships turn
(`story_is_entry_level_dead_turn`). Counted apart so the ending's own `story_is_entry_level_dead`
stays comparable. Why: in its first day 7 of 22 readers reached the end and none clicked the ending's ask.
Do you need AI on your CV now? (21 Oct) asks the same way from the start: after the guess
(`story_ai_on_your_cv_guess`), at the street of doors (`story_ai_on_your_cv_street`) and at the end
(`story_ai_on_your_cv`). Its guess reports `story_interacted` with the kinds `guess` and `show_count`, as chapter
one's, under its own address.


## Internal scan tests and reporting

The backend accepts internal-test classification only when `X-Glassbox-Test-Key` matches the server-only `GLASSBOX_TEST_KEY` setting. The frontend can send that key from the current tab's `sessionStorage.glassbox_test_key` value; never put it in a `NEXT_PUBLIC_*` environment variable or commit it. The key is not stored. Credentialed internal scans increment the `test_scans_*` and `test_cv_reused` daily counters instead of production scan counters. PostHog scan events can be filtered by `internal_test=true` when the same tab key is present. Do not use country exclusions to remove internal tests.

PostHog's `internal_test` property is a reporting convenience, not the security boundary: the backend-validated key controls server-side counter classification. A tab with a wrong/stale key may be marked in PostHog but will remain production traffic in backend totals. The backend daily counters remain the source of truth for counted server scans.
