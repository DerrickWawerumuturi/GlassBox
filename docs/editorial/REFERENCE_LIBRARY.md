# Reference library

Few references, studied closely. Each entry names the exact element, why it works, what to borrow, how it could apply to a job market story, and what not to copy. No screenshots of other publishers are stored here; `references/` holds only our own captures and diagrams. Reviewed 14 Oct 2026 by reading the pages; where a page couldn't be loaded, the note says so.

## 1. The Pudding, "Ethical NBA Championships, Ranked" (Russell Samora, July 2026)
https://pudding.cool/2026/06/ethical-champions/

- **Element:** the "pile of heads". Every game an opponent's player missed is a head, sized by how much that player mattered. One picture carries the whole method.
- **Why it works:** the unit of the chart is the unit of the argument (a missed game, by a specific player). The reader counts with the author instead of trusting a bar. Illustration (cartoon bodies, real heads) gives personality without hiding the data.
- **Also notice:** a plain opening claim ("there have only been five truly ethical champions"), then the method built in steps, each with its own small chart; interpretive guidance beside numbers ("+6 is MVP tier, +3 is a star"); methodology in full at the end, quoted exactly ("If a player missed 75% of their normal minutes and had a DPM of 2.0, then their missing DPM would be 1.5").
- **Borrow:** one visual unit per real thing; a claim first, the method as the story; interpretive scales next to numbers; a complete method note.
- **For us:** one square per ad is already Glassbox's lead visual idiom. A story can sort, light up and recount those squares, so the reader counts the 134 two year ads themselves.
- **Don't copy:** the illustration style, sport colour coding, the ranking frame.

## 2. The Pudding, "How the words we teach English learners changed" (July 2026)
https://pudding.cool/2026/07/essential-words

- **Element:** the subject matter is the visual material. Words from the two lists are scattered as the opening ground, then sorted and coloured by kept, removed, added.
- **Why it works:** nothing is abstracted away; the reader sees the actual words and the encoding (colour for change) is one simple rule. Captions narrate the pattern ("More abstract words, fewer concrete ones"). Methods at the end.
- **Borrow:** when the data is text, show the text. One encoding rule per chart, stated in the caption.
- **For us:** job titles are text. A field of real titles, with the ones that ask for two years lit, makes "no level in the title" tangible. Risk: sampling must be the whole set or clearly stated.
- **Don't copy:** the animated opening, the right hand browsing panel as a layout.

## 3. The Pudding process notes
https://pudding.cool/process/how-to-make-dope-shit-part-3/ and https://pudding.cool/process/pivot-continue-down/

- **What they say:** three structures: stacked charts with editorial text, scrollytelling on one evolving chart, and step by step with short text per step. Lead with "a sledgehammer stat" when the finding is simple; start from "a single data point" when it's complex. Part 2 adds: "don't design in code", mock up first; quality is "a function of hours invested". The decision guide asks seven times whether to continue, pivot or put it down: unique question, answerable with data, ethical to use, interesting results, right storyteller, still interesting after storyboarding, final quality.
- **Borrow:** mock up before code; the seven checks (now in `STORYTELLING_GUIDE.md`); step by step as the phone friendly structure.
- **Don't copy:** scrollytelling by default. They say themselves it costs more and breaks on phones.

## 4. Our World in Data
https://ourworldindata.org/

- **Element:** the chart header: a title that states the finding, a subtitle with the unit and population, the source line and a "learn more about this data" link under every chart; direct labels on series instead of legends; the same chart downloadable and viewable as a table.
- **Why it works:** every chart is self contained when screenshotted. Trust comes from the chart carrying its own provenance.
- **Borrow:** the finding as the chart title; unit and denominator in the subtitle; source and table twin always. Our `Figure` already does most of this.
- **Don't copy:** the house style of line charts and the grapher's controls; we don't need an explorer.

## 5. Mona Chalabi (Guardian US, hand drawn data)
Sources read: Dezeen interview (Nov 2023), It's Nice That, the AMS blog on her Datasketches.

