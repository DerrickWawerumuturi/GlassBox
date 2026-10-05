'use client'

import React, {useMemo, useState} from "react";

import {HatchDefs, useHatch} from "@/components/Market/ChartPatterns";
import {TipBox, useTip, useWidth} from "@/components/dashboard/MarketParts";
import {Skill, SkillData} from "./skill-data";

/*
 * Concept B: the skill constellation. The scan's most asked skills, placed
 * so that skills postings ask for together sit close. Yours are solid
 * green, not yet are hatched rings, the size is how many postings ask. The
 * staircase's first step wears the lime ring. Hover or focus a skill to see
 * its neighbours.
 *
 * Layout: a small deterministic force simulation (no library): springs pull
 * pairs together by how strongly they co-occur (Jaccard), every pair repels,
 * a weak pull keeps it centred. Same scan, same picture.
 */

const N = 26;
type Node = {s: Skill; x: number; y: number; r: number};

function layout(data: SkillData, w: number, h: number) {
    const picked = data.skills.slice(0, N);
    const nodes: Node[] = picked.map((s, i) => {
        const a = (i / picked.length) * Math.PI * 2;
        return {s, x: Math.cos(a) * 100, y: Math.sin(a) * 100, r: 5 + Math.sqrt(s.count) * 2.2};
    });
    // Nearly every pair shares some posting, so drawing them all is a hairball. Each skill
    // keeps its three strongest ties (Jaccard), and only ties of 2+ postings count.
    const all: Array<{a: number; b: number; w: number; n: number}> = [];
    for (let i = 0; i < nodes.length; i++) for (let j = i + 1; j < nodes.length; j++) {
        const n = data.together(nodes[i].s.key, nodes[j].s.key);
        const jac = n / (nodes[i].s.count + nodes[j].s.count - n || 1);
        if (n >= 2) all.push({a: i, b: j, w: jac, n});
    }
    const strongest = (i: number) => all.filter((l) => l.a === i || l.b === i).sort((x, y) => y.w - x.w).slice(0, 3);
    const links = [...new Set(nodes.flatMap((_, i) => strongest(i)))];
    for (let it = 0; it < 400; it++) {
        const cool = 1 - it / 400;
        for (let i = 0; i < nodes.length; i++) for (let j = i + 1; j < nodes.length; j++) {
            const [p, q] = [nodes[i], nodes[j]];
            const dx = q.x - p.x || 0.01, dy = q.y - p.y || 0.01, d2 = Math.max(dx * dx + dy * dy, 40);
            const f = (900 / d2) * cool, d = Math.sqrt(d2);
            p.x -= (dx / d) * f; p.y -= (dy / d) * f; q.x += (dx / d) * f; q.y += (dy / d) * f;
        }
        for (const l of links) {
            const [p, q] = [nodes[l.a], nodes[l.b]];
            const dx = q.x - p.x, dy = q.y - p.y, d = Math.hypot(dx, dy) || 1;
            const f = (d - 60) * 0.02 * l.w * 4 * cool;
            p.x += (dx / d) * f; p.y += (dy / d) * f; q.x -= (dx / d) * f; q.y -= (dy / d) * f;
        }
        for (const p of nodes) { p.x *= 0.995; p.y *= 0.995; }
    }
    // Fit into the box, leaving room for labels.
    const xs = nodes.map((p) => p.x), ys = nodes.map((p) => p.y);
    const [x0, x1, y0, y1] = [Math.min(...xs), Math.max(...xs), Math.min(...ys), Math.max(...ys)];
    const sx = (w - 160) / (x1 - x0 || 1), sy = (h - 60) / (y1 - y0 || 1);
    for (const p of nodes) { p.x = 70 + (p.x - x0) * sx; p.y = 30 + (p.y - y0) * sy; }
    return {nodes, links};
}

