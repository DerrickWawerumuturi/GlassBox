# Glassbox visual identity and editorial system

**Status:** current guidance, checked against the local implementation on 4 Nov 2026. CSS tokens and rendered source are the authority for values; this document describes their intended roles. The system is *counted clarity, told visually*: Glassbox shows what job ads say, how the count was made, and leaves decisions to the reader.

## Three layers

| Layer | Keep consistent | Let vary |
|---|---|---|
| **Product** | Open-box mark and wordmark, peek interaction, theme-aware product tokens, functional controls and plain evidence-led voice | Layouts that serve the product workflow |
| **Evidence and editorial frame** | Finding, population, week/date, denominator, source, method, honest missing-value language, reading order and route to the live count | Figure width, pacing and sequence |
| **Individual story** | Accurate provenance, readable type, explicit data meanings, accessible text, keyboard/touch operation and reduced-motion/static state | Metaphor, composition, illustration, story display face and scenery palette |

The shared frame is not a page template. Reuse reporting and accessibility scaffolding; let each story invent the form that explains its evidence.

## Themes and colour meaning

The product supports **Light, Dark and System**. The theme choice is stored and applied before paint; System follows the operating-system preference in the product. On registered story/article routes, System resolves to paper/light; an explicit Dark choice still selects the warm night theme. CSS tokens are defined in `frontend/src/app/globals.css`; do not invent parallel token values or replace the established warm paper/charcoal surfaces.

| Meaning | Shared convention | Limits |
|---|---|---|
| Action, link, annotation, logo dot | Orange (`--primary`) | Not a data category in current dashboard, market-page or story grammar |
| Skill appears on a reader's CV | Green (`--chart-have`) | Pair with labels/shape; never imply quality |
| Gap, missing or not stated | Neutral grey hatch/outline (`--chart-gap`) | State which kind of absence; not equivalent to zero or no experience |
| Market-only values | Neutral ink (`--chart-ink`) | Do not imply a personal match |
| Focus highlight | Lime (`--accent-lime`) | One restrained highlight per figure unless the story key explicitly explains another rule |
| Missing skill in one specific job comparison | Soft red (`--missing`) plus minus mark | Narrow documented exception, not a general gap colour |

**Legacy surface:** `/analysis` still has older Recharts components and the `--chart-1…5`/`--chart-ramp-*` scales, including orange hues. That historical encoding is scoped to that route and must not be described as the shared data palette. The dashboard Market tab uses green for on-CV and neutral gap marks; its bars do not encode missing skills in orange. When that legacy surface is next changed, preserve its current behavior unless a separately approved product change explicitly migrates it. Story scenery may use bespoke colours; every story data colour needs one named meaning, a visible key and a text/table equivalent.

## Typography roles

All web fonts are self-hosted with their licence files in `frontend/src/app/fonts/`. Load display faces only on routes that use them, as the route modules do. Do not add another face just for variety.

| Context | Typeface and role |
|---|---|
| Product UI/display | Space Grotesk for headings; Schibsted Grotesk for UI and product reading; JetBrains Mono for data, labels and numbers; Caveat for occasional handwritten notes |
| Market reporting pages | Source Serif 4 for long reading, deks and captions; shared Space Grotesk headings, JetBrains Mono labels/numbers |
| Visual story shell and reading | Hanken Grotesk for story text, titles and captions; JetBrains Mono for count/source labels where used; Caveat only for a purposeful pen-note voice |
| Story-specific display | Bebas Neue — *Pick a side*; Limelight — *The lobby*; Bungee — *Contents may vary*; Allerta Stencil — *Within eleven jobs*; Tilt Neon — *Do you need AI on your CV now?*; no extra face — *Peak Python*; Alfa Slab One — separate *Count the rings* years page |

Story display faces belong to the story's physical metaphor and are limited to lettering, a short kicker or a deliberate count moment. They do not replace Hanken as the reading face. The older standalone AI article is a separate implementation and may have its own type choices. Keep existing scales and sizes; 12px is the floor for chart labels, and source/provenance text should remain readable.

## Evidence, figures and provenance

