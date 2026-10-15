import localFont from "next/font/local";

/*
 * The editorial face of the visual stories and the market hub (founder,
 * 15 Oct 2026; CLAUDE.md): Hanken Grotesk, self hosted with its OFL beside
 * it, the variable font with its italic. Its own module, so only the routes
 * that import it load it (the product's display face stays Space Grotesk).
 * No preload, nor for the stories' display faces: this build preloads every
 * next/font file on every page (measured 15 Oct, /about included), so a
 * preload would add them to pages that never use them. They load when a
 * page uses them, shown in the fallback until then (display: swap).
 */
export const hankenGrotesk = localFont({
    src: [
        {path: "./hanken-grotesk.woff2", style: "normal"},
        {path: "./hanken-grotesk-italic.woff2", style: "italic"},
    ],
    weight: "100 900",
    variable: "--font-hanken-grotesk",
    display: "swap",
    preload: false,
});
