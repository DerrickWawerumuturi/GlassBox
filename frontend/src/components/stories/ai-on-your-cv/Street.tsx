'use client'

import React, {useEffect, useRef, useState} from "react";

import {cn} from "@/lib/utils";
import s from "./aic.module.css";
import {overlay} from "./people";
import {Stage, stage} from "./stage";
import {CardAt, makeLayout} from "./states";

/*
 * Steps 2 to 7: one drawing, changed by each step's words (the prototype's
 * story.js). Wide: one sticky frame beside the steps, each step that crosses
 * the middle of the screen changing it (tweened when it is the next or the
 * last step, else at once), the step's listing pinned on its door and its
 * photo head characters over the canvas. Phone: no stepper; under each step's
 * words its listing, then its own frame, the final picture. The server renders
 * both, with the words, the listings and each step's hidden description; CSS
 * shows one; the canvases are drawn once the fonts are in. The overlays' places
 * come from the same pure layout the canvas draws, so the server places them.
 */

export type Step = {k: number; body: React.ReactNode; card?: React.ReactNode};
const PHONE = "(max-width: 760px)";
type Var = React.CSSProperties & Record<`--${string}`, string | number>;

const WIDE = makeLayout(false), SMALL = makeLayout(true), seen = new Map<string, {H: number; anchors: ReturnType<typeof WIDE.state>["anchors"]}>();
/** A state's height and overlay anchors, worked out once per step and screen. */
const at = (ly: typeof WIDE, k: number) => {
    const key = `${ly === WIDE}|${k}`;
    if (!seen.has(key)) { const st = ly.state(k); seen.set(key, {H: st.H, anchors: st.anchors}); }
    return seen.get(key)!;
};
const pctOf = (v: number, of: number) => `${(v / of * 100).toFixed(2)}%`;
/** A listing pinned in the wide frame, in per cents of the stage so it scales with it. */
const cardStyle = (c: CardAt, H: number): Var => ({left: pctOf(c.x, WIDE.W), top: pctOf(c.y, H), width: pctOf(c.w, WIDE.W), "--tilt": `${c.rot}deg`, "--card-fs": `${c.fs}cqw`});

/** Whether the screen is a phone's: null on the server and before the first look. */
function usePhone() {
    const [ph, setPh] = useState<boolean | null>(null);
    useEffect(() => {
        const mq = matchMedia(PHONE), pick = () => setPh(mq.matches);
        pick(); mq.addEventListener("change", pick);
        return () => mq.removeEventListener("change", pick);
    }, []);
    return ph;
}

export default function Street({steps, src}: {steps: Step[]; src: React.ReactNode}) {
    const ph = usePhone();
    const [active, setActive] = useState(steps[0].k);
    const wide = useRef<HTMLCanvasElement>(null), small = useRef<Record<number, HTMLCanvasElement | null>>({});
    const root = useRef<HTMLElement>(null), els = useRef<Record<number, HTMLElement | null>>({}), main = useRef<Stage | null>(null), shown = useRef(active);

    useEffect(() => {
        if (ph === null || !root.current) return;
        let live = true;
        const made: Stage[] = [];
        // The story's faces are set where its route's font classes are, so they are read from the section, not <html>.
        const css = getComputedStyle(root.current), face = (v: string) => css.getPropertyValue(v).trim();
        const faces = [`600 16px ${face("--essay")}`, `400 16px ${face("--neon")}`, `500 21px ${face("--hand")}`, `500 12px ${face("--mono")}`];
        // Canvas text needs the faces loaded first; a face that fails still draws, in the fallback.
        void Promise.all(faces.map((f) => document.fonts.load(f).catch(() => null))).then(() => {
            if (!live) return;
            if (ph) {
                for (const {k} of steps) { const cv = small.current[k]; if (cv) { const st = stage(cv, true); st.set(k, false); made.push(st); } }
            } else if (wide.current) {
                const st = stage(wide.current, false); st.set(shown.current, false); made.push(st); main.current = st;
            }
        });
        const redraw = () => made.forEach((st) => st.redraw());
        // The site's theme is a class on <html>: its colours are read again on a change.
        const theme = new MutationObserver(redraw);
        theme.observe(document.documentElement, {attributes: true, attributeFilter: ["class"]});
        let timer: ReturnType<typeof setTimeout> | undefined;
        const resize = () => { clearTimeout(timer); timer = setTimeout(redraw, 120); };
        addEventListener("resize", resize);
        return () => { live = false; theme.disconnect(); removeEventListener("resize", resize); clearTimeout(timer); made.forEach((st) => st.stop()); main.current = null; };
    }, [ph, steps]);

    useEffect(() => {
        if (ph !== false) return;
        const io = new IntersectionObserver((es) => es.forEach((e) => { if (e.isIntersecting) setActive(Number((e.target as HTMLElement).dataset.step)); }),
            {rootMargin: "-45% 0px -45% 0px", threshold: 0});
        Object.values(els.current).forEach((el) => el && io.observe(el));
        return () => io.disconnect();
    }, [ph]);

    useEffect(() => {
        const st = main.current, was = shown.current;
        shown.current = active;
        if (st && was !== active) st.set(active, Math.abs(active - was) === 1);
    }, [active]);

    return (
        <section ref={root} className={s.scrolly}>
            <div className={s.steps}>
                {steps.map(({k, body, card}) => {
                    const {H, anchors} = at(SMALL, k), chars = overlay(anchors, SMALL.W, H);
                    return (
                        <article key={k} id={`aic-step-${k}`} data-step={k} className={cn(s.step, active === k && s.on)} ref={(el) => { els.current[k] = el; }}>
                            {body}
                            {card && <div className={s.pcard}>{card}</div>}
                            <div className={cn(s.frame, s.pframe)} style={{aspectRatio: `${SMALL.W} / ${H}`}}>
                                <canvas ref={(el) => { small.current[k] = el; }} aria-hidden />
                                {chars && <div className={cn(s.ov, s.chars, s.show)} aria-hidden dangerouslySetInnerHTML={{__html: chars}} />}
                            </div>
                            <div className={s.psrc}>{src}</div>
                        </article>
                    );
                })}
            </div>
            <div className={s.stage}>
                <div className={s.frame}>
                    <canvas ref={wide} aria-hidden />
                    {steps.map(({k, card}) => {
                        const {H, anchors} = at(WIDE, k), chars = overlay(anchors, WIDE.W, H), on = ph === false && active === k;
                        return (
                            <React.Fragment key={k}>
                                {card && anchors?.card && <div className={cn(s.ov, s.cardAt, on && s.show)} style={cardStyle(anchors.card, H)} aria-hidden={!on}>{card}</div>}
                                {chars && <div className={cn(s.ov, s.chars, on && s.show)} aria-hidden dangerouslySetInnerHTML={{__html: chars}} />}
                            </React.Fragment>
                        );
                    })}
                </div>
                <div className={s.stageSrc}>{src}</div>
            </div>
        </section>
    );
}
