import {readFileSync} from "node:fs";
import {join} from "node:path";

import {ImageResponse} from "next/og";

import {ENTRY_PATH, entryForPage, fmt, longDate, pct} from "@/lib/market-page";
import {SITE_URL} from "@/lib/site";

/*
 * The share preview for /market/entry-level-software: the page's headline
 * fact, its count and its date, so a pasted link carries the number
 * (docs/decisions/market-pages.md). Drawn on the desk with the brand's own
 * faces: static cuts of app/fonts (next/og reads ttf, not woff2), made with
 * fontTools as the 2026-10-07 entry level page changelog says.
 * Rebuilt with the page; a failed fetch during a revalidation keeps the last
 * image, like the page itself (look-server.ts).
 */

export const alt = "What entry level software jobs ask for, counted";
export const size = {width: 1200, height: 630};
export const contentType = "image/png";
export const revalidate = 300;

const font = (file: string) => readFileSync(join(process.cwd(), "src/app/fonts/og", file));
const WORDMARK = `data:image/svg+xml;base64,${readFileSync(join(process.cwd(), "public/brand/wordmark-on-dark.svg")).toString("base64")}`;

// The desk (globals.css .dark): warm charcoal ground, warm white ink, lime the one highlight.
const DESK = "#191714", INK = "#f1f0ed", MUTED = "#96918c", LIME = "#d7ee4c";

/** The headline: the skill named most, as a count of the jobs read; the job count alone under the 100 job rule. */
function headline(page: Awaited<ReturnType<typeof entryForPage>>): {big: string; line: string; kicker: string} {
    if (!page) return {big: "Counted", line: "What do entry level software jobs ask for?", kicker: "ENTRY LEVEL SOFTWARE JOBS"};
    const kicker = `ENTRY LEVEL SOFTWARE JOBS · COUNTED ${longDate(page.taken_at).toUpperCase()}`;
    const top = page.skills[0];
    if (!page.publishable || !top) return {big: fmt(page.jobs), line: `entry level software jobs, at ${fmt(page.employers)} employers.`, kicker};
    const skill = page.names[top.key] ?? top.key;
    return {big: `${fmt(top.any)} of ${fmt(page.readable)}`, line: `entry level software jobs name ${skill}. That's ${pct(top.any, page.readable)}%.`, kicker};
}

export default async function OgImage() {
    const {big, line, kicker} = headline(await entryForPage());
    return new ImageResponse(
        (
            <div style={{
                width: "100%", height: "100%", display: "flex", flexDirection: "column", justifyContent: "space-between",
                padding: "64px 80px", backgroundColor: DESK, color: INK, fontFamily: "Schibsted Grotesk",
                backgroundImage: "linear-gradient(rgba(255,255,255,0.035) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.035) 1px, transparent 1px)",
                backgroundSize: "28px 28px",
            }}>
                <div style={{display: "flex", fontFamily: "JetBrains Mono", fontSize: 24, letterSpacing: 2, color: MUTED}}>{kicker}</div>
                <div style={{display: "flex", flexDirection: "column", gap: 14}}>
                    <div style={{display: "flex", fontFamily: "Space Grotesk", fontSize: 148, fontWeight: 700, lineHeight: 1, letterSpacing: -4, color: LIME}}>{big}</div>
                    <div style={{display: "flex", fontFamily: "Space Grotesk", fontSize: 54, fontWeight: 700, lineHeight: 1.1, letterSpacing: -1, maxWidth: 1000}}>{line}</div>
                </div>
                <div style={{display: "flex", alignItems: "center", justifyContent: "space-between"}}>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={WORDMARK} width={274} height={40} alt={"Glassbox"} />
                    <div style={{display: "flex", fontFamily: "JetBrains Mono", fontSize: 22, color: MUTED}}>{`${new URL(SITE_URL).host}${ENTRY_PATH}`}</div>
                </div>
            </div>
        ),
        {
            ...size,
            fonts: [
                {name: "Space Grotesk", data: font("space-grotesk-700.ttf"), weight: 700, style: "normal"},
                {name: "Schibsted Grotesk", data: font("schibsted-grotesk-400.ttf"), weight: 400, style: "normal"},
                {name: "JetBrains Mono", data: font("jetbrains-mono-500.ttf"), weight: 500, style: "normal"},
            ],
        },
    );
}
