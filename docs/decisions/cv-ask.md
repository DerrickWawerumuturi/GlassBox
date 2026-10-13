# Decision: the CV ask

**Status:** built 2026-10-07 as a question; since 2026-10-12 one "Compare your
CV" button per page (founder; see "One button, no question" below). **Founder's pick:** `docs/local/cv-ask-prototype.html`
(decision log in `docs/brand/guidelines.html`, 7 Oct, "The CV ask becomes a
question"). **Code:** `frontend/src/lib/cv-ask.ts` (words, which skills, the
count, the scan's states and steps; tested in `cv-ask.test.ts`),
`frontend/src/components/cv-ask/` (`CompareCv` the button, `AskCard` the
answer, the sheet, the picker, the scan hook).

## What changed

"Add your CV", big and orange in several places, read as a demand, and the
"File Upload" modal read as data collection. From 7 Oct the ask was a
question about the skills the page just showed ("How many of these are on
your CV?", a blank count over the skills, "Find out"). On 12 Oct the founder
removed the question: to someone who hasn't used the app it makes no sense.
Each page now has one plain button, and the answer still lands where the
page showed the skills.

| Where | Before the scan | After the scan |
|---|---|---|
| Landing hero (`Hero`, `CompareCv`) | "Compare your CV", nothing under it (13 Oct; until then "Free. No account needed. Your PDF is deleted after reading.") | unchanged; the page lights up with the visitor's skills |
| Market page and the years page, after the figures (`MarketCvAsk`) | the same `CompareCv`, one per page | "9 of these are on your CV" (`AskCard`), the count in green, their skills green, the rest grey dashed (never red); "See the jobs that ask for them"; the figures mark their skills |
| Landing closing section | "There's more of you in these jobs than you think." with "Find out" and "Sign up" | unchanged ("See your results") |

The landing "Inside Glassbox" ask keeps "Add your CV" (beside an example
dashboard, it means "see yours"); /product, the header and /analysis open the
same sheet without a job type (title "See where you stand") and go to
/analysis after the scan, as before.

## Which skills

- **Market page:** the 15 skills its jobs name most (`story.skills` by
  `any`), broad ones only (the breadth rule: named by jobs at 10 or more
  employers), or what the page has. A page with no broad skill asks about its
  most named ones. N is counted from the readable jobs, so the sheet says
  "compare them with the 135 entry level software jobs whose ads we could
  read". Until 2026-10-12 it said "with 304 backend jobs" a few lines from a
  count card saying "309 jobs", with nothing to say why (the card counts every
  job; the skills come only from ads long enough to read). Now each number
  names what it counts.
- **Landing:** the job type's 10 most asked skills from today's look, in the
  count's order. An ad on the glass asks about its own asks.
- **k:** a skill counts when the scan's skills (`useHave`: the scan's skill
  presence plus the CV breakdown) match it by key or by name ("LLMs" and
  `llm`).

## The sheet

A bottom sheet on a phone, a centred panel from 640px (base-ui Dialog, styled
as a sheet). Idle: the question, one sentence naming what we compare with, an
example labelled "example", "3 of 5 skills on your CV" over its five chips
(until 2026-10-12 it was out of the ask's total, "6 of 10" over five chips,
which didn't add up), then "Choose your CV"
(phone) or a drop zone with "Choose a file" (wider). Choosing or dropping a file
starts the scan. Three trust lines, true for who is reading (since
2026-10-12; `/your-cv` is the source):

| Not signed in | Signed in |
|---|---|
| Your PDF is deleted after reading. | Your PDF is deleted after reading. |
| Its text goes to Groq, a US service, to read the skills. | Its text goes to Groq, a US service, to read the skills. |
| Without an account, we keep nothing about you on our servers. | We keep the skills read from your latest CV, never the file. Delete them any time. |

Before, everyone read "We keep the skills, not the file.", untrue without an
account (`docs/local/home-audit.html`, E4). The landing page's closing section
and FAQ don't know who is reading, so their shared line (`TRUST` in
`components/landing/copy.ts`) now says "With an account, we keep the skills,
never the file.", true either way. Then "PDF, up to 10 MB", "What happens to
your CV" (/your-cv). Signed in with a reusable kept CV: "Use last CV" first
(the existing rescan, `POST /analyze/reuse`), the picker below it.

Errors, in plain words, with the picker still there: not a PDF, over 10 MB
(both checked before anything is sent), "We couldn't read this PDF. Try
exporting it again.", "That took too long. Try again in a minute.", and the
rescan's own messages (`reuseError`).

### What the reading steps reflect

The scan is two requests sent together: `POST /cv/parse` (reads the PDF, finds
the skills) and `POST /analyze` (reads it, finds them, compares with the
jobs). Neither reports progress. So the steps move only on answers the browser
sees:

- start: "Read the PDF" says "now"; the bar slides (indeterminate, never a
  filling bar; static and faint with reduced motion).
- `/cv/parse` answers: "Read the PDF" and "Find your skills" tick together.
- `/analyze` answers: "Compare with N jobs" ticks, and the result shows.
  If it answers first, all three tick at once.

Past the minute the sheet promises ("about a minute"), one line joins the
steps: "Still reading. This one is taking more than a minute." (`waitClock`,
`WAIT_LINE_SECONDS` = 60). It says what is true and not why: the wait can be
the API waking from zero (about 43 s, `decisions/deployment.md`) or a slow job
board. No timer, no guessed progress.

Opening the sheet also wakes the API (`wakeApi` in `lib/api.ts`): one
`GET /health` per page load, fire and forget, no retry. The API scales to zero
(`decisions/deployment.md`), and choosing a file takes a few seconds, which a
sleeping API can use. It is the only wake: nothing wakes the API on page load.
Keeping a replica up was looked at and turned down by the founder on 12 Oct:
at 2 vCPU / 4 GiB one always on replica would use up the monthly free grant
(180,000 vCPU seconds, about 25 hours at that size) in about a day.

"The file is deleted once it's read." shows under the steps: `_pdf_text` in
`backend/main.py` writes a temp file and removes it in `finally`, for both
requests.

### The result

"{k} of {N}" in green, "of the skills entry level software jobs name most are
on your CV.", "See them" (closes the sheet; the page has already lit up). Signed out: "Keep them with a free account, to compare again later."
True today: once signed in, the browser's CV skills go to the account (`cv-store`
migrates them; `kept_cv` keeps the skills and derived values, never contact details) and Opportunities compares
them with each day's jobs; a scan made signed in also keeps the profile of
the latest CV (`latest_cvs`) for "Use last CV".

