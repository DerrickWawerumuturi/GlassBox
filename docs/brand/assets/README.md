# Glassbox logo

Approved in logo round 3. The isometric open box at every size, and the wordmark GLASSBOX with the O drawn as the box. No full stop. The dot is the only orange.

## Files

| File | Use |
|---|---|
| `symbol/glassbox-symbol-poster-on-dark.svg` | Large display mark for dark grounds; dashed hidden edges. |
| `symbol/glassbox-symbol-poster-on-light.svg` | Large display mark for light grounds; dashed hidden edges. |
| `symbol/glassbox-symbol-48-on-dark.svg` | 48px symbol for dark grounds. |
| `symbol/glassbox-symbol-48-on-light.svg` | 48px symbol for light grounds. |
| `symbol/glassbox-symbol-32-on-dark.svg` | Compact 32px symbol for dark grounds. |
| `symbol/glassbox-symbol-32-on-light.svg` | Compact 32px symbol for light grounds. |
| `symbol/glassbox-symbol-24-on-dark.svg` | Small 24px symbol for dark grounds. |
| `symbol/glassbox-symbol-24-on-light.svg` | Small 24px symbol for light grounds. |
| `symbol/glassbox-symbol-16-on-dark.svg` | Minimum-size 16px symbol for dark grounds. |
| `symbol/glassbox-symbol-16-on-light.svg` | Minimum-size 16px symbol for light grounds. |
| `wordmark/wordmark-on-dark.svg` | Standalone GLASSBOX wordmark for dark grounds. |
| `wordmark/wordmark-on-light.svg` | Standalone GLASSBOX wordmark for light grounds. |
| `lockup/lockup-horizontal-on-dark.svg` | Horizontal symbol and wordmark for dark grounds. |
| `lockup/lockup-horizontal-on-light.svg` | Horizontal symbol and wordmark for light grounds. |
| `lockup/lockup-horizontal-on-orange.svg` | Horizontal symbol and wordmark for orange grounds. |
| `lockup/lockup-horizontal-on-dark-transparent.svg` | Horizontal lockup with transparent background for dark use. |
| `lockup/lockup-horizontal-on-light-transparent.svg` | Horizontal lockup with transparent background for light use. |
| `lockup/lockup-stacked-on-dark.svg` | Stacked symbol and wordmark for dark grounds. |
| `lockup/lockup-stacked-on-light.svg` | Stacked symbol and wordmark for light grounds. |
| `lockup/lockup-stacked-on-orange.svg` | Stacked symbol and wordmark for orange grounds. |
| `lockup/lockup-stacked-on-dark-transparent.svg` | Stacked lockup with transparent background for dark use. |
| `lockup/lockup-stacked-on-light-transparent.svg` | Stacked lockup with transparent background for light use. |
| `app-icon/app-icon-180-desk.svg` | App icon master, 180px rounded square, desk ground. |
| `app-icon/app-icon-180-paper.svg` | App icon master, 180px rounded square, paper ground. |
| `app-icon/app-icon-180-orange.svg` | App icon master, 180px rounded square, orange ground. |
| `app-icon/app-icon-1024.png` | App icon render at 1024px. Each size uses its own drawing. |
| `app-icon/app-icon-512.png` | App icon render at 512px. Each size uses its own drawing. |
| `app-icon/app-icon-180.png` | App icon render at 180px. Each size uses its own drawing. |
| `app-icon/app-icon-48.png` | App icon render at 48px. Each size uses its own drawing. |
| `app-icon/app-icon-32.png` | App icon render at 32px. Each size uses its own drawing. |
| `app-icon/app-icon-16.png` | App icon render at 16px. Each size uses its own drawing. |
| `app-icon/favicon.ico` | Favicon: 16, 32 and 48 in one file. |
| `index.html` | Check page. Opens every file on dark and light. |

Colours: desk `#0f1012`, paper `#f3efe6`, ink `#161512`, warm white `#edeae3`, orange `#f5532a` (dot on dark), `#b83a18` (dot on paper). On the orange ground the lines are `#140c08` and the dot is warm white.

## Rules

**Clear space.** Keep one box-O height (x) clear on every side of the lockup. The lockup files already include it.

**Minimum sizes.** Each drawing has a floor; below it, switch to the next drawing down.

| Drawing | Use from | File |
|---|---|---|
| poster (dashed hidden edges) | 96px | `symbol/*-poster-*` |
| 48 (solid box) | 40px | `symbol/*-48-*` |
| 32 (every edge, heavier) | 28px | `symbol/*-32-*` |
| 24 (rim plus one flap, J4) | 20px | `symbol/*-24-*` |
| 16 (rim plus one flap, H5) | 16px | `symbol/*-16-*` |
| lockups | 18px cap height | `lockup/*` |

At 16px the dot touches the rim and the flap is two pixels. That is the floor; nothing smaller.

**Five don'ts.**
1. Don't stretch or skew.
2. Don't recolour to green or lime. Lines are warm white or ink; the dot is orange (warm white on orange).
3. Don't add effects: no shadows, glows or gradients.
4. Don't add a full stop. GLASSBOX ends with the X.
5. Don't add a second orange. The dot is the only orange in the logo.

## Figma

Import the SVGs into page **04 "Logo · system"**. Combine the five symbol sizes into one component with a **Size** variant (poster, 48, 32, 24, 16) and a **Ground** variant (dark, light). Strokes import as strokes with round joins and caps; the poster's hidden edges keep their dash (2.4 / 2.6) and 55% opacity. The wordmark files are outlined, so no font is needed. For an editable version, type GLASSBOX in Space Grotesk Bold in Figma and swap the O for the box-O from the outlined file.
