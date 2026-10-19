# 2026-10-19: Is entry level dead?, the entry level page's second story (refs #10)

The approved prototype (`docs/local/editorial-sprint/stories/entry-level-dead/`, words edited by the founder, Pexels
photo heads approved, 19 Oct 2026) ported into the site at `/market/entry-level-software/is-entry-level-dead`.
Decision: `docs/decisions/market-pages.md` ("Stories") and `design-system.md` ("Is entry level dead?: drawn people
with photo heads"). Brand book: section 09, the log (13) and Still open (14). Review page:
`docs/local/is-entry-level-dead-review.html`.

## What

- **The story.** One real ad pinned to the page (Junior Software Engineer, Prima), a guess on 100 drawn people (tap,
  drag or the slider keys; "Show our count" raises 14 hands in lime and moves focus to the answer; scrolling on shows
  it too), then steps 2 to 8 as one canvas: the week's 4,536 software jobs as a crowd of drawn people that sorts onto
  a ladder (2,816 senior, 1,091 mid level or not saying, 629 entry level), the bottom step lit with 250 tally marks,
  the 274 internships turning lime with four quoted titles on lime slips, the 368 titled jobs in name tags (339
  blank), 4 against 6 required skills with a card to chapter two (Pick a side), and three weekly points labelled
  "too early to tell". Wide: one sticky frame tweened step to step. Phone (760 px and under): a still frame under each
  step, one drawn person to 25 jobs. Then the ending, the CV button beside a waving character, "What we can't see",
  "How we counted" and the photo credits.
- **Code.** `lib/stories/is-entry-level-dead.ts` (every number, a comment per figure);
  `components/stories/is-entry-level-dead/`: `IsEntryLevelDead.tsx` (server, the words), `Guess.tsx` and
  `Ladder.tsx` (client), `marker.ts` (the marker line and one person's geometry), `people.ts` (SVG people, heads,
  slips), `sprites.ts`, `layouts.ts` and `stage.ts` (the canvas crowd and its tween), `eld.module.css`. Route and share
  image under `app/market/[page]/is-entry-level-dead/`; hub cover `components/stories/covers/is-entry-level-dead.ts`.
- **Photo heads.** Four Pexels heads as WebP (480 px, 15 to 25 KB each, from the prototype's PNGs) in
  `public/stories/is-entry-level-dead/heads/` with `CREDITS.md`; the four photographers are named and linked on the
  page. The prototype's three spare heads are not copied: nothing uses them.
- **Two stories on one page.** `storyFor` (the first story only) became `storiesFor` (all of them): the entry level
  page's rail links both stories, the hub has a card for each (the newest leads, Pick a side follows the years card),
  the sitemap lists both after the page.
- **The CV ask without skills.** The story names no skills, so `StoryCvAsk` opens the CV sheet about the latest jobs
  (as the hub's card does; results on /analysis) instead of a "0 skills" sheet, after the founder's own line.
  `StoryCvAsk` takes the line before the button as `question` (default unchanged).
- **Analytics.** `story_interacted` kinds `guess` and `show_count` (not sent by the reveal on scrolling past);
  `cta_clicked` where `story_is_entry_level_dead`.
- **Copy test.** `copy-words.test.ts` ignores web addresses: the Indeed source's URL says "job-postings".

## Why

The founder's chapter one for the entry level page: the fear ("is entry level dead?") against one week's count.

## Numbers' source

Week of 19 October 2026: the entry level page of publication id 4 (`pages.entry-level-software`: jobs 629, readable
627, employers 250, internships 274, senior 2,816, experience.software 2,409 + 2,127 = 4,536, experience.titled 29 +
339); the weeks of 5 and 12 October (ids 1 and 3) for the three points (532 of 3,274; 561 of 3,595). Stanford Digital
Economy Lab (revised 12 Aug 2026) and Indeed Hiring Lab (8 Jul 2026), linked where used. Each figure's line is in the
data module.

## Cost

None. Static: the page reads no publication and calls no API on a build or a visit; four small WebP files and the
page itself from the CDN. No schedule, no new request to a paid service. The CV button wakes the API only when a
reader presses it, as on every story.

## Tests

`lib/stories/is-entry-level-dead.test.ts` (15): 629 + 1,091 + 2,816 = 4,536; 629 - 274 = 355; 339 + 29 = 368;
shares 16.2, 15.6, 13.9 shown as 16%, 16%, 14%; "about 1 in 7", "14 of every 100"; the crowd 454 /
182, steps 282 / 109 / 63 and 113 / 44 / 25, the split 36 / 27 and 14 / 11, tags 34 + 3 and 14 + 1, labels from the
numbers; heads and credits present, every photographer named on the page; the key sentences and each graphic's text
alternative pinned; the cover and card line. `lib/stories/index.test.ts` (3): both entry level stories on the rail,
the hub and the sitemap (fails with the old `storyFor` rail, checked once). `cta.test.ts`: a story without skills
opens the general sheet (fails with the old `StoryCvAsk`, checked once). Updated: the hub's card order, the sitemap
list, the interactions test. tsc, vitest (392 passed), `next build` against the local site database. Playwright on
the built site at 1280 and 390, light and dark, every step, mid tween frames, reduced motion: no console errors, no
request off the site, no sideways scroll; keyboard guess (arrows, Page Up, Enter) and focus on the answer checked.


## Words fixed before the push (founder, 19 Oct)

Five edited lines were corrected at the founder's word: the ending now says the bottom step is thin, about 1 in 7 software jobs (it had said 1 in 7 "are software jobs"); step 2 says 4,536, not "around 5000"; the opening reads "advertised a job called Junior Software Engineer. It got us curious about the state of software jobs." and "We decided to investigate. Glassbox counts public job ads every week, so we looked at that data."; the line before the CV button is "Thanks for reading. Curious where your own CV stands against this week's jobs?". The test pins the new sentences and fails on the old ones.
