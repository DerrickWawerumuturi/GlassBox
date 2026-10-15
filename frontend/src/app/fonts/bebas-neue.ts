import localFont from "next/font/local";

/*
 * Bebas Neue (OFL beside it), cut to Latin + Latin Extended: Pick a side's big shares.
 * One story's display face (founder, 15 Oct 2026), in its own module so only
 * that story's route and the market hub's covers load it.
 */
export const bebasNeue = localFont({src: "./bebas-neue.woff2", weight: "400", variable: "--font-bebas-neue", display: "swap", preload: false});