/** Each label beside its dot: right, left, above or below, whichever hits nothing placed yet. */
function placeLabels(nodes: Node[], w: number) {
    const boxes: Array<[number, number, number, number]> = nodes.map((p) => [p.x - p.r, p.y - p.r, p.x + p.r, p.y + p.r]);
    const hit = (b: [number, number, number, number]) => b[0] < 0 || b[2] > w || boxes.some((o) => b[0] < o[2] && b[2] > o[0] && b[1] < o[3] && b[3] > o[1]);
    return nodes.map((p) => {
        const tw = p.s.name.length * 7.2, th = 14;
        const tries: Array<[number, number, "start" | "end" | "middle"]> = [
            [p.x + p.r + 5, p.y + 4, "start"], [p.x - p.r - 5, p.y + 4, "end"], [p.x, p.y - p.r - 6, "middle"], [p.x, p.y + p.r + 15, "middle"]];
        for (const [x, y, anchor] of tries) {
            const left = anchor === "start" ? x : anchor === "end" ? x - tw : x - tw / 2;
            const b: [number, number, number, number] = [left, y - th + 3, left + tw, y + 3];
            if (!hit(b)) { boxes.push(b); return {x, y, anchor}; }
        }
        return null;
    });
}

export default function Constellation({data, first}: {data: SkillData; first?: string}) {
    const [host, W] = useWidth<HTMLDivElement>();
    const H = W < 520 ? 460 : 520;
    const hatch = useHatch();
    const {tip, bind} = useTip();
    const [focus, setFocus] = useState<number | null>(null);
    const {nodes, links} = useMemo(() => (W ? layout(data, W, H) : {nodes: [], links: []}), [data, W, H]);
    const labels = useMemo(() => placeLabels(nodes, W), [nodes, W]);
    const near = (i: number) => focus === null || i === focus || links.some((l) => (l.a === focus && l.b === i) || (l.b === focus && l.a === i));

    return (
        <div ref={host} className={"w-full"}>
            {W > 0 && (
                <svg width={W} height={H} className={"block"} role={"group"} aria-label={"Skills placed by how often postings ask for them together"}>
                    <HatchDefs id={hatch.id} />
                    {links.map((l, k) => {
                        const on = focus !== null && (l.a === focus || l.b === focus);
                        return <line key={k} x1={nodes[l.a].x} y1={nodes[l.a].y} x2={nodes[l.b].x} y2={nodes[l.b].y}
                                     stroke={"var(--foreground)"} strokeOpacity={on ? 0.55 : focus === null ? 0.1 + l.w * 0.4 : 0.04}
                                     strokeWidth={on ? 1.5 : 1} />;
                    })}
                    {nodes.map((p, i) => {
                        const best = data.skills.filter((s) => s.have).map((m) => ({m, n: data.together(p.s.key, m.key)})).sort((a, b) => b.n - a.n)[0];
                        const sub = !p.s.have && best?.n ? `Asked with your ${best.m.name} in ${best.n}` : undefined;
                        const lab = labels[i];
                        // The tooltip's handlers, wrapped so the same events also light the neighbourhood.
                        const t = bind({title: p.s.name, line: `${p.s.count} of ${data.total} postings · ${p.s.have ? "yours" : "not yet"}`, sub});
                        return (
                            <g key={p.s.key} opacity={near(i) ? 1 : 0.25} className={"outline-none"} {...t}
                               onPointerEnter={(e) => { setFocus(i); t.onPointerEnter(e); }}
                               onPointerLeave={() => { setFocus(null); t.onPointerLeave(); }}
                               onFocus={(e) => { setFocus(i); t.onFocus(e); }}
                               onBlur={() => { setFocus(null); t.onBlur(); }}>
                                {p.s.key === first && <circle cx={p.x} cy={p.y} r={p.r + 5} fill={"none"} stroke={"var(--accent-lime)"} strokeWidth={2} />}
                                <circle cx={p.x} cy={p.y} r={p.r} fill={p.s.have ? "var(--chart-have)" : hatch.fill}
                                        stroke={p.s.have ? "none" : "var(--chart-gap)"} strokeWidth={1.2} />
                                {lab && (
                                    <text x={lab.x} y={lab.y} textAnchor={lab.anchor} fontSize={12} className={"font-mono"}
                                          fill={p.s.have || i === focus ? "var(--foreground)" : "var(--muted-foreground)"}>{p.s.name}</text>
                                )}
                            </g>
                        );
                    })}
                </svg>
            )}
            <TipBox tip={tip} />
        </div>
    );
}
