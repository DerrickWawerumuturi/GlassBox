# 2026-10-05 — Fonts self-hosted (the size sweep was reverted)

**Files:** `frontend/src/app/fonts/` (4 woff2 + OFL licences), `app/layout.tsx`,
`app/globals.css`, `lib/type-scale.test.ts`, and a size sweep across about 50
components (list in the review page).

Following `docs/local/font-audit.md`:

1. **Self-hosted fonts.** The dev server could not reach Google Fonts and drew
   Space Grotesk, JetBrains Mono and Caveat in Arial. Production was fine
   (checked the live CSS). The four faces now load from `app/fonts` with
   `next/font/local`, same `--font-*` variables. Each is the variable font cut
   to weights 400–700 and Latin + Latin Extended (fontTools instancer +
   subsetter): 38, 56, 34 and 87 KB.
2. **Sizes: reverted.** A sweep moved 193 sizes onto the 56/40/28/20/16/14/12
   scale. The founder preferred the original sizes ("I was fine with the font
   sizes throughout"), so every text-size, tracking and chart tick change was
   put back to HEAD's, token by token, keeping the other edits in those
   files. A page-by-page check against a HEAD build found no text size or
   letter spacing that HEAD doesn't use. The off-scale size test and the
   `h1–h3` base rule were removed; the `.label` utility stays for new work.
