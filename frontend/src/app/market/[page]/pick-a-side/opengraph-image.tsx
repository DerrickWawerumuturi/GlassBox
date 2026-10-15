import React from "react";

import {SHARE_SIZE, storyImage} from "@/components/stories/share";
import {fmt} from "@/lib/market-page";
import {card, PICK, PICK_A_SIDE} from "@/lib/stories/pick-a-side";

/*
 * Pick a side's share preview: the story's navy table with the lime card
 * face up, its two shares in Bebas Neue, from the week's numbers.
 */

export const alt = "Pick a side: one week's count of the skills entry level and senior software jobs name, by Glassbox";
export const size = SHARE_SIZE;
export const contentType = "image/png";

export function generateStaticParams() {
    return [{page: PICK_A_SIDE.page}];
}

const INK = "#1a1a1a", MUTED = "#5e5b54", SENIOR = "#8a8f99";

export default function OgImage() {
    const c = card(PICK.beats.lime);
    const share = (v: number, jobs: number, grey: boolean) => (
        <div style={{display: "flex", flexDirection: "column", alignItems: "center", flex: 1}}>
            <div style={{display: "flex", fontFamily: "Bebas Neue", fontSize: 92, lineHeight: 1, color: grey ? SENIOR : INK}}>{`${v}%`}</div>
            <div style={{display: "flex", fontFamily: "JetBrains Mono", fontSize: 18, color: MUTED}}>{`${fmt(jobs)} jobs`}</div>
        </div>
    );
    const art = (
        <div style={{display: "flex", flexDirection: "column", width: 380, padding: "22px 22px 20px", borderRadius: 18, backgroundColor: "#d7ee4c",
            color: INK, transform: "rotate(-5deg)", boxShadow: "0 30px 50px rgba(0,0,0,.55)"}}>
            <div style={{display: "flex", fontSize: 40, fontWeight: 800}}>{c.name}</div>
            <div style={{display: "flex", fontSize: 20, fontWeight: 500, color: MUTED, marginBottom: 14}}>named in</div>
            <div style={{display: "flex", padding: "16px 6px", borderRadius: 12, backgroundColor: "#fff"}}>
                {share(c.e.share, c.e.jobs, false)}{share(c.s.share, c.s.jobs ?? 0, true)}
            </div>
            <div style={{display: "flex", flexDirection: "column", marginTop: 14, fontFamily: "JetBrains Mono", fontSize: 16, color: MUTED}}>
                <div style={{display: "flex"}}>{`of ${fmt(PICK.readable)} entry level software jobs`}</div>
                <div style={{display: "flex"}}>{`of ${fmt(PICK.senior)} senior software jobs`}</div>
            </div>
        </div>
    );
    return storyImage({story: PICK_A_SIDE, ground: "#0f1630", ink: "#efe8df", muted: "#aab0c4", dark: true, art,
        face: {name: "Bebas Neue", file: "bebas-neue-400.ttf"}});
}
