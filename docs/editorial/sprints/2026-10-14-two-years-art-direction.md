# Art direction sprint: Where do the two years come from? (14 Oct 2026)

**Status:** three prototypes rendered and scored; recommendation made; nothing built in production, nothing published. Awaiting the founder's reaction.

**Workspace (local, git ignored):** `docs/local/editorial-sprint/`: `index.html` (comparison with screenshots), `a-typography.html`, `b-atlas.html`, `c-unfolding.html`, `shared.css`, `data.js` (provisional counts and the 134 + 72 titles), `shots/` (desktop and phone renders), `refs/` (reference captures for study, not for publication).

**Data:** live pool, 14 Oct 2026 12:31 UTC, software titled ads (2,847). Every figure is provisional until recounted on three Monday publications (`investigations/where-do-the-two-years-come-from/research.md`). Rung counts used here: internship 172, junior 72, associate 19, plain 940, level II/mid 86, senior 911, staff/lead 647. These differ by a few ads from the earlier table because the sketch's associate rule is now case insensitive; the brief's four headline figures are unchanged (134; 2; 72; 59).

## What was studied before designing

Captures in `refs/` (The Pudding: ethical champions, essential words, hip hop vocabulary, the home page; Our World in Data grapher), read at 1280px and 390px. The specific lessons that shaped the prototypes:

| Observed | Where | Applied |
|---|---|---|
| The opening is one first person sentence in a 520px column. No headline, no image above the fold. | ethical champions | A opens on one composed statement; B and C keep the first screen to the question and one visual |
| Charts break out of the text column; dashed gridlines run full width; captions are grey mono | ethical champions | B's atlas is full width under a narrow lede; all three use mono captions and source lines |
| Illustration is inline, paragraph sized and witty, never a hero | ethical champions | A's hand drawn "level?" note; C's handwritten complaint line |
| The subject matter is the page material: list words scattered at the edges, then sorted and coloured by one rule | essential words | A's wall of titles; C's tiles with real titles; one lime rule everywhere |
| An annotation box overlaps the chart; colour only for change categories | essential words | B's Caveat annotations anchored to bins; lime only for "exactly two years" |
| Each story has its own ground colour inside one system | home page | B is charcoal, A and C are paper, all share the fonts and colour roles |
| A thin, centred display title and an "updated" sticker | vocabulary | Not copied: Glassbox stays heavy, left aligned Space Grotesk |
| Title states the finding; source and "learn more" under every chart | OWID | Figure captions name population, date and denominator in all three |

## The three directions

### A · The word that isn't there (typography as evidence)
Paper, ink, one lime. Opening: one real title at billboard scale with a dashed blank where a level word would be, the ad's own "2+ years" line, a three line lede. Then the wall of all 134 two year titles with only the level words in ink (toggle: fade everything else). Then the 72 junior titles beside a large numeral or a hatched blank; the display number 59. Then the keyword counts, the quoted wording, the method.

Storyboard: (1) open, (2) the wall and the fade, (3) the tally, (4) the 72, (5) a blank isn't "no experience", (6) what two years looks like in an ad, (7) how we counted and what it can't say.

### B · The job ad atlas (the population as a field)
Charcoal and the product's blueprint grid. 2,847 marks, one per ad, rows by title group, columns by years stated; hollow for none, lime for exactly two. Filters (all / the 134 / the 72) dim the rest; tap a lime or junior mark to read its title; two handwritten annotations anchored to bins. Then "2 of 134", the junior zoom (13 of 72 filled), "59 of 72", method.

Storyboard: (1) open on the field, (2) read the shape, (3) filter the 134, (4) 2 of 134, (5) filter the 72 and zoom, (6) 59 of 72 and what they say, (7) method.

### C · The unfolding investigation (one stage, seven scenes)
Paper. A sticky stage beside a stepped text column. The same 134 ads persist as tiles with real titles: the complaint as an ad fragment, the 134 pour in, sort by title, switch to the 72 junior ads with numbers revealed on the tiles, the keyword bars, the ladder, limits. Next/previous, arrow keys, a trail.

## Scores from the renders (1 to 5)

