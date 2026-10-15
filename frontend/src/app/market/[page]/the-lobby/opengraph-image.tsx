import React from "react";

import {SHARE_SIZE, storyImage} from "@/components/stories/share";
import {fmt} from "@/lib/market-page";
import {FLOORS, LOBBY, THE_LOBBY} from "@/lib/stories/the-lobby";

/*
 * The lobby's share preview: the building in section on the night ground,
 * floor widths as counts, the lobby (no number stated) hatched and widest,
 * the floors labelled in Limelight, from the week's numbers.
 */

export const alt = "The lobby is the biggest floor: one week's count of the years software engineering jobs ask for, by Glassbox";
export const size = SHARE_SIZE;
export const contentType = "image/png";

export function generateStaticParams() {
    return [{page: THE_LOBBY.page}];
}

const INK = "#efe8df", BRASS = "#c9a24a", SLAB = "#e6dcc8";

export default function OgImage() {
    const widest = FLOORS[0].jobs;
    const art = (
        <div style={{display: "flex", flexDirection: "column-reverse", width: 470, gap: 6}}>
            {FLOORS.map((f, i) => (
                <div key={f.k} style={{display: "flex", alignItems: "center", gap: 12}}>
                    <div style={{display: "flex", width: Math.round((f.jobs / widest) * 300), height: i ? 46 : 64, backgroundColor: i ? SLAB : "#8a8f99",
                        ...(i ? {} : {backgroundImage: "repeating-linear-gradient(45deg, #8a8f99 0 3px, #2a2f3f 3px 9px)"}), border: `2px solid ${i ? "#21201c" : BRASS}`}} />
                    <div style={{display: "flex", fontFamily: "Limelight", fontSize: 26, color: BRASS}}>{f.k}</div>
                    <div style={{display: "flex", fontFamily: "JetBrains Mono", fontSize: 22, color: INK}}>{fmt(f.jobs)}</div>
                </div>
            ))}
            <div style={{display: "flex", fontFamily: "JetBrains Mono", fontSize: 18, color: "#b8afa3", marginBottom: 8}}>{`of ${fmt(LOBBY.jobs)} jobs, by the years they ask for`}</div>
        </div>
    );
    return storyImage({story: THE_LOBBY, ground: "#141a2b", ink: INK, muted: "#b8afa3", dark: true, art, wide: true,
        face: {name: "Limelight", file: "limelight-400.ttf"}});
}
