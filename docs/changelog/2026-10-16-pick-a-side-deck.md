# 2026-10-16: Pick a side, as a real deck (refs #10)

Founder, 16 Oct 2026: "use an actual deck of cards rather than the generic blue/purple background ... get publicly
available assets for that rather than making your own." Then yes to the recommendations: spades for the seven
languages the weekly page charts and clubs for the other four skills, the blue back, one table per figure, no joker.
Prototype: `docs/local/editorial-sprint/stories/pick-a-side-deck/`. Decision: `docs/decisions/market-pages.md`
("Stories") and `design-system.md` ("Pick a side: a real deck"). Brand book: the log and section 06.
Review page: `docs/local/pick-a-side-deck-review.html`.

## The change

- **The deck's own art, self hosted.** English pattern playing cards deck PLUS CC0 (Wikimedia Commons, CC0 1.0):
  Loren Osborn's blue back in `frontend/public/stories/pick-a-side/back-blue.webp` (484 by 724, 152 KB; a 200 by 300
  PNG beside it for the share image), the spade and club pips as paths in `icons.ts` (`PIP`), and `LICENSES.md` with
  the CC0 legal code beside the back. "How we counted" credits the deck with the Commons link.
- **Cards.** `Face.tsx` draws a playing card: rank and pip in two corners (the bottom one turned round), a court
  frame with the skill's glyph in a medallion, its name, the two numbers ("ENTRY LEVEL 49% 276 of 559", "SENIOR 36%
  803 of 2,237", or "share only") under the scratch panel, and the employers line. The hero's face up C++ card and
  the game share it.
- **Tables.** Each figure is its own card table, green baize with a wooden rail (`Deal`, `Hand`); the words sit on
  the page's paper or charcoal (the navy table is gone). Cards deal face down and turn over as the table scrolls into
  view; "Reveal all" turns a table over even before it is reached. The two sides are betting spots on the felt under
  each card, the pen ring round the pick. The C++ pen note sits on the page beside its table.
- **The scratch panel** (`scratch.ts`, `ScratchPanel`) is printed with the deck's back (decoded once, navy until
  then), with a "scratch" label. Same brush, grid and 40% rule; Enter or Space reveals; reduced motion reveals on
  one tap. The foil (`Foil`, its gradient, sparkles and coin) is gone.
- **Suits.** `suit(card)` in `lib/stories/pick-a-side.ts`: a spade when the card's key is one of
  `PICK.charted.languages` (now the seven keys, not a count), else a club. One line under "The first card" says so;
  the hand's paragraph reads "The weekly page charts 7 languages, the spades." Each card has a `rank`.
- **Words.** "scratch the foil" and "rub the foil off" became "scratch the panel"; the tally says "under a card".
  No number changed.
- **The hand** is eleven small playing cards with corners, set down at slight angles on one table.
- **Cover and share image** show the deck: on the /market grid a baize table, two backs and the lime C++ card face
  up, its panel half scratched; the share image puts the same card and table on the paper page.

## Cost

None. Two static files from `public/` (the WebP on the page and the hub, the PNG read at build for the share image).
No new request to a paid service, no schedule.

## Tests

`lib/stories/pick-a-side.test.ts` (20): the seven charted languages are the spades and the other four the clubs;
"4 of them" are the spades that lean to entry level; every rank is short and unique; the back, its PNG, `LICENSES.md`
and the CC0 text are in `public/stories/pick-a-side/`, and no file in the story's folder says foil; the panel draws
the back; the rendered story says "scratch the panel", the suits line, "the spades", the deck credit, the corner
ranks and the panel's counts, with the pen note after the table; the cover draws the back and both shares. Each
failed once with its fix broken (suits all spades, "foil" back in the dek, the panel without the back, the cover
without it). tsc, the whole vitest suite (352), `next build` against the local site database; Playwright at 1280
and 390, light and dark, with reduced motion too: no sideways scroll, no console errors; a mouse scratch, a keyboard
reveal, the tally and "Reveal all" played through. Every number on the built page is in the data module or
arithmetic shown (2, the jobs too short to read; 5 and 5, the cards named beside them; 7, the charted languages).
