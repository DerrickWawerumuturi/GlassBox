import localFont from "next/font/local";

/*
 * Allerta Stencil (OFL beside it), as shipped: its licence reserves the name, so it isn't
 * cut. Within eleven jobs' stencilled numbers.
 * One story's display face (founder, 15 Oct 2026), in its own module so only
 * that story's route and the market hub's covers load it.
 */
export const allertaStencil = localFont({src: "./allerta-stencil.woff2", weight: "400", variable: "--font-allerta-stencil", display: "swap", preload: false});
