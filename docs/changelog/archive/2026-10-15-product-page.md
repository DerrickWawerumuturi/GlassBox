# 2026-10-15: /product in the editorial look

Founder, 15 Oct 2026: "the product page needs the new look, to match the market".
A port of the approved prototype (`docs/local/editorial-sprint/product-page/`).
Decision: `docs/decisions/design-system.md` ("/product in the editorial look").
Review page: `docs/local/product-page-review.html`. GitHub issue #11.

## What changed

- **The page** (`app/(public)/product/page.tsx`, `components/product/`): the hero
  with the drawn open box (a CV in, the four pages out) and five numbered chips;
  one chapter per part on a coloured stage, flipped every other one, with the
  real screenshots cropped to what they show (`public/product/crop`, the example
  scan), a pen note in Caveat and an italic caption; "The count" as a till
  receipt after the first chapter; the CV chapter drawn; the closing CV ask with
  a doll, "Add your CV" (the peek button) and "Sign up".
- **Words** (`lib/site-copy.ts`, `PRODUCT_PAGE`): the prototype's. The first
  chapter is "Market charts". `FEATURES` is now the first four chapters, so the
  landing's What you get links follow the anchors.
- **Anchors:** `market-charts`, `your-skills`, `opportunities`, `applications`,
  `your-cv`. `#market` still lands on Market charts (a hidden anchor).
- **The count** (`lib/product-count.ts`) reads the publication through
  `lookForPage()` as before (database, never the API; keeps the last good page
  in a revalidation). Without a count it shows only its links.
- **Privacy lines:** the PDF is deleted after reading; its text goes to Groq
  (US) to read the skills; signed in, only the skills and values worked out
  from the latest CV, never the file, contact details or history.
- **Removed as unused:** the Explainer's screenshot and its `shot` field (only
  /product had them), `ProductShot`'s "upload" name; the old upload screenshots
  left `public/product` for the brand book's folder (`docs/brand/assets/live`).

## Cost

None new. The page is static (`revalidate = false`) and is rebuilt by the
weekly publication as before; it calls no API.

## Tests

`components/product/product.test.ts`: the five chapters in order and their
names; every anchor the page had, the chips' targets and every `/product#` link
in the code exist on the rendered page; a screenshot per page and theme; the
count's lines with a publication and only its links without. Each failed once
with its fix broken. `copy.test.ts` checks the new words. tsc clean; vitest 36
files, 302 passed, 1 skipped; `next build` passes against the local site DB.
Rendered on `next start` at 1280 and 390, light and dark: no sideways scroll,
no console errors.
