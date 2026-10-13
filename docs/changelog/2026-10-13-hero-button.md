# 2026-10-13: nothing under the CV button, two new looks in review (refs #6)

Decision: `docs/decisions/design-system.md` ("The CV button"),
`docs/decisions/cv-ask.md`. Review page: `docs/local/hero-button-review.html`.

## The problem

The founder removed the line under "Compare your CV" ("Free. No account
needed. Your PDF is deleted after reading.") and the one beside "Add your CV"
in Inside Glassbox by setting both strings to "" (90e86d4, 6e88cb1). The
components still rendered an empty `<p>` under each button, and two tests
still expected the old line. He also didn't like the button's font, size or
shape.

## What changed

- **Nothing under the button.** `CompareCv` renders no element under the
  button at rest; while a scan runs, one status line says it is reading.
  `Showcase` drops its empty lead line, and `landing.css` its rule.
  `ASK.compareSmall` and `COPY.inside.lead` are deleted.
- **Three looks, behind a temporary switch.** The first two, A and B from
  stash, were too big (founder, 13 Oct). Now `?btn=c` (peek: 44px, radius 12,
  the box O before the label, its dot peeks over the rim on hover), `?btn=d`
  (slide in: a 44px pill, a CV page that slides into a glass box on hover)
  and `?btn=e` (note: 42px, radius 10, a Caveat "about a minute" beside it on
  hover), in `components/cv-ask/compare-cv.css`. No parameter keeps today's
  look. The switch reads the address after mount, so static pages don't
  depend on it. It goes once the founder picks.
- **Two wordmark ideas, behind a temporary switch.** `?mark=1` (the dot peeks
  over the rim of the box O) and `?mark=2` (the O's top edge lifts like a
  lid), in `components/brand/WordmarkIdeas.tsx`; `Navbar.tsx` reads the
  address after mount. The logo files and the favicon are untouched.
  Review: `docs/local/cosy-button-review.html`.

## Tests

`Hero.test.ts`: the hero and a market page end the button's wrapper at the
button (fails with the empty `<p>`); a running scan shows the status line.
`copy.test.ts`: the two strings are gone.
