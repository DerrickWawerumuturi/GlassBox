'use client'

import React, {useEffect, useRef, useState} from "react";

import {ELEVEN} from "@/lib/stories/within-eleven-jobs";
import s from "./eleven.module.css";

/*
 * The yard plan: the skills the page gives only as shares, painted on the
 * concrete and never stacked, because a share is not a count. Painted length
 * is the share of the readable jobs; each zone says how many name a skill in
 * it. Drawn first for a desktop width, then for the figure's own width.
 */

const DESK = 1036, PAINT = "#f1f1ee";
const esc = (t: string) => t.replace(/[&<>"]/g, (c) => ({"&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;"})[c]!);
// The first zone's bays that are also stacked on the quay, by name: their stack's colour and a pen note.
const STACKED: Record<string, string> = {"Terraform / IaC": "#3c6e9f", "Kubernetes": "#5c6670"};

export const planLabel = () => `Yard plan: the share of the ${ELEVEN.readable} DevOps jobs we could read that name each skill. `
    + ELEVEN.zones.map((z) => `${z.name}, ${z.jobs} jobs name at least one: ${z.skills.map((k) => `${k.name} ${k.share}%`).join(", ")}.`).join(" ");

function draw(W: number, week: string) {
    const narrow = W < 640, lab = narrow ? 0 : 236, x0 = 16 + lab, bw = W - x0 - 60, row = narrow ? 46 : 32;
    const top = (n: string) => ELEVEN.top.find((t) => t.name === n);
    let y = 88, svg = `<text class="stencil" x="16" y="28" font-size="14">YARD PLAN · DEVOPS${narrow ? "" : ` · WEEK OF ${week.toUpperCase()}`}</text>`;
    svg += [0, 25, 50, 75, 100].map((k) => `<path d="M${(x0 + bw * k / 100).toFixed(1)} 62v10" stroke="${PAINT}" stroke-width="2"/><text class="mono" x="${(x0 + bw * k / 100).toFixed(1)}" y="56" text-anchor="${k === 100 ? "end" : k === 0 ? "start" : "middle"}" font-size="12">${k}%</text>`).join("");
    for (const z of ELEVEN.zones) {
        const h = 34 + z.skills.length * row + 8;
        svg += `<rect x="8" y="${y}" width="${W - 16}" height="${h}" rx="3" fill="none" stroke="${PAINT}" stroke-width="2.5" stroke-dasharray="14 8"/>`;
        svg += `<text class="stencil" x="20" y="${y + 23}" font-size="13">${esc(z.name.toUpperCase())} · ${z.jobs} OF ${ELEVEN.readable} NAME ONE</text>`;
        let ry = y + 34;
        for (const k of z.skills) {
            const col = STACKED[k.name], stacked = col ? top(k.name) : undefined;
            const bx = narrow ? 20 : x0, by = narrow ? ry + 22 : ry + 6, w = Math.max(2, bw * k.share / 100);
            svg += `<text class="name" x="${narrow ? 20 : x0 - 14}" y="${narrow ? ry + 15 : ry + 19}" text-anchor="${narrow ? "start" : "end"}">${esc(k.name)}</text>`;
            svg += `<rect x="${bx}" y="${by}" width="${w.toFixed(1)}" height="16" fill="${col || PAINT}" opacity="${col ? 1 : .92}"/><text class="mono" x="${(bx + w + 8).toFixed(1)}" y="${by + 13}" font-size="13" font-weight="700">${k.share}%</text>`;
            if (stacked && !narrow) svg += `<text class="pen" x="${(bx + w + 52).toFixed(1)}" y="${by + 14}" font-size="19">stacked on the quay, ${stacked.jobs}</text>`;
            ry += row;
        }
        y += h + 16;
    }
    if (!narrow) svg += `<text class="pen" x="${(x0 + bw * .55).toFixed(1)}" y="${88 + 34 + ELEVEN.zones[0].skills.length * row + 62}" font-size="22">painted, not stacked: a share is not a count</text>`;
    svg += `<g transform="translate(${W - 110} ${y - 54})" fill="none" stroke="#9a948a" stroke-width="2"><rect x="0" y="0" width="52" height="22" rx="2"/>${[8, 17, 26, 35, 44].map((x) => `<path d="M${x} 3v16"/>`).join("")}</g>`;
    return {svg, h: y + 4};
}

export default function Plan({week}: {week: string}) {
    const wrap = useRef<HTMLDivElement>(null);
    const [W, setW] = useState(DESK);
    useEffect(() => {
        const el = wrap.current;
        if (!el) return;
        let timer: ReturnType<typeof setTimeout> | undefined;
        const measure = () => { if (el.clientWidth) setW(Math.max(300, el.clientWidth)); };
        measure();
        const resize = () => { clearTimeout(timer); timer = setTimeout(measure, 150); };
        addEventListener("resize", resize);
        return () => { removeEventListener("resize", resize); clearTimeout(timer); };
    }, []);
    const {svg, h} = draw(W, week);
    return (
        <div ref={wrap} className={s.planwrap}>
            <svg viewBox={`0 0 ${W} ${h}`} role={"img"} aria-label={planLabel()} dangerouslySetInnerHTML={{__html: svg}} />
        </div>
    );
}
