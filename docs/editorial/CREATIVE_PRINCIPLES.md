# Creative principles

Rules for human and AI work alike. Each one exists because the default is worse.

## 1. Find the story before the form
Start with the question, the evidence and the surprising part. Never with a chart type, a layout or a trend. If the strongest question changes during research, change the framing (The Pudding's "pivot, continue, put it down" checks are in `STORYTELLING_GUIDE.md`).

## 2. Three concepts, materially different
Before a flagship story, propose three directions that differ in metaphor, structure or reader experience. Three colourways of one layout don't count. Write down why the losers lost in `experiments/visual-concepts.md`.

## 3. The visual makes the argument
A visual must let the reader compare, notice or question something they couldn't from the prose. If removing it changes nothing, remove it. The central visual is the story's memory: a reader should be able to describe it a week later.

## 4. One idea each
Each section adds one thing. No repeating the headline number in three forms. Stop when the question is answered.

## 5. Typography and composition are the design
Scale, contrast, line length, rhythm and whitespace carry hierarchy. Whitespace shapes pacing. Keep the product's text sizes (`CLAUDE.md`): display type is used for one number or one line, not as decoration.

## 6. Each story has its own character
Shared signals, not a template. A story may set its own chart geometry, annotation, page composition, scroll sequence and, with a reason, an accent. See `VISUAL_LANGUAGE.md` for what stays fixed.

## 7. Interaction must earn its place
Complete the sentence in `INTERACTION_GUIDE.md`: "The reader can ___, which helps them understand ___." No scroll hijacking, no autoplay, nothing hover only, nothing essential hidden behind discovery. The page must make sense static.

## 8. Honest data, always
Every number names what it counts. Denominators visible. "Required", "preferred", "mentioned" and "not stated" never blur. "No number stated" is not "no experience needed". No claims about employer intent. One week is not a trend. Limits in plain words near the finding, not buried.

## 9. Human writing
Lead with the finding or the question. Concrete numbers where they help. No "in today's landscape", no repeated summaries, no false drama, no advice section (every career blog has one, and it breaks "we show, you decide"). Mark interpretation as ours: "one reading of this is".

## 10. Phone first
Design the 390px state, not a compressed desktop. Labels, tap targets, reading order, reduced motion and loading all checked there first.

## 11. No AI default aesthetics
No gradient heroes, no piles of rounded cards, no decorative blobs, no arbitrary accents, no stock looking illustration, no pill overload, no oversized claims. If one of these appears, it needs a story specific reason written in the brief.

## 12. Build only what the story needs
Reuse `Figure`, `Stacked`, `TableTwin`, the squares idiom, the article shell. Write a custom component when the concept needs it. No general chart framework, no CMS, no refactors of unrelated pages.

## 13. Review the render, not the code
A build that matches the storyboard is not yet a good page. Score real screenshots at 390px and 1280px with `DESIGN_REVIEW.md`, name the three weakest decisions, and fix or cut before publishing.
