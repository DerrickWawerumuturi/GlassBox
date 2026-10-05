# 2026-10-05 — Landing page: "Look around first"

**Files:** `frontend/src/app/(landing)/page.tsx`, `frontend/src/components/landing/*`
(LookAround, CountCard, Wall, GlassSection, CvSection, LowerSections, StickyCta,
useStepper, useCvScan, copy.ts + test, landing.css), `frontend/src/lib/landing/*`
(look.ts + test, ad.ts, look.fixture.json), `components/ui/{select,toggle,toggle-group,tooltip}.tsx`
(shadcn), `lib/analytics.ts`, `components/SiteFooter.tsx`. Removed: `Hero`, `About`,
`Faq`, `LandscapePreview`, `CvStack`. Backend: `GET /market/look`, `POST /market/ad`
(see below and `decisions/market-look.md`).

The prototype (`docs/local/look-around-prototype.html`, round 3) is now the landing page.

## What the founder picked

- **The CV is asked for in three places only:** the hero, a sticky bar once the
  visitor scrolls or touches something (a bar on a phone, a pill on a desktop),
  and the closing section. No asks under the count or beside the ad.
- **Buttons say "Add your CV" and "Sign up".** The context is a lead line above
  them ("See where you stand."). Sign up is secondary.
- **The sticky line follows what the visitor looked at:** "See where you stand."
  by default, "Where would you sit among these {n}?" after the count, "{n} asks in
  this ad. Which are yours?" after an ad. The button stays "Add your CV".
- **The hero lead is lime on desk** only while the count's lime pill is off screen.
  Otherwise it is muted (one lime per screen).
- **Copy:** "your picks everywhere" from `docs/local/copy-deck.html`, all ten slots,
  in `components/landing/copy.ts`.
- **Honesty rules, tested in `copy.test.ts`:** no "Check in 20 seconds" (never
  measured); the trust line is exactly "We read your CV for the skills. We keep the
  skills, not the file. Delete them any time."; no "94% remote" figure; the eyebrow
  "{n} jobs read today" is the live total from `/market/look`, or no number at all.
- **After a scan the page lights up with the visitor's own skills only.** The count
  card says how many of the job type's 10 most asked skills are on the CV, the ad's
  asks turn green (on your CV) or grey and hatched (not on your CV yet), and the
  closing preview puts what's on the CV first. The squares are not coloured per job:
  we have no per job match for the pool on the landing page, so nothing is simulated.
- **Below the CV section:** How we count, Once your CV is in, The Count (no figure
  until the first issue), Before you add a CV (FAQ). Then the footer, now with
  "We show. You decide." and the coverage line.

## Hero, job types, rate limit, no rules (founder, evening of 5 Oct)

These replace the hero ask and the "three places" decision above.

- **The hero holds only the eyebrow, the headline and its line,** centred in a hero
  about 52vh tall on a desktop (headline up to 56px). The eyebrow now says
  "{n} jobs open today" (the live total). The lead line, both buttons and the trust
  lines left the hero.
- **The CV is asked for in two places:** the sticky bar, which now shows as soon as
  the hero is scrolled past, and the closing section. `cta_clicked.where` is
  `sticky` or `closing`. The trust line test now checks the closing section and
  the sticky bar.
- **Job types:** the 10 main types are cards, then a "More" card that opens the
  other 8 (AI, Data analytics, Data science, Embedded, IT support, Product,
  Security, Solutions) in a shadcn Popover with their counts. A picked one takes
  the More card's place ("Security, 137 jobs") and stops the cycle; play goes back
  to the main ten, which the cycle never leaves.
- **POST /market/ad:** 20 an hour per visitor, then 429 and "That's a lot of ads
  for one hour. Try again soon." in the paste area (`decisions/market-look.md`).
- **No rule lines between sections.** The hero, the count, the glass, the CV
  section and the lower sections are separated by space: 112px on a desktop,
  72px on a phone (about 123px and 68px from the hero's line to the next heading).
- Fixed on the way: on a phone the job type row was as wide as all its cards and
  clipped, so it never scrolled. It scrolls now.

## Section heading and type sizes (founder, later on 5 Oct)

- The count and the wall sit under one section heading, "Who they're hiring.", with
  "Pick a job type. Every square is one job open today." under it. 40px of room
  before the cards on a desktop, 28px on a phone.
- Sizes: the hero headline 40px (28px on a phone); section headings 32px (24px):
  this one, the glass, the CV section and the four lower sections. In-card titles
  sit below: the wall's "The jobs behind the count" at 16px, the count card label
  at 11px mono, the wall's subline at 12px mono, The Count card title at 18px.
- The wall no longer says "Every square is a real job." (the section line says it).
- Chapters are numbered 01 to 06 at every width; the count and wall lost their own
  phone chapters.

## Different from the prototype

- **A pasted ad is read on our server and only its title and asks are shown.** The
  prototype put the full pasted text on the paper. We don't echo or keep ad text,
  and a link is fetched on the server (http/https, timeouts, size cap, private
  addresses blocked).
- **The job type picker, level control, family select and tooltip are shadcn
  components** (ToggleGroup, Select, Tooltip, Dialog), styled to the prototype.
- **Chapter numbers are grey**, not orange: orange is for actions only.
- "Once your CV is in" has text cards only. Screenshots of each tab are still to come.

## Behaviour

- One 4.6s timer steps job type × level; the ring, the card's bar and the count
  follow it without re-rendering. It pauses on hover or focus in the count or the
  glass, while an ad is pasted, and while a scan runs. Reduced motion: no auto steps.
- Split layout at 900px and up; numbered chapters under 900px.
- Paste with the pill or ⌘V / Ctrl+V anywhere outside a text field.
- The upload opens in a dialog; the visitor stays on the page.

## Analytics

`ad_pasted {kind: text|url}` and `cta_clicked {where: hero|sticky|closing}`, both
allowlisted in `lib/analytics.ts` (`decisions/analytics.md`).

## Backend

`GET /market/look` and `POST /market/ad`: `2026-10-05-market-look-api.md` and
`decisions/market-look.md`. Checked against the local API on the production pool
(read only): 18 job types, 4,721 jobs, 179 KB (about 40 KB gzipped), cached for an
hour (a cached answer took 0.03s; a cold one about 10s from this laptop, of which the
query is about 110 ms on the server). The page shows all 18 job types; the step cycle
runs through the ten in `CYCLE` first.

Open: `/market/ad` has no rate limit (the API has none yet), and the API has no gzip.
