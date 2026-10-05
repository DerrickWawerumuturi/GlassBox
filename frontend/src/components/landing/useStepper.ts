'use client'

import {useCallback, useEffect, useRef, useState} from "react";

/*
 * The shared timer behind today's count: every 4.6s it steps the level, and
 * after the third level the job type. It pauses while the pointer or focus is
 * inside the count or the glass, while a pasted ad is showing, while a scan is
 * reading, and when the tab is hidden. Reduced motion means no auto steps.
 * Progress (0 to 1) reaches the ring and bars through subscribers, not state,
 * so the page doesn't re-render sixty times a second.
 */

export const TICK_MS = 4600;

export function useReducedMotion(): boolean {
    const [reduce, setReduce] = useState(false);
    useEffect(() => {
        const media = matchMedia("(prefers-reduced-motion: reduce)");
        const read = () => setReduce(media.matches);
        read();
        media.addEventListener("change", read);
        return () => media.removeEventListener("change", read);
    }, []);
    return reduce;
}

export function useStepper({steps, held, reduce}: {steps: number; held: boolean; reduce: boolean}) {
    const [step, setStep] = useState(0);
    const [playing, setPlaying] = useState(true);
    const elapsed = useRef(0);
    const listeners = useRef(new Set<(p: number) => void>());
    const live = playing && !held && !reduce;

    const jump = useCallback((to: number) => { elapsed.current = 0; setStep(((to % steps) + steps) % steps); }, [steps]);

    useEffect(() => {
        if (reduce) return;
        let last = performance.now(), raf = 0;
        const loop = (t: number) => {
            const dt = Math.min(100, t - last);
            last = t;
            if (live && !document.hidden) {
                elapsed.current += dt;
                if (elapsed.current >= TICK_MS) { elapsed.current = 0; setStep((s) => (s + 1) % steps); }
            }
            const p = Math.min(1, elapsed.current / TICK_MS);
            listeners.current.forEach((fn) => fn(p));
            raf = requestAnimationFrame(loop);
        };
        raf = requestAnimationFrame(loop);
        return () => cancelAnimationFrame(raf);
    }, [live, reduce, steps]);

    const subscribe = useCallback((fn: (p: number) => void) => {
        listeners.current.add(fn);
        return () => { listeners.current.delete(fn); };
    }, []);

    return {step, jump, playing, setPlaying, subscribe};
}
