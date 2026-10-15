'use client'

import React, {useCallback, useEffect, useRef, useState} from "react";

import t from "@/components/stories/story.module.css";
import {storyInteracted} from "@/lib/analytics";
import {PEAK} from "@/lib/stories/peak-python";
import {cn} from "@/lib/utils";
import {f, label, Layout, layout, line1, line2, line3, panorama, polar, RIDGE_NAME, tableArt} from "./engrave";
import s from "./peak.module.css";

/*
 * The range and the bronze orientation table under it (the prototype's
 * range.js and table.js). The sighting arm pivots at the viewer's spot; swing
 * it (drag the disc, the arrow keys, the step buttons, or tap a peak) and the
 * engraved plate reads the peak it points at. The arm's angle is the true
 * angle from the pivot to that summit, so the beam lands on the peak read.
 * Before the page has measured its width it shows the desk's and the phone's
 * drawing (CSS picks one), so it reads without script; after, one drawing at
 * the column's own width, 1 unit to 1px, as the prototype draws it.
 */

const reduced = () => typeof matchMedia === "function" && matchMedia("(prefers-reduced-motion: reduce)").matches;
const LAST = PEAK.peaks.length - 1;

type Drawn = {L: Layout; id: string; html: string};
const draw = (W: number, id: string): Drawn => {
    const L = layout(W);
    return {L, id, html: panorama(s, L, id, 0)};
};

function Plate({L, idx}: {L: Layout; idx: number}) {
    const p = L.peaks[idx], {cx, py} = L, two = line2(p), three = line3(p);
    return (
        <g>
            <text className={s.pr} x={f(cx)} y={f(py + 28)} textAnchor={"middle"}>{RIDGE_NAME[p.ridge].toUpperCase()}</text>
            <text className={s.pn} x={f(cx)} y={f(py + 60)} textAnchor={"middle"}>{p.name}</text>
            <text className={s.p1} x={f(cx)} y={f(py + 84)} textAnchor={"middle"}>{line1(p)}</text>
            <text className={s.p2} x={f(cx)} y={f(py + 103)} textAnchor={"middle"}>{two || three}</text>
            <text className={s.p2} x={f(cx)} y={f(py + 120)} textAnchor={"middle"}>{two ? three : ""}</text>
        </g>
    );
}

function Drawing({d, idx, arm, touched, disc, className}: {d: Drawn; idx: number; arm: number; touched: boolean; disc?: React.Ref<SVGGElement>; className?: string}) {
    const {L} = d, p = L.peaks[idx], [bx, by] = polar(L, arm, L.R - 30), {cx, cy, R} = L;
    return (
        <svg className={cn(s.range, L.phone && s.phone, className)} viewBox={`0 0 ${L.W} ${f(L.H)}`} width={L.W} height={f(L.H)} role={"group"}
             aria-label={`The range: ${PEAK.peaks.length} skills as peaks, each as tall as its share of ${PEAK.readable} machine learning jobs. The sighting arm on the bronze table reads one at a time.`}>
            <g dangerouslySetInnerHTML={{__html: d.html}} />
            <g ref={disc} className={cn(s.disc, touched && s.touched)} tabIndex={0} role={"slider"} aria-orientation={"horizontal"}
               aria-label={"Sighting arm. Left and right arrow keys move it along the range."} aria-valuemin={0} aria-valuemax={LAST}
               aria-valuenow={idx} aria-valuetext={label(p)} data-disc>
                <g dangerouslySetInnerHTML={{__html: tableArt(s, L, d.id, 0)}} />
                <Plate L={L} idx={idx} />
                <g transform={`rotate(${f(arm)} ${f(cx)} ${f(cy)})`}>
                    <path d={`M${f(cx - 4)} ${f(cy - 5.5)}L${f(cx + R - 42)} ${f(cy - 1.8)}L${f(cx + R - 42)} ${f(cy + 1.8)}L${f(cx - 4)} ${f(cy + 5.5)}Z`} className={s.armb} />
                    <path d={`M${f(cx - 12)} ${f(cy)}H${f(cx + R - 46)}`} className={s.armline} />
                    <circle cx={f(cx + R - 30)} cy={f(cy)} r={9} className={s.sight} /><circle cx={f(cx + R - 30)} cy={f(cy)} r={2} className={s.sightdot} />
                    <circle cx={f(cx)} cy={f(cy)} r={10} className={s.bolt} />
                </g>
                <path d={`M${f(bx)} ${f(by)}L${f(p.x)} ${f(p.y)}`} className={s.beam} />
                <circle cx={f(p.x)} cy={f(p.y)} r={5} className={s.mark} />
            </g>
        </svg>
    );
}

