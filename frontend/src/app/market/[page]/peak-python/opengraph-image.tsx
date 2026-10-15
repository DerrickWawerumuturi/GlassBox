import React from "react";

import {SHARE_SIZE, storyImage} from "@/components/stories/share";
import {PEAK, PEAK_PYTHON, peak} from "@/lib/stories/peak-python";

/*
 * Peak Python's share preview: the story's ice sky with the page's language
 * peaks to one scale (as bars, which the image renderer draws faithfully),
 * Python's flagged in lime, and the bronze plate that reads it, from the
 * week's numbers. No display face: Hanken Grotesk and the mono.
 */

export const alt = "Peak Python: one week's count of the skills machine learning jobs name, by Glassbox";
export const size = SHARE_SIZE;
export const contentType = "image/png";

export function generateStaticParams() {
    return [{page: PEAK_PYTHON.page}];
}

const W = 420, H = 300, BASE = 290, SCALE = 3.5;

export default function OgImage() {
    const py = peak("python"), langs = PEAK.peaks.filter((p) => p.ridge === "lang"), slot = W / langs.length;
    // The peaks as paths (the image renderer draws an inline svg's shapes, not its text); the names sit above as text.
    const peaks = langs.map((p, i) => {
        const x = slot * (i + .5), top = BASE - p.share * SCALE, half = slot * .62;
        return {p, x, top, rock: `M${x - half} ${BASE}L${x} ${top}L${x + half} ${BASE}Z`, shade: `M${x} ${top}L${x + half} ${BASE}L${x + 4} ${BASE}Z`,
            snow: `M${x} ${top}L${x - half * .16} ${top + 26}L${x} ${top + 20}L${x + half * .16} ${top + 26}Z`};
    });
    const art = (
        <div style={{display: "flex", flexDirection: "column", width: W, borderRadius: 6, overflow: "hidden", border: "1px solid #3b4651"}}>
            <div style={{display: "flex", position: "relative", width: W, height: H}}>
                <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} style={{position: "absolute", left: 0, top: 0}}>
                    <defs><linearGradient id="s" x1="0" x2="0" y1="0" y2="1"><stop offset="0" stopColor="#cfe0f0" /><stop offset="1" stopColor="#f4f6f8" /></linearGradient></defs>
                    <rect width={W} height={H} fill="url(#s)" />
                    {peaks.map(({p, rock, shade, snow, x, top}) => (
                        <g key={p.key}>
                            <path d={rock} fill="#9aa6b1" stroke="#3b4651" strokeWidth={1.5} />
                            <path d={shade} fill="#5c6974" opacity={.8} />
                            {p.share * SCALE > 40 && <path d={snow} fill="#ffffff" stroke="#3b4651" strokeWidth={1} />}
                            {p === py && <path d={`M${x} ${top}V${top - 30}`} stroke="#3b4651" strokeWidth={2} />}
                            {p === py && <path d={`M${x} ${top - 30}l22 7-22 8z`} fill="#d7ee4c" stroke="#3b4651" />}
                        </g>
                    ))}
                    <rect y={BASE} width={W} height={H - BASE} fill="#d9c9a3" />
                </svg>
                {/* The flagged peak's name sits beside its flag; the others' above their summits. */}
                {peaks.map(({p, x, top}) => (
                    <div key={p.key} style={{display: "flex", position: "absolute", left: p === py ? x + 30 : x - 60, width: 120, justifyContent: p === py ? "flex-start" : "center",
                        top: top - (p === py ? 40 : 34), fontSize: 22, fontWeight: 800, color: "#21201c"}}>{`${p.name} ${p.share}%`}</div>
                ))}
            </div>
            <div style={{display: "flex", justifyContent: "center", padding: "14px 0", backgroundColor: "#6b4f2c", color: "#f1e6cf",
                fontFamily: "JetBrains Mono", fontSize: 20, letterSpacing: 1}}>{`PYTHON · ${py.jobs} OF ${PEAK.readable} · ${py.share}%`}</div>
        </div>
    );
    return storyImage({story: PEAK_PYTHON, ground: "#f7f3ef", ink: "#21201c", muted: "#63635e", dark: false, art});
}
