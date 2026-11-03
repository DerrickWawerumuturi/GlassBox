# Implementation notes

**Status:** not approved. Filled from the repository inspection on 14 Oct 2026 so the build, when approved, is the smallest coherent one.

## Repository inspection
- **Route and layout to extend:** `frontend/src/app/market/` (static pages, `revalidate = false`, Source Serif loaded in its layout, footer added there). A story route under it keeps the fonts, the data path and plain share image addresses. Proposed: `/market/entry-level-software/years-of-experience/where-the-two-years-come-from` or a short `/market/stories/<slug>`; decide at approval.
- **Design tokens:** `globals.css` (`--accent-lime`, `--chart-gap` hatch via `.bar-gap`, `--foreground`, `font-heading`, `font-read`, `font-mono`, `font-hand`).
- **Reusable components:** `LeadSquares` idiom and `editorial.module.css` (`.squares`, size steps, lime, ring); `Figure`, `Stacked`, `TableTwin` (`Figures.tsx`); `TitleBar`; `BylineActions`; `MarketCvAsk` and `MarketAskProvider`; the method section pattern in `StoryEnd.tsx`; `P` and `H2` from `StorySections.tsx`.
- **Chart dependencies:** none needed. Squares and bars are HTML; `motion` is available for the sort if CSS transitions aren't enough.
- **Data source:** the Monday publication. New counts added in `backend/src/jobpool/market_pages.py` next to `experience()`: the title rung table over software titled jobs (counts per rung and years bucket, five sample titles per rung, the two year wording split) and the keyword read over junior titled ads without a number. Read on the page from `market_publications` like everything else. The exporter (`open_data.py`) gets one more CSV when the counts exist.
- **Tests:** rung rules (including "Graduate Program Manager", "Engineer II", "Early Careers", "Associate"), the "up to N years" parse, the keyword read; a frontend test that the page renders static with the answers present and no numeric `revalidate`.
- **Constraints:** files ≤300 lines; public pages never call the API; both themes; 390px; share image from data; the `years_kind` parser fix ships first as its own issue because it changes numbers already on the site.

## Proposed implementation (after approval)
- **New components:** `UnitSort` (a grid of squares with grouped and ungrouped states, buttons, reduced motion), `GuessCount` (a labelled range input with the answer revealed), `TitleLadder` (six stacked bars; could be `Stacked` rows with a legend). Everything else reused.
- **Interactions:** two guesses, both optional, answers in the HTML. Tap a group for titles (a `details` per group).
- **Accessibility:** `role="img"` labels on every picture; buttons and range input keyboard operable; sorted state readable without JavaScript; `prefers-reduced-motion` skips the sort transition.
- **Responsive:** squares reflow by count as `LeadSquares` does; buttons stack; one column; ladder labels above bars at 390px.
- **Performance:** no new library; the page is static HTML with a small client island for the two guesses.

## Order of work
1. Fix "up to N years" (issue, test, recount, review page).
2. Add the counts to the publication with tests; wait for the next Monday to hold them; recount the brief.
3. Prototype the opening, the sort and the phone state in a local page; review screenshots.
4. Build the page; review with `DESIGN_REVIEW.md`; founder approves the render.
5. Publish with tagged links; record in the experiment log.

## Validation
- [ ] Calculations tested against source records.
- [ ] Parser edge cases checked, including "up to N years".
- [ ] Three Monday recounts hold.
- [ ] Desktop and phone screenshots reviewed, both themes.
- [ ] Keyboard and screen reader paths checked.
- [ ] Reduced motion checked.
- [ ] Source notes, denominators and limits present.
- [ ] No unrelated production changes.
- [ ] Founder's approval to publish.