export default function Range({children}: {children: React.ReactNode}) {
    const fig = useRef<HTMLDivElement>(null), svgWrap = useRef<HTMLDivElement>(null), disc = useRef<SVGGElement>(null);
    const [drawn, setDrawn] = useState<Drawn | null>(null);
    const [idx, setIdx] = useState(0);
    const [arm, setArm] = useState(() => layout(1080).peaks[0].ang);
    const [touched, setTouched] = useState(false);
    const [said, setSaid] = useState("");
    const [list, setList] = useState(false);
    const drag = useRef(false), raf = useRef(0), armNow = useRef(arm), idxRef = useRef(0);
    const L = drawn?.L;

    const rot = (a: number) => { armNow.current = a; setArm(a); };
    const tween = useCallback((to: number) => {
        cancelAnimationFrame(raf.current);
        if (reduced()) return rot(to);
        const from = armNow.current, t0 = performance.now();
        const step = (now: number) => {
            const k = Math.min(1, (now - t0) / 280), e = 1 - Math.pow(1 - k, 3);
            rot(from + (to - from) * e);
            if (k < 1) raf.current = requestAnimationFrame(step);
        };
        raf.current = requestAnimationFrame(step);
    }, []);

    // Measure the column and draw at its width; again when a phone turns.
    useEffect(() => {
        let last = 0, timer = 0;
        const measure = () => {
            const W = Math.round(fig.current!.clientWidth);
            if (W === last) return;
            last = W;
            const d = draw(W, "");
            setDrawn(d);
            rot(d.L.peaks[idxRef.current].ang);
        };
        measure();
        const onResize = () => { clearTimeout(timer); timer = window.setTimeout(measure, 120); };
        addEventListener("resize", onResize);
        return () => { removeEventListener("resize", onResize); clearTimeout(timer); cancelAnimationFrame(raf.current); };
    }, []);

    // Only a reader moves the arm, so every call is a use of the story (story_interacted, once per page view).
    const go = (i: number, animate = true) => {
        if (!L) return;
        storyInteracted("peak-python", "arm");
        const n = Math.max(0, Math.min(LAST, i));
        idxRef.current = n; setIdx(n); setSaid(label(L.peaks[n]));
        if (animate) tween(L.peaks[n].ang); else rot(L.peaks[n].ang);
    };

    // The names, the peak's rock and its tick on the rim mark the peak being read.
    useEffect(() => {
        svgWrap.current?.querySelectorAll<SVGElement>("[data-sel]").forEach((el) => el.classList.toggle(s.on, Number(el.dataset.i) === idx));
    }, [idx, drawn]);

    // A drag must not scroll the page under the finger.
    useEffect(() => {
        const el = svgWrap.current;
        const hold = (e: TouchEvent) => { if (drag.current) e.preventDefault(); };
        el?.addEventListener("touchmove", hold, {passive: false});
        return () => el?.removeEventListener("touchmove", hold);
    }, []);

    const angleOf = (e: React.PointerEvent) => {
        const svg = (e.currentTarget as HTMLElement).querySelector("svg")!, r = svg.getBoundingClientRect(), k = L!.W / r.width;
        return Math.atan2((e.clientY - r.top) * k - L!.cy, (e.clientX - r.left) * k - L!.cx) * 180 / Math.PI;
    };
    const nearest = (a: number) => L!.peaks.reduce((b, p) => (Math.abs(p.ang - a) < Math.abs(L!.peaks[b].ang - a) ? p.i : b), 0);
    const move = (e: React.PointerEvent) => {
        if (!drag.current || !L) return;
        let a = angleOf(e);
        if (a > 0) a = a < 90 ? -1 : -179;
        a = Math.max(L.peaks[0].ang - 6, Math.min(L.peaks[LAST].ang + 6, a));
        const i = nearest(a);
        if (i !== idxRef.current) { idxRef.current = i; setIdx(i); setSaid(label(L.peaks[i])); }
        cancelAnimationFrame(raf.current); rot(a);
    };
    const down = (e: React.PointerEvent) => {
        if (!L || !(e.target as Element).closest("[data-disc]")) return;
        drag.current = true; cancelAnimationFrame(raf.current);
        (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
        setTouched(true); disc.current?.focus({preventScroll: true});
        move(e); e.preventDefault();
    };
    const up = () => { if (!drag.current) return; drag.current = false; go(idxRef.current); };
    const click = (e: React.MouseEvent) => {
        const hit = (e.target as Element).closest<SVGElement>("[data-pk], [data-ptick]");
        if (hit) go(Number(hit.dataset.i));
    };
    const key = (e: React.KeyboardEvent) => {
        const target = e.target as Element, pk = target.closest<SVGElement>("[data-pk]");
        if (pk && (e.key === "Enter" || e.key === " ")) { e.preventDefault(); return go(Number(pk.dataset.i)); }
        if (!target.closest("[data-disc]")) return;
        setTouched(false);
        const d = ({ArrowLeft: -1, ArrowUp: -1, ArrowRight: 1, ArrowDown: 1} as Record<string, number>)[e.key];
        if (d) { e.preventDefault(); go(idxRef.current + d); }
        if (e.key === "Home") { e.preventDefault(); go(0); }
        if (e.key === "End") { e.preventDefault(); go(LAST); }
    };

    return (
        <>
            <div ref={fig}>
                <div ref={svgWrap} onPointerDown={down} onPointerMove={move} onPointerUp={up} onPointerCancel={up} onClick={click} onKeyDown={key}>
                    {drawn ? <Drawing d={drawn} idx={idx} arm={arm} touched={touched} disc={disc} />
                        : <>
                            <Drawing d={draw(1080, "d")} idx={0} arm={layout(1080).peaks[0].ang} touched={false} className={s.onDesk} />
                            <Drawing d={draw(390, "m")} idx={0} arm={layout(390).peaks[0].ang} touched={false} className={s.onPhone} />
                        </>}
                </div>
            </div>
            <p className={t.sr} aria-live={"polite"}>{said}</p>
            <div className={s.controls}>
                <button type={"button"} className={s.step} onClick={() => go(idxRef.current - 1)}>← Previous peak</button>
                <button type={"button"} className={s.step} onClick={() => go(idxRef.current + 1)}>Next peak →</button>
                <button type={"button"} className={cn(s.step, s.ghost)} aria-expanded={list} aria-controls={"peaklist"} onClick={() => { storyInteracted("peak-python", "peak_list"); setList(!list); }}>
                    {list ? "Hide the list" : "List the peaks"}</button>
            </div>
            <div id={"peaklist"} className={cn(s.twin, s.col, !list && s.shut)}>{children}</div>
        </>
    );
}
