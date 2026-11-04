# 2026-10-12: one CV button on the first screen, the question ask removed (fixes #3)

Audit: `docs/local/home-audit.html`. Decision: `docs/decisions/cv-ask.md`
("One button, no question"), `docs/decisions/analytics.md`,
`docs/decisions/design-system.md` ("The CV button").
Review page: `docs/local/home-change-review.html`.

## The problem

Last week 118 of 148 outside page views were the home page and 4 visits
finished a scan. The first screen had no CV button, and "free", "no account"
and "deleted" were 1 to 4 screens down. The question ask (a blank count over
the skills, "Find out") made no sense to someone new. The sheet told everyone
"We keep the skills, not the file.", untrue without an account. A scan on a
sleeping API looked stuck past the sheet's "about a minute". The card said 309
backend jobs and the sheet 304; the sheet's example said "6 of 10" over 5
chips. The header "Try it out", a refused file and the reason a scan failed
sent nothing.

## What changed

- **Hero** (`components/landing/Hero.tsx`, new): headline kept; one subtitle,
  "We count the skills tech jobs ask for each week and mark the ones on your
  CV."; one button, "Compare your CV" (`components/cv-ask/CompareCv.tsx`,
  new, radius 8px), and under it "Free. No account needed. Your PDF is deleted
  after reading." Reverses the 5 Oct "headline only" hero (founder, 12 Oct).
- **The question ask is removed** before a scan: the count card's line, the
  market and years pages' card, and the sticky lines on the landing page and
  in the market title bar (`StickyCta`, `StickyAsk`, `StickyCvAsk` deleted,
  with `stickyLine` and `stickyShows`). The market and years pages show the
  same `CompareCv` in the card's place. After a scan the answer shows there
  as before (`AskCard`, now the answer only).
- **Sheet** (`lib/cv-ask.ts`, `CvSheet.tsx`): trust lines for who is reading
  (without an account: nothing kept on our servers; signed in: the skills
  from the latest CV, never the file); "compare them with the 303 backend jobs
  whose ads we could read"; the example is "3 of 5" over its 5 chips; past a
  minute of reading, "Still reading. This one is taking more than a minute."
- **Shared trust line** (`TRUST`, the closing section and the FAQ): "With an
  account, we keep the skills, never the file.", true either way.
- **Wake:** opening the sheet sends one `GET /health` per page load
  (`wakeApi`), fire and forget. The only wake; none on page load.
- **Events:** `cta_clicked {where}` gains `hero`, `header`, `menu` and
  `years`; `count`, `sticky` and the `ask` property retire.
  `file_refused {reason}` is new; `scan_failed` gains `reason`. Known names
  only; never a file name, CV text or skills.

## Tests

vitest: the hero is one subtitle and one button with the facts under it, the
market page shows the same button before a scan, no source file writes a
blank count question, the sheet's words for both states, the example adds up,
the job count names what it counts, the wait line at 60 s with fake timers,
one wake per page load, refusal and failure reasons, and event payloads that
drop file names, error text and unknown values. Each was seen to fail with its
change turned off once.
