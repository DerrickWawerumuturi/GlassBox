# 2026-10-13: nothing under the CV button, the peek, the wordmark's O (fixes #6)

Decision: `docs/decisions/design-system.md` ("The CV button"),
`docs/decisions/cv-ask.md`. Review pages: `docs/local/hero-button-review.html`
(round one, A and B) and `docs/local/cosy-button-review.html` (round two and
the result).

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
- **The peek.** Two rounds of looks behind a temporary `?btn=` switch (A and
  B from stash, too big; then C peek, D slide in, E note). The founder picked
  C and asked to keep its size and type. It is now the one look, as a family:
  `peek peek-button` in `components/brand/peek.css` and the glyph
  `PeekGlyph` in `brand/Peek.tsx`. 44px, radius 12, Space Grotesk 600 15px,
  white on the orange, the wordmark's box O before the label; on hover or
  focus the dot hops up and looks over the rim, a press drops it back,
  reduced motion skips the travel. The switch and `compare-cv.css` are gone.
- **Who wears it:** the buttons that take a CV into the box, and only those.
  `CompareCv` (hero, market pages, years page), `AddCvButton` (/product),
  `Showcase` (Inside Glassbox), `CvSection` (the closing section's "Find
  out"), `CvSheet` ("See them", the kept CV button). Left quiet, on purpose:
  the header's mono "Try it out", "See your results", the dashboard's example
  banner, sign in and up, forms and dialogs, every secondary control.
- **The wordmark's moment.** `GlassboxWordmark` takes `peek`; the header
  passes it (`Navbar.tsx`) and the dot hops over the rim of the box O once
  after load and on hover or focus (`brand/logo.css`). Two ideas were tried
  behind a temporary `?mark=` switch (the dot peeks, the lid lifts); the
  founder picked the first. The switch is gone. Logo files and the favicon
  untouched.
- **The O, fixed.** `Logo.tsx` had the box O's path without the outlined
  file's `fill-rule: evenodd`, so the header, footer, sidebar and title bar
  drew a solid block with the dot on it. Now the rim with the dot inside, as
  the brand book draws it. The OG and share images read `public/brand/*.svg`,
  which have the rule; the favicon and app icons are the symbol.

## Tests

`Hero.test.ts`: the hero and a market page end the button's wrapper at the
button (fails with the empty `<p>`); the box glyph renders before the label in
a `peek` button, the dot under the rim; a running scan shows the status line.
`copy.test.ts`: the two strings are gone. `brand/Peek.test.ts`: the glyph's
drawing order, the hover, press and reduced motion rules, the family's size
and type, which files wear it and which don't, and that no `?btn` or `?mark`
code remains. `brand/Logo.test.ts`: the O carries `fill-rule="evenodd"` and
sits over the dot (fails without the rule), only the header peeks, and the
`public/brand` files carry the rule too.
