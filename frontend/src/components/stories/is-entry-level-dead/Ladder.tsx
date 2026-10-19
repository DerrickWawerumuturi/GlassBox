'use client'

import React, {useEffect, useRef, useState} from "react";

import {cn} from "@/lib/utils";
import s from "./eld.module.css";
import {overlay} from "./people";
import {Stage, stage} from "./stage";

/*
 * Steps 2 to 8: one drawing, changed by each step's words. Wide: one sticky
 * frame beside the steps, each step that crosses the middle of the screen
 * changing it (tweened when it is the next or the last step, else at once).
 * Phone: no stepper; under each step's words its own frame, the final
 * picture, one drawn person to 25 jobs (the "10" in step 2 says "25").
 * The server renders both, with the words and each step's hidden
 * description; CSS shows one; the canvases are drawn once fonts are in.
 */

export type Step = {k: number; body: React.ReactNode; src: React.ReactNode};
const PHONE = "(max-width: 760px)";

/** The wide frame's characters and slips, one layer per step that has them, shown on that step. */
function Overlays({active}: {active: number}) {
    return [3, 5].map((k) => (
        <div key={k} className={cn(s.ov, s.chars, active === k && s.show)} data-step={k} aria-hidden dangerouslySetInnerHTML={{__html: overlay(k, false)!}} />
    ));
}

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

export default function Ladder({steps, card}: {steps: Step[]; card: React.ReactNode}) {
    const ph = usePhone();
    const [active, setActive] = useState(steps[0].k);
    const wide = useRef<HTMLCanvasElement>(null), small = useRef<Record<number, HTMLCanvasElement | null>>({});
    const root = useRef<HTMLElement>(null), els = useRef<Record<number, HTMLElement | null>>({}), main = useRef<Stage | null>(null), shown = useRef(active);

    useEffect(() => {
        if (ph === null || !root.current) return;
        let live = true;
        const made: Stage[] = [];
        // The story's faces are set where its route's font classes are, so they are read from the section, not <html>.
        const css = getComputedStyle(root.current), essay = css.getPropertyValue("--essay").trim(), hand = css.getPropertyValue("--hand").trim();
        const faces = [`600 16px ${essay}`, `700 28px ${essay}`, `500 21px ${hand}`];
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

    const src = steps.find((st) => st.k === active)?.src;
    return (
        <section ref={root} className={s.scrolly}>
            <div className={s.steps}>
                {steps.map(({k, body, src}) => (
                    <article key={k} id={`eld-step-${k}`} data-step={k} className={cn(s.step, active === k && s.on)} ref={(el) => { els.current[k] = el; }}>
                        {body}
                        <div className={cn(s.frame, s.pframe)}>
                            <canvas ref={(el) => { small.current[k] = el; }} aria-hidden />
                            {overlay(k, true) && <div className={cn(s.ov, s.chars, s.show)} aria-hidden dangerouslySetInnerHTML={{__html: overlay(k, true)!}} />}
                            {k === 7 && <div className={cn(s.ov, s.linkcard, s.show)}>{card}</div>}
                        </div>
                        <div className={s.psrc}>{src}</div>
                    </article>
                ))}
            </div>
            <div className={s.stage}>
                <div className={s.frame}>
                    <canvas ref={wide} aria-hidden />
                    <Overlays active={ph === false ? active : -1} />
                    <div className={cn(s.ov, s.linkcard, active === 7 && s.show)}>{card}</div>
                </div>
                <div className={s.stageSrc}>{src}</div>
            </div>
        </section>
    );
}
