import localFont from "next/font/local";

/*
 * Tilt Neon (OFL beside it), the shop signs of Do you need AI on your CV now?:
 * its title, the signs over the doors and the big reveal number. The variable
 * font fixed at its upright default and cut to Latin, so the file stays small.
 * One story's display face, in its own module so only that story's route and
 * the market hub's covers load it.
 */
export const tiltNeon = localFont({src: "./tilt-neon.woff2", weight: "400", variable: "--font-tilt-neon", display: "swap", preload: false});
