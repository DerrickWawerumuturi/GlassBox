# 2026-10-06 — Round 8: the old How we count, real screenshots, explainers, an example scan

Founder: "Supabase inspo did not mean copy what they have."

- **Product menu:** the drawings on the right of each item are gone; the icon
  tiles, the text, the panel, its animation and "See it with your CV" stay.
  `ProductThumb.tsx` is deleted (nothing else uses it).
- **How we count** is the old JobRadar "how it works" again: paper postcards with
  washi tape and a tilt, pinned along a dashed trail (grey now, orange acts), the
  step in Caveat. The old screenshots (`public/assets/process0*.png`) showed a real
  account and the JobRadar name, so each card frames a picture of the step drawn
  from today's jobs instead. The soft mouse light stays on the cards.
- **What you get** shows real screenshots of each page.
- **Screenshots:** `docs/local/render/product-shots.mjs` signs in with a mocked
  session as "Sam Example" (made up) and the example scan (real public jobs, a
  sample CV), and captures Overview, Market (dial and Demand), Your skills,
  Opportunities, Applications and the upload page, at 1440 and 390, both themes,
  2x. `shots-to-webp.py` writes WebP to `frontend/public/product/` (1.9 MB for 28
  images); next/image serves AVIF where it can (`next.config.ts`). The script
  fails loudly if a real name or email shows. `components/site/ProductShot.tsx`
  picks the light or dark image by the site's own theme.
- **/product and /about** are long explainers (`components/site/Explainer.tsx`):
  a headline and a dek, a sticky table of contents (a "Jump to" select on a phone),
  numbered sections with short paragraphs, a screenshot with a caption, and a pull
  quote or a box of counts. Both are static with ISR; their counts come from
  today's `/market/look` and disappear when it isn't available. The privacy section
  of /about repeats /your-cv. No claim of "thousands" or of dates for The Count.
- **/analysis without a scan** shows the example scan (`src/lib/example-scan.json`,
  the fixture without job descriptions, loaded only when needed) under a banner:
  "This is an example. Add your CV to see yours." with Add your CV (opens the
  upload) and Sign up. A scan replaces it the moment it lands.
