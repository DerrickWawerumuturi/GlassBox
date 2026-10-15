'use client'

import React, {useEffect, useMemo, useRef, useState} from "react";

import {storyInteracted} from "@/lib/analytics";
import {cn} from "@/lib/utils";
import {COL, drawYard, stencil, YardConfig} from "./draw";
import s from "./eleven.module.css";

/*
 * One yard you can drive: the crane's trolley glides along the girder and the
 * lime plate on its hook reads the bay under it. Drive by the two buttons,
 * the arrow keys (Home and End too) with the yard focused, dragging, or
 * tapping a stack. On a phone the camera follows the crane. "Fly over" shows
 * the same bays as a table. Drawn first for a desktop width, so the server's
 * HTML holds the whole picture; redrawn for the stage's own width once seen.
 */

const DESK = 1036;

function Table({cfg}: {cfg: YardConfig}) {
    const has = (k: "share" | "employers" | "senior") => cfg.bays.some((b) => b[k] !== undefined);
    return (
        <table>
            <caption>{cfg.title}{cfg.tableNote ? `. ${cfg.tableNote}` : ""}</caption>
            <thead><tr>
                <th scope={"col"}>Bay</th><th scope={"col"}>Jobs</th>{has("share") && <th scope={"col"}>Share</th>}
                {has("employers") && <th scope={"col"}>Employers</th>}{has("senior") && <th scope={"col"}>Senior share</th>}
            </tr></thead>
            <tbody>
                {cfg.bays.map((b) => (
                    <tr key={b.name}>
                        <th scope={"row"}>{b.name}</th>
                        <td>
                            <span className={cn(s.bar, b.k === "gap" && s.hatch)} style={{width: `${(100 * b.n / b.of).toFixed(1)}%`, ...(b.k === "gap" ? {} : {background: COL[b.k]})}} />
                            <span className={s.num}>{b.n} of {b.of}</span>
                        </td>
                        {has("share") && <td>{b.share !== undefined ? `${b.share}%` : ""}</td>}
                        {has("employers") && <td>{b.employers ?? ""}</td>}
                        {has("senior") && <td>{b.senior !== undefined ? `${b.senior}%` : ""}</td>}
                    </tr>
                ))}
            </tbody>
        </table>
    );
}

