# 2026-10-15: /about in the editorial look

Founder, 15 Oct 2026: "love the prototype, move it to the actual page".
A port of the approved prototype (`docs/local/editorial-sprint/about-page/`).
Decision: `docs/decisions/design-system.md` ("/about in the editorial look").
Review page: `docs/local/about-page-review.html`. GitHub issue #11 (with /product).

## What changed

- **The page** (`app/(public)/about/page.tsx`, `components/about/`): the drawn
  hero (one ad of twenty bricks into the box, a count out), six numbered chips,
  then six chapters: 01 Twenty skills, one ad; 02 From the boards to the Monday
  count (four drawn steps, then this week's receipt); 03 A map with no arrows;
  04 Your PDF is read, then deleted (the product page's CV drawing) with the
  kept and never kept sheets; 05 Three things it isn't; 06 The Count, still
  sealed. Then What we hold to and the CV ask.
- **Reused from /product** (`components/product/`): `Chapter` now takes a
  drawing (with an optional phone layout), a side and a `character` slot;
  `CountCard` takes its links and any number of lines; the closing card is
  `CvClose`, shared, with the doll passed in by /product. The drawing helpers
  are exported from `drawings.ts`.
- **No empty character boxes.** The prototype's dashed spots are left out until
  the ink cast is drawn; the chapter and the close keep a slot for one.
- **The receipt** (`lib/product-count.ts`, `aboutLines`) reads the publication
  through `lookForPage()` (database, never the API; keeps the last good page in
  a revalidation): jobs counted this week across job types, how many backend
  jobs are junior roles, and the skill backend jobs name most, of how many
  could be read. Without a count it shows only its link.
- **Privacy lines, checked against the code.** Three prototype lines were not
  literally true and changed:
  - "Signed in, we keep" listed only the CV values. It now also says the
    industries and keywords a CV names, work type and pay if stated (the kept
    profile, `kept_cv.py`), and the latest scan results and tracked
    applications (`analyses`, `application`).
  - "Never kept" became "Never kept from your CV": an account keeps the sign
    in's email and name (`users`). The list adds the companies, dates and schools.
  - "you can delete the skills we kept, or all your data" became "you can delete
    all your data at once": deleting the saved skills removes `latest_cvs`, but
    the scan's copy of the CV (`cvs`) keeps its skills until all data goes.
- **Analytics:** the closing "Add your CV" on /about sends `cta_clicked` with
  `where: "about"` (it said `product` from any page before).
- **Removed as unused:** the Explainer's `Numbers` box and /about's explainer
  copy (`sections`, `jump`, `numbersTitle`); the Explainer serves /method only.

## Cost

None new. The page stays static (`revalidate = false`) and is rebuilt by the
weekly publication as before; it calls no API.

## Tests

`components/about/about.test.ts`: the six chapters in order, their anchors and
the chips' targets; every drawing with its label and no character box; the
hatch defined once; 255 boards, 250 skill names and the six hour read checked
against the backend's files; the receipt with and without a publication; the
privacy lines on the page and against the backend code. `analytics.test.ts`:
the `about` place. Each new test failed once with its fix broken. tsc clean;
vitest 37 files, 312 passed, 1 skipped; `next build` passes against the local
site DB. Rendered on `next start` at 1280 and 390, light and dark: no sideways
scroll, no console errors.