| | A | B | C |
|---|---|---|---|
| Opening creates curiosity | 5 | 4 | 4 |
| Memorable visual idea | 5 | 4 | 4 |
| Art directed, not templated | 5 | 4 | 3 |
| Evidence shapes the composition | 5 | 5 | 4 |
| Main point without reading | 4 | 4 | 3 |
| Develops through the story | 3 | 3 | 5 |
| Interaction helps | 4 | 3 | 4 |
| Glassbox, not the market template | 5 | 4 | 4 |
| Legible, accessible, credible | 4 | 3 | 3 |
| Phone | 4 | 2 | 4 |
| Data integrity | 4 | 4 | 4 |
| Worth reading without Glassbox | 5 | 4 | 4 |
| Visual craft | 5 | 4 | 3 |
| Originality of the idea | 5 | 4 | 3 |

Honest shortcomings seen in the renders: A's second half is lists and boxes and its phone wall is long. B's marks are 7px (3px on phone), too small as tap targets, its annotations are hidden on phones, and the plain row becomes a tall thin strip at 390px. C's tile text is 8.5px, under the 12px chart floor, its stage reads as a card and its stepper as UI, and it is empty without JavaScript.

## Recommendation
**A, with C's structure for its second half.** A's first screen belongs to this story alone, and its main visual is the evidence itself. Borrow C's tiles for the 72 (number revealed on the tile) and C's ladder scene as the complete table. Keep B as the appendix view and the share image, not the lead. Fix before anything is built: the "up to N years" parse; three Monday recounts; the phone wall defaulting to "only the level words"; replacing the tally boxes with one typographic line.

## Next step toward a browser prototype
1. The parser fix and the recount (its own issue).
2. Revise A per the list above, in the sprint workspace, and re-screenshot.
3. Founder approves the revised A render.
4. Then `implementation-notes.md`: the counts in the publication, `TitleWall`, `JuniorTiles`, `TitleLadder` inside the market shell.

## Follow up, 15 Oct 2026: one section, three ways
Workspace: `docs/local/editorial-sprint/section/` (`index.html` compares them with screenshots). The section that presents the two year ads, rebuilt on verified data (125, not 134):
- **Baseline:** the wall of titles from A, unchanged. Shown to be inaccurate as well as text heavy.
- **T1 · the starting line:** each ad drawn as a line from two years to the top of its range (fading where the ad names no top), grouped by the level word in the title. Recommended.
- **T2 · the ledger:** each requirement in its own words, aligned on the number, beside the level word or a grey hatch. Kept as the "read all 125" layer under T1.
Reference lessons applied: the mark is the subject; no chrome, one solid reference line, dashed gridlines, labels on the data; words narrow and data wide; phone is a recomposition; a new form when the argument changes.

## Visual essay prototype, 15 Oct 2026
The founder rejected all text and chart treatments as hard to read and uncreative, and asked for people silhouettes, blog type and better spacing. Prototype: `docs/local/editorial-sprint/essay/` (`index.html`, `people.js` draws the cast, `essay.css`, `essay.js`, `data.js`).
- **The cast:** every job ad is a person in ink, holding the tool of its trade (role from the title: software broadly, data and platform, AI, mobile, embedded and hardware, web), wearing its title as a name tag (blank, a level word in grey, junior in lime). Junior titled ads wear a cap and hold up the years they ask for; a blank sign is hatched, the brand's mark for "not stated".
- **The turn:** the page goes dark when the question flips from "who asks for two years" to "what do junior ads ask for".
- **Type, proposed:** reading text in Schibsted Grotesk at 21px (18.5px on phones) in a 620px column, display in Space Grotesk, Caveat for the storyteller's notes, almost no mono. This departs from the 7 Oct decision (Source Serif 4 for editorial reading text) and needs the founder's yes before CLAUDE.md and the brand book change.
- Graphics: the crowd (125), the crowd sorted by name tag, six voices quoting their ads, the road with a flag for every stated top, the 71 sign holders, five counts of what blank signs ask for instead.

## Visual essay v2, 15 Oct 2026
Founder: liked the silhouettes and the direction, but they were overused, and Space Grotesk headings read harsh. Asked for a lighter font like The Pudding's and a wider range of objects. Prototype: `docs/local/editorial-sprint/essay-v2/` (reuses `essay/data.js` and `essay/people.js`).
- **The Pudding's type, measured:** Atlas Grotesk (Commercial Type, paid) for headlines and often body, 48px bold headline, 20px/33px body in a 560 to 600px column. Some stories pair it with Tiempos Text. Free near equivalents: Inter (closest), Hanken Grotesk, Work Sans, Instrument Sans. v2 sets one sans for everything we write, with a picker to compare in place; Inter is the default.
- **One object per beat, each from the job hunt itself:** a billboard (the complaint), a classifieds page of all 125 ads with level words circled in pen (the evidence as text), tally marks (the count), people with speech bubbles (six voices, the only crowd of people left), a tape measure from two years with a bracket for each stated top (the ranges), graduates holding signs on the dark page (the turn), a CV on the desk with margin notes and sticky notes of real quotes (what blank signs ask for instead).
- **Devices borrowed from references, not copied:** The Pudding pockets (draw the real object, test the claim against it), ethical champions (marks that belong to the subject, restraint), the highlighter in the prose for the one phrase that matters.
- **Open:** the font choice (founder to pick), and whether the tally and tape stay hand drawn or get a cleaner finish.

