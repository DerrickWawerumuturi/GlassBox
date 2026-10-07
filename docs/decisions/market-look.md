# Decision: the public market routes (today's count, a pasted ad)

**Status:** in place from 2026-10-05.
**Files:** `backend/src/api/market.py`, `backend/src/jobpool/market_look.py`,
`backend/src/jobpool/ad_reader.py`, `backend/src/jobpool/safe_fetch.py`;
tests `test_market_look.py`, `test_market_ad.py`, `test_safe_fetch.py`.

The landing page shows what the market asks for today and lets a visitor paste
a job ad to compare it with that market. Both work without signing in.

## GET /market/look

Per technical role family (every family in `roles.TECH_FAMILIES` that has jobs;
never `non_tech`, `other` or `ai_data`):

| Field | What it is |
|---|---|
| `jobs` | live roles |
| `readable` | of those, jobs long enough to read (profile not `thin`) |
| `seniority` | `junior` (intern, entry, junior), `mid`, `senior` (senior, lead, principal), `unstated`; sums to `jobs` |
| `skills` | `{key: readable jobs naming it}`, required, preferred or mentioned; top 150 |
| `titles` | `[title, company, level]`, up to 14 a level, spread over companies |
| `ads` | about 6 a level: `lvl, title, company, location, remote, posted, url, years, req, pref` |

Top level: `taken_at`, `profiler_version`, and `skills`, a display name for
every skill key anywhere in the body.

### Counting rules

The same as the stored snapshot (`market-snapshots.md`), by the same code:
`snapshot.counted()` keeps daily-fetch postings only and a role listed on two
boards or in two cities once, and `snapshot.pool_rows()` reads the same live
pool. The only difference is that this count is live, not stored. A test checks
both give the same numbers.

- An ad sample needs a URL and at least two required skills: one naming fewer
  shows nothing about the level.
- `years` is a required figure only. "Ideally 5 years" is not what a job asks.
- Titles and ads are taken one per company first, so one big employer cannot
  fill a level.

### Never returned

No ad text, ever. Titles carry a title and a company. Ads carry the fields a job
card shows and the skill keys read from the ad. The description, and anything
a reader could rebuild it from, stays on the server.

### Caching

The pool changes once a day. Building the count reads the whole pool, about 6 s
on the live database, and the first call after a deploy used to hang until the
ingress timed out. So **no request ever builds it** (founder, 6 Oct):

- The app builds it in the background at startup (`market.keep_fresh`, started
  in the lifespan), off the event loop, so health checks stay fast.
- A timer rebuilds it every 50 minutes, before the hour's browser cache runs out.
- A request only reads what is built. An old one (over an hour) is still
  served at once while a rebuild starts beside it (stale while revalidate).
- A failed rebuild is logged and the last good count stays.
- Before the first build finishes: 503 with `Retry-After: 15` at once. The page
  keeps its loading state and asks again (`getLook`, up to 5 more times).
- One rebuild at a time (a non-blocking lock).
- The daily pool refresh runs as its own process (`python -m src.jobpool.daily`),
  so it can't nudge this one; the timer catches it within 50 minutes.

Sent with `Cache-Control: public, max-age=3600`, and gzipped (GZipMiddleware
on the whole API, bodies over 1 KB).

Cost on the production pool (13k rows, 2026-10-05): the SQL runs in about
110 ms on the server; reading it from a laptop took 1.2 to 4 s, mostly
transfer. The aggregation takes 0.1 to 0.3 s. The body is about 180 KB
(40 KB gzipped). The query (`profile_repository.COUNTED`) shares its WHERE
clause with `POOL` and reads only the profile fields counted, which took the
transfer from about 8 MB to a fraction of it.

### On the landing page (ISR, 2026-10-07)

`/`, `/product` and `/about` render today's count on the server and are
rebuilt at most every 5 minutes (`lib/landing/look-server.ts`). Before this
change a failed fetch rendered the page without the count, and that thin page
was cached for the full 5 minutes. After an API restart (503 until the count
is built) visitors and crawlers got it: 280 words instead of 800 on 7 Oct.

Next's rule (docs: "Incremental Static Regeneration", "Handling uncaught
exceptions"): when a render throws during revalidation, the last good page
keeps being served and the next request tries again. So `lookForPage`
decides by `keepLastPage()`:

