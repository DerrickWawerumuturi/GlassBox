# Decision: the CV ask is a question

**Status:** built 2026-10-07. **Founder's pick:** `docs/local/cv-ask-prototype.html`
(decision log in `docs/brand/guidelines.html`, 7 Oct, "The CV ask becomes a
question"). **Code:** `frontend/src/lib/cv-ask.ts` (words, which skills, the
count, the one ask rule, the scan's states and steps; tested in
`cv-ask.test.ts`), `frontend/src/components/cv-ask/` (the card, the sticky
line, the sheet, the picker, the scan hook).

## What changed

"Add your CV", big and orange in several places, read as a demand, and the
"File Upload" modal read as data collection. The ask is now a question about
the skills the page just showed: "How many of these are on your CV?", "? of 15",
the skills grey and dashed, and the button "Find out". The answer lands where
the question was asked.

| Where | Before the scan | After the scan |
|---|---|---|
| Market page, after the figures (`MarketCvAsk` on `AskCard`) | "How many of these are on your CV?", "? of 15", the 15 skills, "Find out", "About a minute. No account." | "9 of these are on your CV", the count in green, their skills green, the rest grey dashed (never red); "See the jobs that ask for them"; the figures mark their skills as before |
| Landing count card (`AskInline`) | "? of the 10 skills backend jobs ask for most are on your CV.", following the job type picked | the visitor's own number, in green |
| Landing closing section | "There's more of you in these jobs than you think." with "Find out" and "Sign up" | unchanged ("See your results") |
| Sticky line | market: "? of 15 skills here on your CV" in the title bar (desktop) or at the foot (phone); landing: the existing bar, "? of the 10 skills backend jobs ask for most are on your CV" or "? of the 6 asks in this ad are on your CV" | hidden |

The landing "Inside Glassbox" ask keeps "Add your CV" (beside an example
dashboard, it means "see yours"); /product, the header and /analysis open the
same sheet without a question (title "See where you stand") and go to
/analysis after the scan, as before.

## Which skills

- **Market page:** the 15 skills its jobs name most (`story.skills` by
  `any`), broad ones only (the breadth rule: named by jobs at 10 or more
  employers), or what the page has. A page with no broad skill asks about its
  most named ones. N is counted from the readable jobs, so the sheet says
  "compare them with 135 entry level software jobs" (readable), not 136.
- **Landing:** the job type's 10 most asked skills from today's look, in the
  count's order. An ad on the glass asks about its own asks.
- **k:** a skill counts when the scan's skills (`useHave`: the scan's skill
  presence plus the CV breakdown) match it by key or by name ("LLMs" and
  `llm`).

## One ask on screen at a time

The sticky line shows only when the reader is past the top (the hero, or the
market lead visual), no ask card is in view (`data-cv-ask`, watched by
`useAskInView`), the sheet is closed and no scan runs. After a scan it
**hides** rather than showing "9 of 15 on your CV": the answer already sits in
the card and in the figures, and a bar that stays after the question is
answered is pressure without a purpose.

## The sheet

A bottom sheet on a phone, a centred panel from 640px (base-ui Dialog, styled
as a sheet). Idle: the question, one sentence naming what we compare with, a
fixed example labelled "example" ("9 of 15", five chips), then "Choose your CV"
(phone) or a drop zone with "Choose a file" (wider). Choosing or dropping a file
starts the scan. The three trust lines, "PDF, up to 10 MB", "What happens to
your CV" (/your-cv). Signed in with a reusable kept CV: "Use your last CV" first
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

"The file is deleted once it's read." shows under the steps: `_pdf_text` in
`backend/main.py` writes a temp file and removes it in `finally`, for both
requests.

### The result

"{k} of {N}" in green, "of the skills entry level software jobs name most are
on your CV.", "See them on the page" (closes the sheet; the page has already
lit up). Signed out: "Keep them with a free account, to compare again later."
True today: once signed in, the browser's CV skills go to the account (`cv-store`
migrates them; `kept_cv` keeps the skills and derived values, never contact details) and Opportunities compares
them with each day's jobs; a scan made signed in also keeps the profile of
the latest CV (`latest_cvs`) for "Use your last CV".

## Words the founder named

"See them on the page" and "Use your last CV" are over three words. Both are the
founder's own, from the spec; `copy.test.ts` allows exactly these two.

## Analytics

`cta_clicked {where, ask}`: `where` is the market page's name or the landing
place (`count`, `inside`, `closing`, `sticky`, `product`); `ask` is `card` or
`sticky` on a market page. Scan events are unchanged (`scan_started`,
`cv_uploaded` or `cv_reused`, `scan_finished`, `scan_failed`). No new event.

## Turned down

- A per step timer (the old `AnalysisProgress` pacing): it claims progress the
  server never reported.
- Keeping the result in the sticky line after a scan (see above).
- A file name, skills or the count in any event.

## Not done

- `/analyze` and `/cv/parse` have no size limit on the server; 10 MB is
  checked in the browser only.
- The dashboard's own scan page (`/dashboard/scan`) keeps its layout and the
  "Scan again" pop up (`ReuseCvDialog`); only its picker is the new one.