- State the finding, unit, population, time window and denominator close to each figure.
- Use direct labels where they make the comparison clearer. A chart's source line names the Glassbox count/week and links to the method; provide a table twin for multi-row figures.
- Label missing/not stated values explicitly and distinguish them from zero, absence of a skill, or no experience.
- Keep the written source, calculation, sample limits and any manual classification checks with the story's research and method notes.
- Credit photographs, adapted drawings, icons and typefaces beside the relevant assets or story. Record creator/source, licence, changes made and where it appears. Do not infer that an uncredited asset is cleared.
- Reuse typed story data for covers and story figures where possible. Covers are bespoke 400×400 illustrations; title, date and finding stay as text in the card.

## Accessibility and motion floor

- Figures expose a meaningful text description; provide a table or equivalent for dense data. Keep semantic headings, captions and source text in reading order.
- Controls work with keyboard and touch, show visible focus, and have at least 44px touch targets. No information depends on hover, colour alone or interaction.
- The complete finding is available in the static/server-rendered state. Interactive controls reveal or inspect evidence; they do not gate essential facts.
- Respect `prefers-reduced-motion`: skip decorative transitions and present the final/static state. No autoplay, scroll hijacking, dramatic count-up, or motion that suggests precision or causation.
- Validate at 390px and 1280px in Light and Dark, with keyboard, screen-reader semantics, touch and reduced-motion paths. A source review cannot establish a rendered pass. Record results and unverified states in the local design review log.

## Current visual inventory

### Brand marks, interface and data icons

- **Marks:** custom open isometric box, wordmark whose O is the box, orange dot, horizontal/stacked lockups, transparent and light/dark/orange variants, symbol sizes, poster marks, app icons and favicon. Approved exported artwork and clear-space/minimum-size notes live in `docs/brand/assets/`; the working mark is rendered by `frontend/src/components/brand/Logo.tsx`, `logo.css`, `Peek.tsx`, `peek.css`. Preserve geometry and the small keyboard/hover peek; orange dot is the only orange in the mark.
- **Functional icons:** Lucide icons for navigation, theme, copy/share and controls. Use them for interface actions, not to replace story illustration.
- **Skill marks:** technology SVGs in `frontend/public/skills/`; concept mappings in `frontend/src/lib/skill-icons.ts`. Keep brand marks distinct from a skill's meaning.
- **Editorial/data marks:** hand-built SVG, chart hatch/frames, card suits, annotations and bespoke story symbols. Treat a mark as data only when the copy/key defines it.

### Cast, photos and licences

The named cast is Amina, Joon, Kofi, Mateo, Rosa and Tomas; authored/reworked vector modules are in `frontend/src/components/people/art/`, rendered by `Person.tsx` and `draw.ts`. Their standing figures derive from Pablo Stanley's Open Peeps and three scenes from Open Doodles, both documented as CC0 1.0 in `frontend/src/components/people/LICENSES.md` (including changes and legal text). Some story heads/doors use credited Pexels photography with per-asset `CREDITS.md` under `frontend/public/stories/`. *Pick a side* records CC0 card-back and pip sources in `frontend/public/stories/pick-a-side/LICENSES.md`. Keep credits and licences with the asset; do not replace existing artwork or generate substitute art.

### Registered stories and covers

Seven entries are registered in `frontend/src/lib/stories/index.ts`; covers are mapped in `frontend/src/components/stories/covers/index.ts`. Each cover is bespoke and data-led:

| Registered story | Story form | Cover module |
|---|---|---|
| *Is entry level dead?* | Reader guess, drawn people and wooden ladder | `covers/is-entry-level-dead.ts` |
| *Pick a side* | Skill cards, guess/scratch reveal and comparison | `covers/pick-a-side.ts` |
| *The lobby* | One-window-per-job building, years floors and lift | `covers/the-lobby.ts` |
| *Do you need AI on your CV now?* | Door photographs, 100-window guess and job-family street | `covers/ai-on-your-cv.ts` |
| *Contents may vary* | Package/ingredient label, box opening and job components | `covers/contents-may-vary.ts` |
| *Peak Python* | Mountain range, peak inspection and surveying plate | `covers/peak-python.ts` |
| *Within eleven jobs* | Container yard, crane and one-container-per-job scene | `covers/within-eleven-jobs.ts` |