| When | A failed fetch |
|---|---|
| A running production server (`NODE_ENV=production`, not the build phase): every render is a revalidation of a page that exists | throws; the last good page stays |
| `next build` (`NEXT_PHASE=phase-production-build`): no page yet | renders without the count; the browser fetches it |
| `next dev`, tests | renders without the count |

If the build itself could not get the count, the thin build page stays until
a revalidation succeeds, as before. Checked on a local production build: with
the API stopped and the fetch cache cleared, `/` kept its count after the
revalidate window (`x-nextjs-cache: STALE`, then `HIT`, the error in the log;
after a failure Next retries within 30 s). Tests: `look-server.test.ts`.

## POST /market/ad

`{"text": "..."}` or `{"url": "..."}`, exactly one. Returns
`{title, family, level, asks: [{key, name, kind: "req" | "opt"}]}`.

- Read by `requirements.profile_job`, the rules every pool job is read by.
  Mentioned skills are not asks.
- `title`: the first short line of the text, or the page's `<title>`.
- `family` and `level`: `classify_family` and `classify_seniority` on the title,
  in the buckets above.
- Text over 50,000 characters is refused (413) without echoing it.
- The ad is never stored or logged. The route touches no database (a test
  fails if it tries).

### Cost limits

A public route must not let one request burn minutes of CPU. Two inputs did:

- `html_to_text`: the standard library's HTML parser rescans to the end for
  every `<` that opens no tag. 50 KB of `"<a x "` took over two minutes.
  `posting._parseable` now escapes such a `<` and cuts comments before parsing,
  both in linear time. On all 26,606 stored descriptions the output is
  unchanged, so no profiler version bump.
- The profiler reads each skill against the sentence around it. Text with no
  full stops or line breaks made that a scan of the whole ad per skill (30 to
  40 s). `ad_reader` breaks runs over 600 characters into lines first.

The worst input found now takes about a second (text) or 3 s (a 2 MB page).

### Fetching a link (SSRF)

`safe_fetch.fetch_page`, for a URL a stranger chose:

- http and https only, ports 80 and 443, no user or password in the URL.
- Refused by name: `localhost`, `metadata.google.internal`, and `.local`,
  `.internal`, `.localhost` and the other private suffixes from `extract.py`.
- Every address DNS returns must be public: no private, loopback, link-local,
  multicast, reserved or unspecified address, IPv4 or IPv6, and an IPv4-mapped
  IPv6 address is judged as its IPv4 address. One private answer refuses the
  whole name.
- The checked address is pinned: the request goes to that IP, with the name as
  the Host header and as TLS SNI, so the certificate is still checked against
  the name. A DNS answer that changes after the check (rebinding) is never
  asked for.
- At most 3 redirects, each checked and pinned again. 8 s timeout. The body is
  read as a stream and cut at 2 MB. Proxies from the environment are ignored,
  since a proxy would do its own lookup.
- Errors: 400 "That link points to a private address." (or another short
  reason) for a refused address; 422 "That link can't be read." for anything
  that fails after that.

### Rate limit (founder, 5 Oct)

- **20 ads an hour per client** (`src/api/rate_limit.py`), a sliding window. Every
  call counts, failed ones too, since a refused link can still cost a lookup.
  Over the cap: 429, `Retry-After`, and "That's a lot of ads for one hour. Try
  again soon.", which the paste UI shows as is.
- **Who the client is.** The address that connected, unless that address is not
  public (Azure's ingress connects from a private or shared 100.64.0.0/10
  address). Then the last `X-Forwarded-For` entry, the one the ingress appended.
  Earlier entries are whatever the client sent and are ignored. To check after the
  first deploy: that the ingress appends rather than replaces. If every visitor
  shares one key, the cap would hit everyone at once.
- **In memory, one replica.** The app is capped at one replica
  (`decisions/deployment.md`), so one count is the whole count. With more
  replicas each keeps its own, so a client could get 20 per replica, and a
  restart forgets everything. Past one replica this needs a shared store (Redis
  or a Postgres table). At most 50,000 clients are tracked; past that the
  stalest are forgotten.
- `GET /market/look` has no cap: it is cached and costs one dictionary read.

## Not done

