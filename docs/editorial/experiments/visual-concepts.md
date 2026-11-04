# Visual concepts

One section per concept. Sketches with the real numbers: `docs/local/editorial-concepts.html` (local only).

---

## Investigation 1: Where do the 2 years come from? (14 Oct 2026)

The evidence (see the investigation's `research.md`): 2,847 software titled ads; 134 ask for exactly two years, and 95 of those have no level word in the title, 26 say level II or mid, 2 say junior; 72 ads say junior, new grad or graduate, and 59 of them state no number.

### Concept A · The title ladder
- **Premise:** sort every ad by what its title says, one rung each, and show for each rung how often a number is stated and which number.
- **Reader journey:** the question; the ladder (six stacked bars, 2,847 ads); read across a rung, then read down the lime "2 years" band; tap a rung for five real titles; the wording of "2 years"; limits; explore.
- **Form:** horizontal 100% bars, hatched grey for no number, green bands by years, lime for two years. Space Grotesk rung labels, mono counts. Static; one tap to inspect titles.
- **Why it fits:** it's the complete table. Both findings fall out of one picture, so no denominator looks chosen.
- **Trade offs:** a ladder implies a career progression the data doesn't establish. It reads as a chart about ads, not about the reader's belief. Six bars of proportions are harder to feel than units. It's the form the market pages already use (`Stacked`), so it's the least distinctive.
- **Verdict:** keep as the appendix view of Concept C, and as the share image fallback. Not the lead.

### Concept B · The titles themselves
- **Premise:** the ad titles are the visual material. A field of the 134 two year titles set in type, with the two junior ones lit; then the 72 junior titles with their 13 numbers.
- **Reader journey:** a wall of plain titles ("Software Engineer, Platform", "Backend Engineer, Payments"); the reader looks for a level word and mostly can't find one; the two junior ones glow; then the junior wall, almost all without a number.
- **Form:** typographic composition in Schibsted Grotesk at small sizes, level words in bold ink, lime for the ads that ask two years, hatch behind "no number". Could use Caveat for the storyteller's marginal notes.
- **Why it fits:** it makes "no level in the title" literal. The reader does the reading we did.
- **Trade offs:** 134 titles on a phone is a long scroll of small type; the eye can't count a wall; titles name employers' products, so some need trimming, which invites "cherry picked"; the junior wall of 72 is the only one small enough to read whole. Accessibility: a wall of text as a chart needs a strong text summary.
- **Verdict:** rejected as the lead. Its best part survives in C as "tap a group to read five titles" and one short wall in the "what 2 years looks like" section.

### Concept C · Count the ads (recommended)
- **Premise:** the reader's belief is the story. Every two year ad is one square. Before the squares sort, the reader says where they think they sit. Then the 72 junior squares: the reader guesses how many carry a number, then sees 13 light up.
- **Reader journey:** a question and 134 unsorted squares; a choice ("most of them say: junior / nothing / level II / senior"); the squares sort into title groups with counts, the junior group gets 2; the second act, 72 junior squares and a slider guess; 13 light; what those 59 say instead (experience, internships, projects, a degree); the ladder as the complete table; what 2 years looks like in an ad; limits; explore.
- **Form:** unit charts in the product's own squares idiom (`LeadSquares`), reflowing by count. Ink squares, lime for the ones that carry a number, outline for internships where shown. One display sized number per act. Two interactions, both with the answer shown when JavaScript is off. Step by step structure, not scrollytelling.
- **Why it fits:** the complaint it answers is a belief, so the story is a belief tested; 134 and 72 are small enough that every square is honest and countable; the squares are already Glassbox's signature, so the story is recognisably ours without a template; it's phone native (squares reflow, buttons not hover).
- **Trade offs:** the guess could feel like a quiz if the copy is glib; two guess steps is the maximum; it must not imply employers hide levels on purpose. Needs one new component (`UnitSort`, a sortable grid) and a small backend count.
- **Verdict:** chosen. See `investigations/where-do-the-two-years-come-from/storyboard.md`.

### Rejected directions log
- **Scrollytelling on one chart:** more build, worse on phones, and the two reveals work better as taps.
- **A timeline of weeks:** two weeks of data isn't a trend.
- **Illustrated characters (a "junior" and a "senior"):** invites intent claims and stock looking figures. If illustration enters later, it's one hand drawn mark for uncertainty (see the Chalabi note), not people.
- **Employer names on squares:** the method section already lists titles with employers; naming employers in the story's lead would read as a call out.

---

## Art direction sprint, 14 Oct 2026 (supersedes the three concepts above for this investigation)
Three rendered prototypes in `docs/local/editorial-sprint/`: **A · The word that isn't there** (typography as evidence), **B · The job ad atlas** (the population as a field), **C · The unfolding investigation** (one stage, seven scenes). Scores and the recommendation are in `sprints/2026-10-14-two-years-art-direction.md`. Recommended: A, with C's structure for its second half; B kept as the appendix view and share image. The earlier "Count the ads" guess steps were dropped: the brief asked not to turn the story into a quiz, and C shows the assumption can be stated instead of asked.
