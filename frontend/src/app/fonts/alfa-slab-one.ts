import localFont from "next/font/local";

/*
 * Alfa Slab One (OFL beside it), as shipped: its licence reserves the name
 * "Alfa Slab", so it isn't cut; only the file format changed (TTF to WOFF2).
 * The years page's stamped wood: the planks, the kicker and the big count
 * (founder, 16 Oct 2026). Its own module, so only that page loads it.
 */
export const alfaSlabOne = localFont({src: "./alfa-slab-one.woff2", weight: "400", variable: "--font-alfa-slab-one", display: "swap", preload: false});
