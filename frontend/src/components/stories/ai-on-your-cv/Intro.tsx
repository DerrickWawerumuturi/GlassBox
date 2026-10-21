'use client'

import React, {useEffect, useRef} from "react";

import {cn} from "@/lib/utils";
import {DOOR_DIR, FAMILY_DOORS, trace, WOOD} from "./doors";
import s from "./intro.module.css";

/*
 * The opening (the prototype's intro.js): real doors first, then our
 * drawings. The wooden door with the Holzland Becker listing taped beside it
 * (`card`), then one door per job family with a small sign naming it, no
 * numbers. Wide: the row breaks out of the text column and sticks; the camera
 * pulls back from the wooden door, pans along the row, then a marker traces
 * each door and the photos fade, leaving drawn doors. The words under the row
 * (`beats`) follow the camera. CSS draws the first frame before any script,
 * so nothing jumps; the scroll then moves the tiles through inline styles,
 * not React state. Phone, or reduced motion: CSS stacks it (the door, the
 * words, a row to swipe or a grid) and nothing moves.
 */

const LIVE = "(min-width: 761px) and (prefers-reduced-motion: no-preference)";
const UL = -.64;   // the card's left edge, in door widths from the wooden door's left edge
const clamp = (v: number, a: number, b: number) => Math.max(a, Math.min(b, v)), lerp = (a: number, b: number, t: number) => a + (b - a) * t;
const ease = (t: number) => (t < .5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2), ramp = (v: number, a: number, b: number) => clamp((v - a) / (b - a), 0, 1);
type Var = React.CSSProperties & Record<`--${string}`, string | number>;

const Trace = ({d, seed}: {d: typeof WOOD; seed: number}) =>
    <svg className={s.itrace} viewBox={"0 0 100 150"} preserveAspectRatio={"none"} aria-hidden dangerouslySetInnerHTML={{__html: trace(d, seed)}} />;