The separate **years-of-experience page, “Count the rings,”** is implemented at `/market/[page]/years-of-experience`, outside `STORIES`. It has a timber/log metaphor, an independently drawn hub cover (`market-hub/covers.ts`), server-rendered SVG figures, canvas pile interaction and Alfa Slab One. It is not the older proposed **“Where Do the Two Years Come From?”** investigation; that local-only concept brief records a separate, unapproved concept and its 14 Oct 2026 snapshot. Do not treat it as the brief or status for the live years page.

The older standalone **“When the Job Description Says AI, but the Data Doesn’t”** article remains under `frontend/src/components/stories/when-the-job-description-says-ai/` with opening/comparison artwork under `frontend/public/stories/ai-job-description/`. It is not one of the seven registered stories and is separate from the registered *Do you need AI on your CV now?* story.

Other hub covers include years, how-we-count/method and CV card; see `frontend/src/components/market-hub/covers.ts`.

### Shared figures and interaction/motion patterns

- Market reporting: `market-page/Figures.tsx` (`Figure`, `BarRows`, `PairRows`, `Stacked`, `TableTwin`, source line), `LeadSquares.tsx` (one square per job), `TitleBar.tsx`, `MarketArticle.tsx`, `StorySections.tsx`, `MarketCvAsk` and the years `Figures.tsx`.
- Plot frame and hatch: `components/Market/ChartPatterns.tsx`; legacy analysis Recharts components remain separate.
- Story scaffolding: `stories/StoryParts.tsx`, `story.module.css`, `StoryCvAsk.tsx`; story data lives in `frontend/src/lib/stories/`.
- Interactions in use: guess/reveal (entry level, AI CV, cards), scratch (Pick a side), inspect/select a floor and move a lift (The lobby), open/reveal a box (Contents may vary), inspect a mountain peak (Peak Python), move a crane over bays (Within eleven jobs), and sort/reveal log piles (Count the rings). Cite each interaction's learning purpose and static alternative.
- Motion is supportive and restrained: scroll observation may trigger a scene only when it enters view; no forced scroll. CSS and canvas paths must honor reduced motion. The default state remains readable without movement or script.

## Reference studies

Reference work supplies techniques, not a visual template. These notes are the
repository-visible summary; local study captures remain private.

- **Search Party (Sam Ellis / Newpress):** study the [show](https://newpress.com/) and the episode *How the UAE got too powerful to punish*. Borrow the one-question investigation and the way a trail of evidence can connect distant systems; use a map only where location matters. Keep Glassbox's job-ad unit, denominator and source trail. Do not copy its map graphics, video editing, motion language, palette or narration style.
- **The Pudding:** study [Ethical Champions](https://pudding.cool/2026/06/ethical-champions/) and [Essential Words](https://pudding.cool/2026/07/essential-words/). Borrow story-specific forms, evidence visible in the visual unit, a claim-to-method sequence, storyboard-first process and clear phone treatment. Do not reproduce a particular story's illustration or layout; scrollytelling is optional, never the default.
- **Johnny Harris:** the [Newpress profile](https://newpress.com/) describes maps, history and on-the-ground reporting as ways to explain context. Borrow the orientation-before-detail principle and explicit transitions from context to evidence. Verify claims against primary records and expose the sources. Do not copy his voice, map aesthetic, dramatic pacing or geopolitical framing.
- **Minji Moon:** the [Creative Boom profile](https://www.creativeboom.com/work/minji-moon/) (26 Apr 2021) describes boldness from limited hues and simplified shapes, unexpected/non-stereotyped colour, distinct character cues, and smooth, slow motion intended to feel like breathing. Transfer only the principle of selective shape economy, intentional palettes and quiet motion when the story benefits. Do not imitate the half-and-half faces, missing-eye motif, figures, compositions, palette combinations or signature style; do not use character art as a proxy for data.

## Source links

- Tokens and theme implementation: `frontend/src/app/globals.css`, `frontend/src/lib/theme.ts`, `frontend/src/components/ThemeMenu.tsx`.
- Product/brand decision: `docs/decisions/design-system.md`; data grammar and legacy surface: `docs/decisions/data-visualization.md`.
- Editorial index: `docs/editorial/README.md`. Private process and review notes stay local and are not linked as repository files.
- Brand source overview: `docs/brand/README.md`; mark rendering: `frontend/src/components/brand/`; approved mark exports: `docs/brand/assets/`.