## Visual essay v3, 15 Oct 2026
Founder: Hanken Grotesk chosen; still too many silhouettes; wants colour and personality. Reference studies included The Pudding's photo-head dolls, a Las Vegas welcome sign, and price stickers; working images remain in the local reference archive. Prototype: `docs/local/editorial-sprint/essay-v3/`.
- **Type:** Hanken Grotesk, self hosted (`fonts/`, OFL beside it). Captions under every figure in italic 15px.
- **Hero:** a Vegas style welcome sign ("Welcome to the fabulous ENTRY LEVEL, 2+ years required") in red, blue and bulb yellow, palm trees, sky; one doll in a cap waving under it.
- **Stickers:** the 125 ads as price stickers on the Help Wanted board. Price = the years. Colour = what the title says (white no level, sky II or mid, lavender senior or staff, yellow associate or level I, lime junior); shape = how the years are written (starburst "2+", hang tag for a range). A key under the board.
- **Dolls, only in two places:** colourful hand drawn bodies with big heads (skin, hair, shirt vary; the tool and name tag are data). Photo heads were considered: stock libraries like Unsplash give no model release for recognisable people, so faces of strangers would be a likeness risk. The doll's head is one group so a licensed photo (released stock, or people who agreed) can replace it.
- **Juniors:** 71 hang tags on a rail on the dark page, turned over to show their price: lime for a required number, outlined for a ceiling, wish or condition, hatched for none.
- **Research on what readers like:** Borkin et al. (2013, 2,070 visualisations): pictograms of recognisable objects were the strongest driver of memorability, and charts with 7+ colours were more memorable than sparse ones. Pudding readers praise interaction that lets them try the data, being treated as intelligent, and topics that entertain and inform.

**Founder, 15 Oct, on v3:** "really good improvement". Phone tags now five a row (15 rows instead of 18; checked at 390, 360 and 320px, nothing clipped). What's left is the title and some wording.

## Market home and a style per story, 15 Oct 2026
Founder: likes the direction; the essays go on the market home; asked for a new market home in The Pudding's grid, and for different creative styles for different stories. Prototype: `docs/local/editorial-sprint/market-home/` (covers in `covers.js`). The Vegas sign moved to `essay-v3/sign.js` so the essay and its cover share it. Checked at 1280, 820 and 390px in both themes: no sideways scroll, no errors, the filters work.

## Five market stories, 15 Oct 2026
Founder: titles must intrigue; each market page should get the two years treatment, every one in a creative style unlike the others; explore beyond The Pudding; use Fable for the creative work.
- Data pack: `docs/local/editorial-sprint/stories/data/` (the six live pages' text, tables and chart labels, week of 12 October 2026). The DevOps years chart labels only its larger bands; its aria-label gives 24 at 0 to 2, so the bands add to 302.
- Creative direction (one Fable agent, research into neal.fun, NYT You Draw It, Susie Lu's receipt, Ciechanowski, Nicky Case, Swiss Mountains, Reuters and WaPo unit marks): `stories/CONCEPTS.md`. Builders' brief: `stories/BUILD_BRIEF.md`.
- Built by five Fable agents, each checked by me (number checker against the pack, renders at 1280 and 390 in both themes):
  - **Pick a side** (entry level): foil trading cards; guess entry or senior, scratch to reveal. C++ 29% against 14%.
  - **The lobby is the biggest floor** (software engineering): a tower of 2,781 windows and a brass lift; press a floor, a corridor of that many doors opens.
  - **Contents may vary** (AI): a product box and its ingredients label; tap a line and that many of 567 pieces light; 273 name no programming language.
  - **Peak Python** (machine learning): an engraved panorama to one scale and a bronze orientation table with a sighting arm.
  - **Within eleven jobs** (DevOps): an isometric port, one container per job; drive the gantry across stacks of 248, 246 and 237.
- Market home cards now carry these titles and each story's own cover.
