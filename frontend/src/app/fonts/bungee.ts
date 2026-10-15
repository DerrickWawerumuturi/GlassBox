import localFont from "next/font/local";

/*
 * Bungee (OFL beside it), cut to Latin + Latin Extended: Contents may vary's packaging type.
 * One story's display face (founder, 15 Oct 2026), in its own module so only
 * that story's route loads it (its cover on the hub draws in Hanken Grotesk).
 */
export const bungee = localFont({src: "./bungee.woff2", weight: "400", variable: "--font-bungee", display: "swap", preload: false});
