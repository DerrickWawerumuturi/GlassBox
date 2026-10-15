import React from "react";

import {SHARE_SIZE, storyImage} from "@/components/stories/share";
import {fmt} from "@/lib/market-page";
import {CONTENTS, CONTENTS_MAY_VARY} from "@/lib/stories/contents-may-vary";

/*
 * Contents may vary's share preview: on the story's cream counter, the box's
 * label's top lines with the week's numbers, LLMs in lime, and the box's
 * "NET 567 JOBS" roundel in Bungee.
 */

export const alt = "Contents may vary: one week's count of the skills AI jobs name, by Glassbox";
export const size = SHARE_SIZE;
export const contentType = "image/png";

export function generateStaticParams() {
    return [{page: CONTENTS_MAY_VARY.page}];
}

const INK = "#161411", MUTED = "#5b5751";

export default function OgImage() {
    const art = (
        <div style={{display: "flex", position: "relative", width: 420, border: `4px solid ${INK}`, backgroundColor: "#fff", boxShadow: "10px 10px 0 #ff3d8f"}}>
            <div style={{display: "flex", width: 54, backgroundColor: "#ff3d8f", borderRight: `4px solid ${INK}`}} />
            <div style={{display: "flex", flexDirection: "column", flex: 1, padding: "16px 18px 10px", color: INK}}>
                <div style={{display: "flex", fontSize: 40, fontWeight: 800, letterSpacing: -1}}>INGREDIENTS</div>
                <div style={{display: "flex", fontSize: 17, fontWeight: 500, marginBottom: 8}}>{`of ${fmt(CONTENTS.readable)} AI jobs we could read`}</div>
                <div style={{display: "flex", height: 9, backgroundColor: INK}} />
                {CONTENTS.label.slice(0, 5).map((l, k) => (
                    <div key={l.key} style={{display: "flex", alignItems: "center", height: 46, borderTop: k ? `1.5px solid ${INK}` : "none", padding: "0 8px",
                        backgroundColor: k === 0 ? "#d7ee4c" : "transparent", fontSize: 21, fontWeight: 800, color: l.jobs === null ? MUTED : INK}}>
                        <div style={{display: "flex", flex: 1, whiteSpace: "nowrap"}}>{l.name}</div>
                        <div style={{display: "flex", width: 70, justifyContent: "flex-end", fontFamily: "JetBrains Mono", fontSize: 20}}>{l.jobs === null ? "–" : String(l.jobs)}</div>
                        <div style={{display: "flex", width: 66, justifyContent: "flex-end", fontFamily: "JetBrains Mono", fontSize: 20}}>{`${l.share}%`}</div>
                    </div>
                ))}
            </div>
            <div style={{display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", position: "absolute", right: -34, top: -44,
                width: 104, height: 104, borderRadius: 52, backgroundColor: "#1fb6ff", border: `4px solid ${INK}`, color: "#fff", transform: "rotate(8deg)"}}>
                <div style={{display: "flex", fontSize: 15, fontWeight: 800, letterSpacing: 1}}>NET</div>
                <div style={{display: "flex", fontFamily: "Bungee", fontSize: 32, lineHeight: 1}}>{fmt(CONTENTS.readable)}</div>
                <div style={{display: "flex", fontSize: 15, fontWeight: 800, letterSpacing: 1}}>JOBS</div>
            </div>
        </div>
    );
    return storyImage({story: CONTENTS_MAY_VARY, ground: "#fff6e5", ink: INK, muted: "#645d52", dark: false, art, wide: true,
        face: {name: "Bungee", file: "bungee-400.ttf"}});
}