export default function Intro({card, beats}: {card: React.ReactNode; beats: React.ReactNode[]}) {
    const sec = useRef<HTMLElement>(null), vp = useRef<HTMLDivElement>(null), words = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const el = sec.current, view = vp.current, text = words.current;
        if (!el || !view || !text) return;
        const live = matchMedia(LIVE), tiles = [...view.querySelectorAll<HTMLElement>("[data-tile]")], bs = [...text.querySelectorAll<HTMLElement>("[data-beat]")];
        let G: {pad: number; z0: number; z1: number; g0: number; g1: number; travel: number; S: Record<"hold0" | "zoom" | "pan" | "trace", number>; total: number} | null = null, raf = 0;
        const clear = () => {
            G = null; el.style.height = ""; text.style.top = ""; view.style.removeProperty("--zpx"); el.style.removeProperty("--draw"); el.style.removeProperty("--fade");
            tiles.forEach((t) => { t.style.transform = ""; t.style.width = ""; });
            bs.forEach((b, j) => b.classList.toggle(s.on, j === 0));
        };
        function update() {
            raf = 0;
            if (!G || !el) return;
            const S = G.S, y = clamp(-el.getBoundingClientRect().top, 0, G.total);
            const kz = ease(ramp(y, S.hold0, S.hold0 + S.zoom)), kp = ease(ramp(y, S.hold0 + S.zoom, S.hold0 + S.zoom + S.pan)), t0 = S.hold0 + S.zoom + S.pan;
            const kt = ramp(y, t0, t0 + S.trace * .6), kf = ramp(y, t0 + S.trace * .45, t0 + S.trace);
            const z = lerp(G.z0, G.z1, kz), gy = lerp(G.g0, G.g1, kz), ox = G.pad - UL * z - G.travel * kp;
            tiles.forEach((t, i) => { t.style.width = `${z.toFixed(1)}px`; t.style.transform = `translate(${(ox + i * 1.1 * z).toFixed(1)}px, ${(gy - z * 1.5).toFixed(1)}px)`; });
            text!.style.top = `${(gy + 30).toFixed(1)}px`; view!.style.setProperty("--zpx", `${z.toFixed(1)}px`);
            el.style.setProperty("--draw", kt.toFixed(3)); el.style.setProperty("--fade", kf.toFixed(3));
            // The words follow the camera: the listing, then the question, then the hand over.
            const b = kt > .15 ? 2 : kz > .55 ? 1 : 0;
            bs.forEach((e, j) => e.classList.toggle(s.on, j === b));
        }
        function layout() {
            if (!live.matches) { clear(); return; }
            const vw = document.documentElement.clientWidth, vh = innerHeight, room = text!.offsetHeight + 36, top = 40, n = tiles.length;
            const pad = Math.max(32, (vw - 1720) / 2);
            // Start: the wooden door and its listing as big as the height allows. End: eight doors and a bit across, the words under the row, the two centred.
            const z0 = clamp((vh - room - top - 30) / 1.5, 220, (vw - 2 * pad) / 2.2), z1 = Math.min(z0, (vw - 2 * pad) / (8.25 * 1.1));
            const g0 = top + z0 * 1.5, g1 = (vh - z1 * 1.5 - room) / 2 + z1 * 1.5 + 12;
            const travel = Math.max(0, ((n - 1) * 1.1 + 1 - UL) * z1 - (vw - 2 * pad));
            const S = {hold0: vh * .15, zoom: vh * .8, pan: travel / 1.7, trace: vh * .75};
            G = {pad, z0, z1, g0, g1, travel, S, total: S.hold0 + S.zoom + S.pan + S.trace + vh * .25};
            el!.style.height = `${vh + G.total}px`;
            update();
        }
        const scroll = () => { if (!raf) raf = requestAnimationFrame(update); };
        addEventListener("scroll", scroll, {passive: true});
        addEventListener("resize", layout);
        live.addEventListener("change", layout);
        layout();
        void document.fonts.ready.then(layout);   // the words' height sets the room the doors get
        return () => { removeEventListener("scroll", scroll); removeEventListener("resize", layout); live.removeEventListener("change", layout); cancelAnimationFrame(raf); };
    }, []);

    return (
        <section ref={sec} className={s.intro} aria-label={"One job listing, among real doors"}>
            <div className={s.ipin}>
                <div ref={vp} className={s.ivp}>
                    <figure className={cn(s.itile, s.wood)} data-tile style={{"--i": 0} as Var}>
                        <div className={s.iph}>
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img src={`${DOOR_DIR}/door-${WOOD.pid}.webp`} alt={"A wooden door standing open in an old stone wall."} width={480} height={720} />
                            <Trace d={WOOD} seed={39} />
                        </div>
                        {card}
                    </figure>
                    <div className={s.irow} role={"list"} aria-label={`Photos of ${FAMILY_DOORS.length} more doors, each with a small sign naming a job family`}>
                        {FAMILY_DOORS.map((d, k) => (
                            <figure key={d.pid} role={"listitem"} className={s.itile} data-tile style={{"--i": k + 1} as Var} aria-label={`A door photo with a sign: ${d.sign.join(" ")}`}>
                                <div className={s.iph}>
                                    {/* eslint-disable-next-line @next/next/no-img-element */}
                                    <img src={`${DOOR_DIR}/door-${d.pid}.webp`} alt={""} width={480} height={720} loading={"lazy"} decoding={"async"} />
                                    <Trace d={d} seed={40 + k} />
                                    <span className={s.isign} style={{left: `${((d.box[0] + d.box[2]) / 2 * 100).toFixed(1)}%`, bottom: `${((1 - d.box[1]) * 100 + 1.5).toFixed(1)}%`}}>
                                        {d.sign.map((ln, j) => <React.Fragment key={ln}>{j ? <br /> : null}{ln}</React.Fragment>)}
                                    </span>
                                </div>
                            </figure>
                        ))}
                    </div>
                </div>
                <div ref={words} className={s.itext}>
                    {beats.map((b, j) => <div key={j} data-beat className={cn(s.ibeat, j === 0 && s.on)}>{b}</div>)}
                </div>
                <p className={s.icap}>Door photos: Pexels, credited at the end<span className={s.swipe}> · swipe along the row</span></p>
            </div>
        </section>
    );
}
