# Pick a side: where the deck comes from

The card back in this folder, and the spade and club pips in
`src/components/stories/pick-a-side/icons.ts` (`PIP`), come from **English pattern playing
cards deck PLUS CC0** on Wikimedia Commons:

- File page: https://commons.wikimedia.org/wiki/File:English_pattern_playing_cards_deck_PLUS_CC0.svg
- Licence on the file page: Creative Commons CC0 1.0 Universal Public Domain Dedication.
  The SVG's own metadata says the same. The legal code is in `CC0-1.0.txt` beside this file
  (from https://creativecommons.org/publicdomain/zero/1.0/legalcode.txt).
- Who drew what: the faces (where the pips come from) are Dmitry Fomin's (CC0); the four
  colour backs, the blue one among them (group `g26413`, under the 5), are Loren Osborn's own
  work (Commons user Linux_dr), drawn new for this file so it carries no LGPL art.

CC0 asks for no credit; we give it anyway, on the story's "How we counted" and here.
Checked on 16 October 2026.

## The files

| File | What it is | How it was made |
|---|---|---|
| `back-blue.webp` | The blue back, 484 by 724 | The back's group cut out of the CC0 file unchanged, rendered in headless Chromium, WebP quality 0.8. The page and the market hub's cover load it. |
| `back-blue-share.png` | The same back, 200 by 300 | Decoded from the WebP and scaled down, for the story's share image (next/og reads PNG, not WebP). |
| `icons.ts` `PIP.spade`, `PIP.club` | The big pip of the two of spades (`g3033`) and of the two of clubs (`g3026`) | The path copied out unchanged, with its own viewBox. |

Nothing was redrawn. The colours are the deck's own.
