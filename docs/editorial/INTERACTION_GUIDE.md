# Interaction and motion

## The test
Every interaction completes this sentence, or it's cut:

> The reader can ___, which helps them understand or discover ___.

## Patterns that tend to earn their place
- **Guess, then see.** The reader commits to an expectation (a slider, a choice) before the data appears. Memorable because the finding becomes a correction of their own belief. Must work with the answer shown when JavaScript is off.
- **Select a group to inspect real examples.** Tap a category and see five real titles from it, so the reader can audit our sorting.
- **Toggle two comparable populations** where the comparison stays honest.
- **Stepped reveal** of one chart in two or three states, when the order explains something. Buttons or scroll, with the final state as the static fallback.
- **Reveal a definition in place** (details, popover) without leaving the narrative.

## Avoid
Scroll hijacking. Autoplay that competes with reading. Animation that implies precision or causation. Hover only information. Essential findings hidden behind discovery. Heavy dependencies for small effects. Counters that tick up for drama.

## Motion
Motion explains a transition, comparison, sequence or reveal. Use CSS transitions or `motion` (already installed) sparingly. Honour `prefers-reduced-motion`: the page shows final states and skips transitions, as `editorial.module.css` does for the title bar. Nothing moves on load.

## Touch and small screens
Tap targets 44px. No hover only states. Pinch and scroll never trapped. Charts reflow to one column; unit charts (squares) reflow by count, as `LeadSquares` already does.

## Accessibility floor
Semantic HTML; `role="img"` with a full text label on every picture; a table twin; keyboard operable controls with visible focus; contrast as the product; no colour only encoding (hatch, outline, labels); the story readable in order by a screen reader without the interaction.

## Performance
First screen fast and static. Lazy load heavy media. Prefer SVG and CSS. No new library without its cost and benefit written in `implementation-notes.md`.