- **Element:** hand drawn charts where the pen's imprecision is the point. In her words, drawing by hand says "we think it's somewhere between this and this"; "true data is not to the decimal place".
- **Why it works:** the illustration communicates uncertainty honestly and makes a number felt in a few seconds.
- **Borrow:** a hand drawn mark (we have Caveat and a note style) where a count is small or uncertain, so precision isn't implied. For example, the 72 junior titled ads should not look like a 0.1% survey result.
- **Don't copy:** her palette, her figures, or hand drawing everything. One hand drawn moment per story at most.

## 6. The New York Times "You Draw It" charts
Sources read: FlowingData, "Make charts that ask readers to predict the line" (2019); the Northwestern MU Collective notes on the pattern.

- **Element:** the reader draws or sets their guess before the real data is shown; then the real line appears next to their guess.
- **Why it works:** the finding becomes a correction of the reader's own belief, which is remembered far longer than a number. It also respects the reader: they answered first.
- **Borrow:** a guess step before the main reveal, with a plain static answer when JavaScript is off.
- **For us:** "How many of the 72 junior titled ads state a number of years?" is exactly a belief people hold strongly and wrongly.
- **Don't copy:** free hand line drawing on a phone; a single tap or slider is enough.

## 7. Glassbox, the entry level market page (our own, the "before")
`references/glassbox-entry-level-desktop-first-screen.png`, `references/glassbox-entry-level-phone-first-screen.png`, full pages in `docs/local/shots/`.

- **What works:** the finding as the H1; the serif dek with the count; the lead squares (one per job, lime for the headline skill, outline for internships); every figure with a source line and a table twin; the method section with the actual titles.
- **What reads as an informational website:** every finding sits in the same card with the same bar form; one column with a rail, the same rhythm from top to bottom (8,600px on a phone); the squares are the only moment with scale or surprise; nothing asks the reader anything; the first screen could open any of the five pages.
- **Keep:** the squares idiom, the figure grammar, the byline and source conventions, the serif reading text.
- **Change for a story:** one central visual idea, a composition that varies, a first screen specific to the question, and a reason to keep scrolling.

## Observed on 14 Oct 2026 (captures in `docs/local/editorial-sprint/refs/`, private)
What the pages actually look like at 1280px and 390px, as opposed to what they say about themselves:
- **Ethical champions:** the first screen is the wordmark and one first person sentence at about 32px in a 520px column, then one short paragraph. No headline, no hero image. Charts run wider than the text with full width dashed gridlines; captions are small grey mono; illustrations are inline at paragraph scale (a figure diving after a ball, captioned with a joke). On a phone the column is the whole width and the DPM table is a plain mono table.
- **Essential words:** the subject words are scattered at the page edges in grey italic caps around a centred serif introduction. The ring chart puts words on the arc; an annotation box overlaps the chart. Colour means one thing: orange removed, pink added, beige kept. On a phone the ribbon chart keeps mono labels and the same three colours.
- **Hip hop vocabulary:** a thin centred display title, a dek, a byline, a yellow "updated" sticker. Restraint, not fireworks.
- **Home page:** stickers ("our faves", "popular") and a story number give the publication its identity; every story card has its own ground colour.
- **OWID grapher:** the chart header states the finding; the source and "learn more" sit under every chart; a table view is one click away.
- **Ethical champions, studied chart by chart (15 Oct):**
  - The logo beeswarm has no frame or background, one dashed zero line, 12px grey mono ticks, direction words at the axis ends and a year beside every logo. On phones it rotates to a vertical axis.
  - The scribbled bar chart (games missed) is a plain bar chart drawn with a hand's texture, and it also rotates on phones.
  - The "pile of heads" sizes each missing player's face by impact.
  - Reading text is 32px in a 560px column; charts break out to the full width.
  - Every new question gets a new form.
- **Hip hop vocabulary:** a beeswarm of faces along one axis, with an axis break for outliers.

Lessons applied in the sprints are listed in `sprints/2026-10-14-two-years-art-direction.md`.

## Capture template
For every new entry: project and URL; date reviewed; the exact element; what I notice; why it works; the principle to borrow; a possible Glassbox application; what not to copy; our own sketch path if any.
