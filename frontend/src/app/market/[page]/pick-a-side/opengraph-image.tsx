import {readFileSync} from "node:fs";
import {join} from "node:path";

import React from "react";

import {PIP, PIP_BOX} from "@/components/stories/pick-a-side/icons";
import {SHARE_SIZE, storyImage} from "@/components/stories/share";
import {fmt} from "@/lib/market-page";
import {card, PICK, PICK_A_SIDE, suit} from "@/lib/stories/pick-a-side";

/*
 * Pick a side's share preview, in the deck's look: on the paper page, one
 * card table (green baize, a wooden rail) with two of the deck's blue backs
 * face down and the lime card face up, its two shares in Bebas Neue, from
 * the week's numbers. The back is the CC0 deck's (public/stories/pick-a-side),
 * as PNG because next/og reads no WebP.
 */

export const alt = "Pick a side: one week's count of the skills entry level and senior software jobs name, by Glassbox";
export const size = SHARE_SIZE;
export const contentType = "image/png";

export function generateStaticParams() {
    return [{page: PICK_A_SIDE.page}];
}

const INK = "#1a1a1a", MUTED = "#5e5b54", SENIOR = "#8a8f99", LIME = "#d7ee4c";
const BACK = `data:image/png;base64,${readFileSync(join(process.cwd(), "public/stories/pick-a-side/back-blue-share.png")).toString("base64")}`;

export default function OgImage() {
    const c = card(PICK.beats.lime);
    const share = (label: string, v: number, under: string, grey: boolean) => (
        <div style={{display: "flex", flexDirection: "column", alignItems: "center", width: 82}}>
            <div style={{display: "flex", fontFamily: "JetBrains Mono", fontSize: 10, color: MUTED}}>{label}</div>
            <div style={{display: "flex", fontFamily: "Bebas Neue", fontSize: 56, lineHeight: 1, color: grey ? SENIOR : INK}}>{`${v}%`}</div>
            <div style={{display: "flex", fontFamily: "JetBrains Mono", fontSize: 11, color: MUTED}}>{under}</div>
        </div>
    );
    const corner = (
        <div style={{display: "flex", flexDirection: "column", alignItems: "center", width: 30}}>
            <div style={{display: "flex", fontFamily: "Bebas Neue", fontSize: 20, lineHeight: 1, color: INK, whiteSpace: "nowrap"}}>{c.rank}</div>
            <svg width={14} height={21} viewBox={PIP_BOX}><path d={PIP[suit(c)]} fill={INK} /></svg>
        </div>
    );
    const back = (left: number, top: number, deg: number) => (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={BACK} width={150} height={225} alt={""} style={{position: "absolute", left, top, transform: `rotate(${deg}deg)`, borderRadius: 10}} />
    );
    const art = (
        <div style={{display: "flex", padding: 12, borderRadius: 30, backgroundImage: "linear-gradient(180deg, #7b4b27, #4c2b14)"}}>
            <div style={{display: "flex", position: "relative", width: 440, height: 400, borderRadius: 22,
                backgroundImage: "radial-gradient(circle at 50% 32%, #377b57, #2b6a4a 58%, #1d4f36)"}}>
                {back(40, 60, -14)}{back(250, 50, 12)}
                <div style={{display: "flex", position: "absolute", left: 94, top: 11, width: 252, height: 378, padding: "10px 4px", borderRadius: 18,
                    backgroundColor: "#fffdf8", border: "1.5px solid #2a2a2a", transform: "rotate(-5deg)", boxShadow: "0 20px 30px rgba(0,0,0,.45)"}}>
                    {corner}
                    <div style={{display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", flex: 1, padding: "10px 4px",
                        borderRadius: 6, backgroundColor: LIME, border: "1px solid rgba(26,26,26,.55)", color: INK}}>
                        <div style={{display: "flex", fontSize: 30, fontWeight: 800}}>{c.name}</div>
                        <div style={{display: "flex", fontSize: 15, fontWeight: 500, color: MUTED, marginBottom: 12}}>named in</div>
                        <div style={{display: "flex", justifyContent: "center", gap: 4, padding: "12px 4px", borderRadius: 8, backgroundColor: "#fff"}}>
                            {share("ENTRY LEVEL", c.e.share, `${fmt(c.e.jobs)} of ${fmt(PICK.readable)}`, false)}
                            {share("SENIOR", c.s.share, c.s.jobs === null ? "share only" : `${fmt(c.s.jobs)} of ${fmt(PICK.senior)}`, true)}
                        </div>
                        {c.employers ? <div style={{display: "flex", fontSize: 14, fontWeight: 500, color: MUTED, marginTop: 14, textAlign: "center"}}>{`named by jobs at ${c.employers} employers`}</div> : null}
                    </div>
                    <div style={{display: "flex", alignItems: "flex-start", transform: "rotate(180deg)"}}>{corner}</div>
                </div>
            </div>
        </div>
    );
    return storyImage({story: PICK_A_SIDE, ground: "#f7f3ef", ink: "#21201c", muted: "#63635e", dark: false, art,
        face: {name: "Bebas Neue", file: "bebas-neue-400.ttf"}});
}
