import localFont from "next/font/local";

/*
 * Limelight (OFL beside it), as shipped: its licence reserves the name, so it isn't cut.
 * The lobby's floor labels and directory.
 * One story's display face (founder, 15 Oct 2026), in its own module so only
 * that story's route and the market hub's covers load it.
 */
export const limelight = localFont({src: "./limelight.woff2", weight: "400", variable: "--font-limelight", display: "swap", preload: false});