## Buttons

Every button here is one to three words ("Find out", "Choose your CV", "Use
last CV", "See them", "Keep them"). Until 2026-10-08 "See them on the page"
and "Use your last CV" were allowed as exceptions; the founder shortened both
and `copy.test.ts` no longer allows any.

## Analytics

`cta_clicked {where}`: `where` is the landing place (`hero`, `inside`,
`closing`), `product`, the header's Try it out (`header` on desktop, `menu` on
a phone), a market page's name, or `years` (the years of experience page).
`ask` and `sticky` went with the question ask on 12 Oct. Scan events:
`scan_started`, `cv_uploaded` or `cv_reused`,
`scan_finished`, `scan_failed {stage, reason}`, and `file_refused {reason}`
for a file refused before anything is sent (since 2026-10-12; the reasons are
in `decisions/analytics.md`).

## Turned down

- A per step timer (the old `AnalysisProgress` pacing): it claims progress the
  server never reported.
- The question with a blank count before a scan, and the sticky line that
  repeated it (founder, 12 Oct 2026: it means nothing to someone new).
- A file name, skills or the count in any event.

## The server's limits (2026-10-08)

`/analyze` and `/cv/parse` refuse a file over 10 MB with a 413 ("That file is
over 10 MB.") and anything that doesn't start as a PDF (`%PDF-` in its first
1 KB, whatever the content type claims) with a 415 ("That isn't a PDF.")
(`backend/src/cv/upload.py`). A request whose Content-Length is past 10 MB
plus 64 KB of form wrapping is refused by a middleware before its body is
read; otherwise the file is read at most 10 MB + 1 byte. Both happen before
the analysis queue. The sheet words them as its own checks do (`scanError`:
413 is "over 10 MB", 415 is "isn't a PDF"). A chunked upload without a
Content-Length is still spooled by the server before the handler caps it.

## Not done

- The dashboard's own scan page (`/dashboard/scan`) keeps its layout and the
  "Scan again" pop up (`ReuseCvDialog`); only its picker is the new one.

## One button, no question (2026-10-12)

**Founder's decisions, 12 Oct 2026.** The first reverses the 5 Oct "the hero
is the headline only" call (`docs/changelog/2026-10-05-landing-look-around.md`).
Last week 118 of 148 outside page views were the home page and 4 visits
finished a scan (about 2.4% of visits). The first screen had no CV button, and
"free", "no account" and "deleted" were 1 to 4 screens down
(`docs/local/home-audit.html`).

- **Hero:** eyebrow and headline kept ("The list is shorter than it looks.").
  One subtitle in the lede slot, at its size: "We count the skills tech jobs
  ask for each week and mark the ones on your CV." Then one centred button,
  "Compare your CV", and under it, small: "Free. No account needed. Your PDF
  is deleted after reading." All three facts are true signed in or not. The
  button opens the sheet for the job type on the count, so the result is
  still "7 of 10". Above the fold at 390x844 and 1440x900 in both themes
  (`docs/local/shots/home-change/`).
- **The question ask is gone everywhere** before a scan: the count card's line,
  the market and years pages' card, and both sticky lines (landing and
  market). The market and years pages get the same `CompareCv` in the card's
  place, one per page, so search visitors can still scan. After a scan the
  answer (`AskCard`) shows there as before.
- **13 Oct: nothing under the button** (founder: too much text). The trust
  facts stay in the sheet. A new look for the button is in review
  (`decisions/design-system.md`, "The CV button"; issue #6).
- **The button** keeps the design system's radius (`rounded-lg`, 8px), not the
  pill (`decisions/design-system.md`).

**How we judge it.** No split test: at about 4 scans a week it can't decide
anything. Visit to scan from the 2.4% baseline (home page visits, 5 to 12 Oct)
over 2 to 3 weeks, read in PostHog as home `$pageview` → `cta_clicked` (by
`where`, `hero` against the rest) → `scan_started` → `scan_finished`, and the
new `file_refused` and `scan_failed.reason` to see where people drop between
the click and the result. If the sample is still too small at 3 weeks, we say
so rather than call it.