export default function Yard({cfg, children}: {cfg: YardConfig; children?: React.ReactNode}) {
    const stage = useRef<HTMLDivElement>(null);
    const [W, setW] = useState(DESK);
    const [cur, setCur] = useState(0);
    const [moved, setMoved] = useState(false);
    const [flown, setFlown] = useState(false);
    const [drag, setDrag] = useState<{x: number; from: number; dx: number} | null>(null);
    const d = useMemo(() => drawYard(cfg, W), [cfg, W]);
    const n = cfg.bays.length, b = cfg.bays[cur];

    useEffect(() => {
        const el = stage.current;
        if (!el) return;
        let timer: ReturnType<typeof setTimeout> | undefined;
        const measure = () => { if (el.clientWidth) setW(el.clientWidth); };
        measure();
        const resize = () => { clearTimeout(timer); timer = setTimeout(measure, 150); };
        addEventListener("resize", resize);
        return () => { removeEventListener("resize", resize); clearTimeout(timer); };
    }, [flown]);

    // Only a reader drives the crane, so every drive is a use of the story (story_interacted, once per page view).
    const go = (i: number) => { storyInteracted("within-eleven-jobs", "crane"); setCur(Math.max(0, Math.min(n - 1, i))); setMoved(true); };
    const camX = d.worldW <= W ? -(W - d.worldW) / 2 : Math.max(0, Math.min(d.worldW - W, d.Xs(cur) - W / 2));
    const tx = drag ? drag.from + drag.dx - d.X0 : d.Xs(cur) - d.X0, len = d.len[cur];

    const key = (e: React.KeyboardEvent) => {
        const k = ({ArrowLeft: cur - 1, ArrowRight: cur + 1, Home: 0, End: n - 1} as Record<string, number>)[e.key];
        if (k === undefined) return;
        e.preventDefault(); go(k);
    };
    const down = (e: React.PointerEvent<HTMLDivElement>) => {
        e.currentTarget.setPointerCapture(e.pointerId);
        setDrag({x: e.clientX, from: d.Xs(cur), dx: 0});
    };
    const move = (e: React.PointerEvent) => { if (drag) setDrag({...drag, dx: e.clientX - drag.x}); };
    const up = (e: React.PointerEvent<HTMLDivElement>) => {
        if (!drag) return;
        setDrag(null);
        if (Math.abs(drag.dx) < 6) {
            // A tap: the bay under the finger, in the drawing's own units.
            const r = e.currentTarget.getBoundingClientRect(), wx = (e.clientX - r.left) * W / r.width + camX;
            go(Math.round((wx - d.X0) / d.pitchPx));
        } else go(Math.round((drag.from + drag.dx - d.X0) / d.pitchPx));
    };

    return (
        <figure className={cn(s.wide, flown && s.flown)} id={cfg.id}>
            <div ref={stage} className={s.stage} tabIndex={0} role={"img"} aria-label={moved ? `${cfg.label} The crane is over ${b.name}.` : cfg.label}
                 onKeyDown={key} onPointerDown={down} onPointerMove={move} onPointerUp={up} onPointerCancel={() => setDrag(null)}>
                <svg viewBox={`0 0 ${W} ${d.Hpx}`} width={W} height={d.Hpx} aria-hidden focusable={"false"} className={cfg.ship ? "ship" : undefined}>
                    <g dangerouslySetInnerHTML={{__html: d.svg.sky}} />
                    <g className={"cam"} style={{transform: `translateX(${+(-camX).toFixed(1)}px)`}}>
                        <g dangerouslySetInnerHTML={{__html: d.svg.under}} />
                        <g dangerouslySetInnerHTML={{__html: d.svg.craneFront}} />
                        <g className={cn("trolley", drag && "drag")} style={{transform: `translateX(${tx.toFixed(1)}px)`}}>
                            <g dangerouslySetInnerHTML={{__html: d.svg.carriage}} />
                            {d.cables.map((x) => <rect key={x} className={"cable"} x={x} y={d.Ysp} width={1.4} height={1} fill={"#3a3d46"} style={{transform: `scaleY(${len.toFixed(1)})`}} />)}
                            <g dangerouslySetInnerHTML={{__html: d.svg.cab}} />
                            <g className={"hook"} style={{transform: `translateY(${len.toFixed(1)}px)`}}>
                                <g dangerouslySetInnerHTML={{__html: d.svg.spreader}} />
                                <text className={"plate-name"} x={d.plate.x} y={d.plate.name} textAnchor={"middle"}>{stencil(b.name)}</text>
                                <text className={"plate-n"} x={d.plate.x} y={d.plate.n} textAnchor={"middle"}>{b.n} of {b.of}</text>
                            </g>
                        </g>
                    </g>
                    <g dangerouslySetInnerHTML={{__html: d.svg.note}} />
                </svg>
            </div>
            <div className={s.deck}>
                <button type={"button"} className={s.drv} onClick={() => go(cur - 1)}><span aria-hidden>‹</span> Drive left</button>
                <button type={"button"} className={s.drv} onClick={() => go(cur + 1)}>Drive right <span aria-hidden>›</span></button>
                <button type={"button"} className={s.fly} aria-pressed={flown} onClick={() => { storyInteracted("within-eleven-jobs", "fly_over"); setFlown(!flown); }}>{flown ? "Back down" : "Fly over"}</button>
                <p className={s.readout} aria-live={"polite"}><b>{b.name}</b> {b.say}</p>
            </div>
            <div className={s.plan}><Table cfg={cfg} /></div>
            {children}
        </figure>
    );
}
