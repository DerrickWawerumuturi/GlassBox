# The cast: where the drawings come from

The people set into the text on /about, /product and four of the market stories are
hand drawn illustrations by **Pablo Stanley**, from two of his public domain libraries:

- **Open Peeps** (https://www.openpeeps.com): the standing figures (`art/*-figure.ts`).
  The site says: "The library is in the public domain under the CC0 License."
- **Open Doodles** (https://www.opendoodles.com): the three scenes, a very large coffee,
  someone climbing out of a box and someone reading on a chair (`art/mateo-scene.ts`,
  `art/joon-scene.ts`, `art/tomas-reading.ts`). The site says:
  "You can copy, edit, remix, share, or redraw these images for any purpose without
  restriction under copyright or database law (CC0 license.)"

Both are dedicated to the public domain under **CC0 1.0 Universal**. The legal code is in
`CC0-1.0.txt` (from https://creativecommons.org/publicdomain/zero/1.0/legalcode.txt).
CC0 asks for no credit; we give it anyway, because showing where things come from is how
Glassbox works. Checked on 15 October 2026.

## What we changed

Each file in `art/` is one library drawing, its source file named in its first line. On the
way in, its black and white became `currentColor` and `var(--pp)` (so the page sets the ink
and paper), the doodles' pink became ink, or lime for the box in `joon-scene`, ids were
dropped, numbers were rounded and the viewBox was cropped to the drawing. No line was
redrawn. In the dark theme a filter (`draw.ts`) shows the same drawing as line art. The
names (Mateo, Tomas, Kofi, Rosa, Joon, Amina) are ours; the libraries' people have none.
