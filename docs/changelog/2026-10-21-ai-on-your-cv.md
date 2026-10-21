# 2026-10-21: Do you need AI on your CV now?, the AI page's second story (refs #10)

The approved prototype (`docs/local/editorial-sprint/stories/ai-on-your-cv/`, revision three, founder: "it looks good
enough", 21 Oct 2026) ported into the site at `/market/ai/ai-on-your-cv`. Decision: `docs/decisions/market-pages.md`
("Stories"); the CV ask's places in `docs/decisions/analytics.md`. Brand book: the story's look (Tilt Neon, real door
photos in the opening only), the log and Still open. Review page: `docs/local/ai-on-your-cv-review.html`.

## What

- **The story.** One real ad (Holzland Becker's student software job, LLMs among its four skills) taped beside a real
  wooden door among 19 more door photos, one per job family. Wide: the row sticks and the camera pulls back, pans and
  hands over to drawn doors, the words following it. Then a guess on a building of 100 windows (drag, tap or the
  slider keys; "Show our count" lights 16 lime and moves focus to the answer; scrolling on shows it too), then steps 2
  to 7 on one canvas: a street of 19 drawn buildings sorted from the loudest ask for LLMs to the quietest, every
  window a drawn person for 5 jobs, lime where the job names LLMs; the AI door opens and its 160 people sort by the
  laptops they carry (47% name no programming language); Airbnb's listing on a lamp post; two doors by level (11%
  against 17%); the quiet embedded door (1%, one ringed person); the street again with two people at two doors. Three
  real listings are pinned where their step stands (on a phone, between the words and the frame). Then the ending,
  the CV ask, "What we can't see", "How we counted", chapter one's card and every photographer.
- **Code.** `lib/stories/ai-on-your-cv.ts` (every number, a comment per figure with its source);
  `components/stories/ai-on-your-cv/`: `AiOnYourCv.tsx` (server, the words), `Intro.tsx`, `Guess.tsx`, `Street.tsx`
  (client), `Listing.tsx` (a listing card, server), `buildings.ts`, `states.ts`, `stage.ts` (the street, its states
  and the canvas tween), `people.ts` (photo head characters, the guess's building), `doors.ts` (door photos, their
  boxes and photographers), three CSS modules. Route and share image under `app/market/[page]/ai-on-your-cv/`; hub
  cover `components/stories/covers/ai-on-your-cv.ts`. Chapter one's `marker.ts` gained `laptops` on a person and its
  `sprites.ts` takes a story's own kinds; chapter one draws as before.
- **Assets.** 20 door WebPs (480 x 720, 1 MB in all) in `public/stories/ai-on-your-cv/doors/` and two heads (WebP,
  21 and 25 KB) in `public/stories/ai-on-your-cv/heads/`, each folder with `CREDITS.md` (photographer, Pexels page,
  licence); every photographer is named and linked on the page. Tilt Neon fixed at its upright default and cut to
  Latin (25 KB WOFF2, from 583 KB) in `app/fonts/` with its OFL, loaded by this route and the hub only.
- **Theme.** The prototype's own switch and storage are gone: the site opens every story light, and the reader's
  Dark choice turns it to the street at night (no backing shapes, clear panes, a lighter marker ink).
- **CV asks.** After the guess, at the street and at the end, each its own `cta_clicked` place (`story_ai_on_your_cv_guess`,
  `_street`, `story_ai_on_your_cv`), about six AI skills (llm, ai agents, rag, machine learning, ai assistants, mlops).
  `StoryCvAsk` now passes `place` for a story that names skills too, and an ask inside the story steps aside once the
  reader has an answer, so the answer stands once, at the end.
- **Analytics.** `story_interacted` kinds `guess` and `show_count` under `ai-on-your-cv`.
- **Two of its stories on the AI page.** The new story leads the AI page's rail; the hub has its card after the
  lobby; the sitemap lists it after the AI page.

## Differences from the prototype

- The CV asks' words: the prototype's "the skills these 3,370 jobs name" and "the skills your door names" claimed a
  comparison the sheet does not make. They now say what is compared: "That's the count. Curious which AI skills are
  already on your CV?", "Whichever door is yours, curious which AI skills are already on your CV?" and "Curious which
  AI skills, LLMs among them, are already on your CV?".
- Phone, step 5: the prototype's frame showed stray street people over the entry level door and cut the doors' signs.
  The street is put away and the signs sit inside the frame.
- Site parts the prototype had not: the crumbs, the week line near the top and after the ask, "How we counted", the
  source line's "how we count" link.

## Numbers' source

Week of 19 October 2026, publication id 4: `look.families.<family>` (readable, skills.llm) for the 19 buildings,
`pages.ai.story.languages.per_job` for the AI door's four groups, `pages.entry-level-software.story.skills` (llm) for
entry level against senior. The four listings as posted that week. Each figure's line is in the data module and in
the prototype's `NOTES.md` and `script.md`.

## Cost

None. Static: the page reads no publication and calls no API on a build or a visit; the door photos, two heads and a
25 KB font come from the CDN with the page. No schedule, no new request to a paid service. A CV button wakes the API
only when a reader presses it, as on every story.

## Tests

`lib/stories/ai-on-your-cv.test.ts` (22): the street sorted, each sign's per cent from its count, game as a count;
379 + 196 + 134 + 91 = 800 shown as 47/25/17/11; 72 of 627 is 11%, 485 of 2,796 is 17%, 16 of every 100; the drawn
people (19 buildings, 2,486 in all, the laptop groups 76/39/27/18, 125 and 559 at the level doors with 14 and 97 lime,
one ringed of 73); the phone's level doors keep the street out and the signs in (fails on the prototype's layout,
checked once); the four listings' skills and their labels; every door and head file, credit and on-page name; the key
sentences and each graphic's text alternative pinned; the asks name no jobs or numbers; the six skill keys in the
vocabulary; the cover and the card line. `cta.test.ts`: an in-story ask of a skills story says its own place, and
steps aside after a scan (each fails without its change, checked once). `index.test.ts`: both AI stories on the
rail, the hub and the sitemap (fails without the registration, checked once). Updated: hub order, sitemap,
interactions, page wakes. tsc, vitest (all), `next build` against the local site database. Playwright on the built
site at 1280 and 390, light and dark, the opening's pan, every step, reduced motion and the keyboard guess: no console
errors, no request off the site, no sideways scroll.
