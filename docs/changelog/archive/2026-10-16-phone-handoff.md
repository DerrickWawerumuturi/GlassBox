# 2026-10-16: phone visitors can take the link to their laptop (refs #14)

The founder approved a small phone path on 16 Oct 2026: a CV file usually lives on a laptop, and phone visitors
weren't opening the CV sheet. Decision: `docs/decisions/cv-ask.md` ("Phone visitors: take the link to your laptop")
and `analytics.md` (`cv_handoff`, `utm_medium=phone-handoff`). Brand book: words (the CV ask), the log and still
open. Review page: `docs/local/phone-handoff-review.html`.

## The change

- **`components/cv-ask/PhoneHandoff.tsx`**, under every unused CV button: "Your CV is probably on your laptop.
  Comparing it there takes a minute.", then "Copy link" and, where `navigator.share` exists, "Send to yourself".
  "Link copied" in a live region (`role="status"`); a failed copy says "That didn't copy. Use the address bar
  instead." No email or phone number is asked for. The CV button above still works.
- **Phone or tablet only, by CSS** (`components/cv-ask/handoff.css`): shown under
  `(pointer: coarse) and (max-width: 1024px)`, hidden otherwise. Server rendered for everyone, so no layout shift
  and no user agent sniffing; desktop and narrow desktop windows unchanged.
- **The link** (`lib/cv-handoff.ts`, `handoffUrl`): the page's address with its query kept (`utm_source` too),
  `utm_medium=phone-handoff`, no hash. `copyHandoff` and `shareHandoff` send `cv_handoff` only once the link was
  copied or shared; a closed share sheet sends nothing.
- **Analytics** (`lib/analytics.ts`): `cv_handoff` with `how` (`copy`, `share`) and `where` (the `cta_clicked`
  places), on the allowlist.
- **Places:** `CompareCv` (now takes `where`; the landing hero, market pages and the years page, each story, the
  /market grid's card), the landing's "Inside Glassbox" and closing section, and `CvClose` (/product, /about). It
  goes while a scan runs. Not on the menu's "Try it out", the /analysis example banner or the dashboard scan page.

## Cost

None. No new request, schedule or background work: a copy or a share is the visitor's own action, and its one
PostHog event goes through the existing proxy like `cta_clicked`.

## Tests

`lib/cv-handoff.test.ts` (10): the link keeps `utm_source` and the query, sets `utm_medium` once, drops the hash;
copy and share count `cv_handoff` with how and where, and nothing on a failed copy, a closed sheet or no sheet; the
allowlist keeps only `how` and `where` with known names; the line, both actions and the live region render under
"Compare your CV" and go during a scan; the CSS hides the block except under the coarse pointer and small screen
query. `components/cv-ask/handoff-places.test.ts` (4): every entry point carries it with its own `where`, and the
closing section drops it after a scan. `Hero.test.ts`: "nothing under it" now checks the desktop markup, and the
hero carries the handoff. Each new test failed once with its fix broken. Playwright on a local build: home, a market
page, Pick a side, /product, /market, /about and the years page at 390 (phone, touch) light and dark, 820 (tablet),
1280 light and dark and 390 with a mouse: the handoff shows only on the phone and tablet, no sideways scroll, no
console errors; a keyboard "Copy link" puts the tagged link on the clipboard and says "Link copied"; with a share
sheet, "Send to yourself" shares the tagged link.
