import React from "react";

import {SHARE_SIZE, storyImage} from "@/components/stories/share";
import {fmt} from "@/lib/market-page";
import {ELEVEN, WITHIN_ELEVEN_JOBS} from "@/lib/stories/within-eleven-jobs";

/*
 * Within eleven jobs' share preview: the story's dusk with the three stacks
 * at the top standing side by side, as tall as their counts, each count
 * stencilled on it, from the week's numbers.
 */

export const alt = "Within eleven jobs: one week's count of the skills DevOps jobs name most, by Glassbox";
export const size = SHARE_SIZE;
export const contentType = "image/png";

export function generateStaticParams() {
    return [{page: WITHIN_ELEVEN_JOBS.page}];
}

const COLOURS = ["#3c6e9f", "#8e2d3b", "#5c6670"];

export default function OgImage() {
    const max = ELEVEN.top[0].jobs;
    const art = (
        <div style={{display: "flex", flexDirection: "column", width: 440, borderRadius: 10, overflow: "hidden", backgroundColor: "#c9c4bb"}}>
            <div style={{display: "flex", alignItems: "flex-end", justifyContent: "center", gap: 22, height: 300, padding: "20px 24px 0",
                backgroundImage: "linear-gradient(#c3bce0, #f0dccf)"}}>
                {ELEVEN.top.map((t, i) => (
                    <div key={t.key} style={{display: "flex", alignItems: "flex-end", justifyContent: "center", width: 104, height: Math.round(260 * t.jobs / max),
                        backgroundColor: COLOURS[i], border: "2px solid #22201c", paddingBottom: 10,
                        backgroundImage: "linear-gradient(rgba(0,0,0,.18) 1px, transparent 1px)", backgroundSize: "104px 13px"}}>
                        <div style={{display: "flex", fontFamily: "Allerta Stencil", fontSize: 38, color: "#f1f1ee"}}>{fmt(t.jobs)}</div>
                    </div>
                ))}
            </div>
            <div style={{display: "flex", justifyContent: "center", gap: 22, padding: "10px 24px 14px"}}>
                {ELEVEN.top.map((t) => (
                    <div key={t.key} style={{display: "flex", justifyContent: "center", width: 104, fontFamily: "Allerta Stencil", fontSize: 13, whiteSpace: "nowrap", color: "#2b2a26"}}>
                        {t.name.toUpperCase().replace("IAC", "IaC")}
                    </div>
                ))}
            </div>
            <div style={{display: "flex", justifyContent: "center", padding: "10px 0", backgroundColor: "#1f4f8f", color: "#f1f1ee",
                fontFamily: "JetBrains Mono", fontSize: 17}}>{`of ${fmt(ELEVEN.readable)} DevOps jobs we could read`}</div>
        </div>
    );
    return storyImage({story: WITHIN_ELEVEN_JOBS, ground: "#f7f3ef", ink: "#21201c", muted: "#63635e", dark: false, art,
        face: {name: "Allerta Stencil", file: "allerta-stencil-400.ttf"}});
}
