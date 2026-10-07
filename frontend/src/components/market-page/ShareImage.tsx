import {readFileSync} from "node:fs";
import {join} from "node:path";

import React from "react";
import {ImageResponse} from "next/og";

import {SITE_URL} from "@/lib/site";

/*
 * The market pages' share preview, drawn on the desk with the brand's own
 * faces: static cuts of app/fonts (next/og reads ttf, not woff2), made with
 * fontTools as the 2026-10-07 entry level page changelog says. The hub: one
 * big number in lime (the one highlight), one line, the address. A page: its
 * finding headline, the count behind it, and the finding's share as 100
 * squares with the share lit in lime.
 */

export const SHARE_SIZE = {width: 1200, height: 630};

const font = (file: string) => readFileSync(join(process.cwd(), "src/app/fonts/og", file));
const WORDMARK = `data:image/svg+xml;base64,${readFileSync(join(process.cwd(), "public/brand/wordmark-on-dark.svg")).toString("base64")}`;

// The desk (globals.css .dark): warm charcoal ground, warm white ink, lime the one highlight.
const DESK = "#191714", INK = "#f1f0ed", MUTED = "#96918c", LIME = "#d7ee4c";

const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

export function shareImage({kicker, big, line, path}: {kicker: string; big: string; line: string; path: string}) {
    return frame(kicker, path, (
        <div style={{display: "flex", flexDirection: "column", gap: 14}}>
            <div style={{display: "flex", fontFamily: "Space Grotesk", fontSize: 148, fontWeight: 700, lineHeight: 1, letterSpacing: -4, color: LIME}}>{big}</div>
            <div style={{display: "flex", fontFamily: "Space Grotesk", fontSize: 54, fontWeight: 700, lineHeight: 1.1, letterSpacing: -1, maxWidth: 1000}}>{cap(line)}</div>
        </div>
    ));
}

/** A page's finding: the headline, the count behind it, and `lit` of 100 squares in lime. */
export function findingImage({kicker, title, line, lit, path}: {kicker: string; title: string; line: string; lit: number; path: string}) {
    const long = title.length > 60;
    return frame(kicker, path, (
        <div style={{display: "flex", alignItems: "center", justifyContent: "space-between", gap: 56}}>
            <div style={{display: "flex", flexDirection: "column", gap: 22, width: 720}}>
                <div style={{display: "flex", fontFamily: "Space Grotesk", fontSize: long ? 56 : 68, fontWeight: 700, lineHeight: 1.05, letterSpacing: -1.5}}>{title}</div>
                <div style={{display: "flex", fontSize: 28, lineHeight: 1.35, color: MUTED}}>{line}</div>
            </div>
            <div style={{display: "flex", flexWrap: "wrap", width: 276, gap: 4}}>
                {Array.from({length: 100}, (_, i) => (
                    <div key={i} style={{width: 24, height: 24, borderRadius: 3, backgroundColor: i < lit ? LIME : INK}} />
                ))}
            </div>
        </div>
    ));
}

function frame(kicker: string, path: string, body: React.ReactElement) {
    return new ImageResponse(
        (
            <div style={{
                width: "100%", height: "100%", display: "flex", flexDirection: "column", justifyContent: "space-between",
                padding: "64px 80px", backgroundColor: DESK, color: INK, fontFamily: "Schibsted Grotesk",
                backgroundImage: "linear-gradient(rgba(255,255,255,0.035) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.035) 1px, transparent 1px)",
                backgroundSize: "28px 28px",
            }}>
                <div style={{display: "flex", fontFamily: "JetBrains Mono", fontSize: 24, letterSpacing: 2, color: MUTED}}>{kicker}</div>
                {body}
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
