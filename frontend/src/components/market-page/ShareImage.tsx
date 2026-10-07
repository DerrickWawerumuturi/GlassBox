import {readFileSync} from "node:fs";
import {join} from "node:path";

import {ImageResponse} from "next/og";

import {SITE_URL} from "@/lib/site";

/*
 * The market pages' share preview, drawn on the desk with the brand's own
 * faces: static cuts of app/fonts (next/og reads ttf, not woff2), made with
 * fontTools as the 2026-10-07 entry level page changelog says. One big
 * number in lime (the one highlight), one line, the address.
 */

export const SHARE_SIZE = {width: 1200, height: 630};

const font = (file: string) => readFileSync(join(process.cwd(), "src/app/fonts/og", file));
const WORDMARK = `data:image/svg+xml;base64,${readFileSync(join(process.cwd(), "public/brand/wordmark-on-dark.svg")).toString("base64")}`;

// The desk (globals.css .dark): warm charcoal ground, warm white ink, lime the one highlight.
const DESK = "#191714", INK = "#f1f0ed", MUTED = "#96918c", LIME = "#d7ee4c";

export function shareImage({kicker, big, line, path}: {kicker: string; big: string; line: string; path: string}) {
    const sentence = line.charAt(0).toUpperCase() + line.slice(1);
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
                    <div style={{display: "flex", fontFamily: "Space Grotesk", fontSize: 54, fontWeight: 700, lineHeight: 1.1, letterSpacing: -1, maxWidth: 1000}}>{sentence}</div>
                </div>
                <div style={{display: "flex", alignItems: "center", justifyContent: "space-between"}}>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={WORDMARK} width={274} height={40} alt={"Glassbox"} />
                    <div style={{display: "flex", fontFamily: "JetBrains Mono", fontSize: 22, color: MUTED}}>{`${new URL(SITE_URL).host}${path}`}</div>
                </div>
            </div>
        ),
        {
            ...SHARE_SIZE,
            fonts: [
                {name: "Space Grotesk", data: font("space-grotesk-700.ttf"), weight: 700, style: "normal"},
                {name: "Schibsted Grotesk", data: font("schibsted-grotesk-400.ttf"), weight: 400, style: "normal"},
                {name: "JetBrains Mono", data: font("jetbrains-mono-500.ttf"), weight: 500, style: "normal"},
            ],
        },
    );
}
