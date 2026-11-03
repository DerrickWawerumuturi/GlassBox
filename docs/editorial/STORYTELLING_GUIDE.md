# Storytelling workflow

Question → Evidence → Concepts → Storyboard → Prototype → Build → Review → Publish → Learn. The diagram is `references/editorial-workflow.png`.

## 1. Question
One clear question a reader already holds. Who cares and why. Not "a statistic we have".
**Deliverable:** one paragraph pitch.

## 2. Evidence
Record in `investigations/<slug>/research.md`: snapshot date and query; population and inclusion rules; the denominator of every percentage; duplicates and employer concentration (recount with at most 3 jobs per employer); parser quality and hand checks against the ad text; missing or ambiguous values; what the data can't establish; whether the result holds across Mondays. Reject a weak result here, not later.
**Deliverable:** research brief with traceable calculations and the script that reproduces them.

## 3. Pivot, continue, put it down
The Pudding's checks, in our words. Is the question unique, or can we answer it differently? Can our data answer it? Is it fair to the people in the data (employers named, ads quoted)? Are the results interesting once checked? After storyboarding, is it still interesting? If any answer is no, reframe or stop. Write the decision in `experiments/visual-concepts.md`.

## 4. Narrative
The central finding and the order of questions a reader needs answered. What is revealed first, what context must come before a conclusion, where the reader's own belief gets tested. No section repeats another.
**Deliverable:** outline.

## 5. Concepts
Three materially different directions: metaphor, structure or experience, not styling. For each: what the reader sees, what they learn, what's gained, what gets harder. Sketch each with the real numbers (a local HTML page is fine).
**Deliverable:** concept sheets, one per concept, in `experiments/visual-concepts.md`.

## 6. Choose and storyboard
Pick on explanatory power, distinctiveness, feasibility and evidence quality. For every section: reader's question, evidence shown, copy beat, visual, interaction, transition, source and caveat, phone treatment, accessible alternative.
**Deliverable:** `storyboard.md`, approved by the founder.

## 7. Prototype
Static mockup or rough browser prototype of the opening, the main visual and one phone state. Not the whole page.
**Deliverable:** reviewed in a browser, screenshots in `docs/local/shots/`.

## 8. Build the smallest coherent page
Reuse the shell and figures that fit; write what the concept needs. Data computed in the backend publication with tests; presentation separate. Follow `AGENTS.md`; a separate review artifact is useful for editorial renders, not routine code changes.

## 9. Review
Real renders at 390px and 1280px, both themes. Numbers checked against source records. Keyboard, focus, contrast, reduced motion, loading, text alternatives. Score with `DESIGN_REVIEW.md`.

## 10. Publish and distribute
Only after numbers and wording are verified and the founder says so. One adaptation per channel, each with its own `utm_source`. Link the market page and the CV check where useful.

## 11. Learn
Track reach, tagged visits, time on page, outbound to the market page, and CV scans after. Record repeat, modify or stop in `docs/local/experiment-log.html`.
