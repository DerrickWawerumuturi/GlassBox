'use client'

import {useCallback, useEffect, useRef, useState} from "react";

/*
 * The rotation engine behind the Market charts dial (and the navigation
 * lab's other concepts, /experiments/market-navigation). `pos` is a
 * continuous index: 2.4 means between the third and fourth section. Drag
 * moves it directly, release throws it with the drag's velocity and snaps to
 * the nearest section, and wheel, keys and clicks set a target it eases to
 * without overshoot. With reduced motion every change is a jump.
 *
 * The selection is committed when a target is set (release, wheel step, key,
 * click), never mid-drag, so the chart does not flicker while you turn.
 */

export type DragMode =
    | {kind: "angle"; cx: number; cy: number; step: number}      // rotate around a centre; step in radians
    | {kind: "linear"; axis: "x" | "y"; px: number};             // px per section along one axis

const WHEEL_STEP = 50;      // accumulated wheel delta for one section (one mouse notch is ~100)
const WHEEL_LOCK_MS = 160;  // ignore the rest of a trackpad flick right after a step
const DRAG_SLOP = 5;
const EASE_MS = 70;         // time constant of the ease: about 95% of the way in 210 ms        // px before a press becomes a drag (below it, it's a click)

export function reducedMotion(): boolean {
    return typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

export function useRotor(count: number, index: number, onSelect: (i: number) => void, wrap: boolean) {
    const [pos, setPos] = useState(index);
    const posRef = useRef(index), target = useRef(index), vel = useRef(0), raf = useRef(0);
    const [dragging, setDragging] = useState(false);
    // The last section this rotor committed, and the latest onSelect. Keeping both in refs
    // keeps goTo/step stable across renders, so the follow effect below never re-fires
    // just because a parent re-rendered with a new callback.
    const committed = useRef(index), onSelectRef = useRef(onSelect);
    onSelectRef.current = onSelect;

    const norm = useCallback((i: number) => wrap ? ((Math.round(i) % count) + count) % count
        : Math.min(count - 1, Math.max(0, Math.round(i))), [count, wrap]);

    const animate = useCallback(() => {
        cancelAnimationFrame(raf.current);
        if (reducedMotion()) { posRef.current = target.current; setPos(target.current); return; }
        // Ease out toward the target, frame-rate independent and without overshoot:
        // the needle glides and settles instead of bouncing (founder's review, 2026-10-02).
        let last = performance.now();
        const tick = (now: number) => {
            const d = target.current - posRef.current;
            if (Math.abs(d) < 0.002) { posRef.current = target.current; setPos(target.current); return; }
            // rAF's timestamp is the frame's start, which can precede `last` right after a
            // retarget; a negative step would twitch the needle backwards.
            posRef.current += d * (1 - Math.exp(-Math.max(0, now - last) / EASE_MS));
            last = now;
            setPos(posRef.current);
            raf.current = requestAnimationFrame(tick);
        };
        raf.current = requestAnimationFrame(tick);
    }, []);

    const commit = useCallback((t: number) => {
        committed.current = norm(t);
        onSelectRef.current(committed.current);
    }, [norm]);

    /** Aim at section i by the shortest way round, and commit it. */
    const goTo = useCallback((i: number) => {
        const cur = posRef.current;
        let t = wrap ? cur + ((((i - cur) % count) + count + count / 2) % count) - count / 2 : i;
        if (!wrap) t = Math.min(count - 1, Math.max(0, t));
        target.current = Math.round(t);
        commit(target.current);
        animate();
    }, [animate, commit, count, wrap]);

    const step = useCallback((by: number) => {
        let t = target.current + by;
        if (!wrap) t = Math.min(count - 1, Math.max(0, t));
        target.current = t;
        commit(t);
        animate();
    }, [animate, commit, count, wrap]);

    // Follow selections made elsewhere (a URL change, the speed test's reset). Only a
    // genuinely new index moves the needle, and it is not echoed back through onSelect:
    // echoing it raced the URL and swung the needle back on every click (2026-10-02).
    useEffect(() => {
        if (index === committed.current) return;
        committed.current = index;
        const cur = posRef.current;
        target.current = wrap ? cur + ((((index - cur) % count) + count + count / 2) % count) - count / 2 : index;
        animate();
    }, [index, animate, count, wrap]);

    /** Point at section i without committing it (the needle dial's aim, while the pointer is down). */
    const aimAt = useCallback((i: number) => {
        target.current = Math.min(count - 1, Math.max(0, i));
        animate();
    }, [animate, count]);

        /** A one-off turn and return, so a first-time user sees that it rotates. */
    const nudge = useCallback(() => {
        if (reducedMotion()) return;
        const home = target.current;
        target.current = home + (wrap || home < count - 1 ? 0.35 : -0.35);
        animate();
        setTimeout(() => { target.current = home; animate(); }, 380);
    }, [animate, count, wrap]);

    const wheelAcc = useRef(0), wheelLock = useRef(0);
    const bindWheel = useCallback((el: HTMLElement | null) => {
        if (!el) return;
        const onWheel = (e: WheelEvent) => {
            e.preventDefault();
            const now = performance.now();
            if (now < wheelLock.current) return;
            wheelAcc.current += Math.abs(e.deltaY) >= Math.abs(e.deltaX) ? e.deltaY : e.deltaX;
            if (Math.abs(wheelAcc.current) >= WHEEL_STEP) {
                step(Math.sign(wheelAcc.current));
                wheelAcc.current = 0;
                wheelLock.current = now + WHEEL_LOCK_MS;
            }
        };
        el.addEventListener("wheel", onWheel, {passive: false});
        return () => el.removeEventListener("wheel", onWheel);
    }, [step]);

    const drag = useRef<{x: number; y: number; a: number; p: number; t: number; live: boolean; v: number; id: number} | null>(null);
    const pointerHandlers = (mode: DragMode) => {
        const angleAt = (e: React.PointerEvent, el: Element) => {
            const r = el.getBoundingClientRect();
            return mode.kind === "angle" ? Math.atan2(e.clientY - r.top - mode.cy, e.clientX - r.left - mode.cx) : 0;
        };
        return {
            onPointerDown: (e: React.PointerEvent) => {
                if (e.button !== 0) return;
                cancelAnimationFrame(raf.current);
                drag.current = {x: e.clientX, y: e.clientY, a: angleAt(e, e.currentTarget), p: posRef.current,
                    t: performance.now(), live: false, v: 0, id: e.pointerId};
            },
            onPointerMove: (e: React.PointerEvent) => {
                const d = drag.current;
                if (!d) return;
                if (!d.live) {
                    if (Math.hypot(e.clientX - d.x, e.clientY - d.y) < DRAG_SLOP) return;
                    d.live = true; setDragging(true);
                    // Capture only once it is a drag, so a plain click still reaches the label under it.
                    e.currentTarget.setPointerCapture(d.id);
                }
                let next: number;
                if (mode.kind === "angle") {
                    let da = angleAt(e, e.currentTarget) - d.a;
                    if (da > Math.PI) da -= 2 * Math.PI;
                    if (da < -Math.PI) da += 2 * Math.PI;
                    next = d.p - da / mode.step;
                } else {
                    next = d.p - (mode.axis === "y" ? e.clientY - d.y : e.clientX - d.x) / mode.px;
                }
                if (!wrap) next = Math.min(count - 0.6, Math.max(-0.4, next));
                const now = performance.now();
                d.v = 0.6 * d.v + 0.4 * ((next - posRef.current) / Math.max(1, now - d.t)) * 16;
                d.t = now;
                posRef.current = next; setPos(next);
                if (mode.kind === "angle") { d.a = angleAt(e, e.currentTarget); d.p = next; }
            },
            onPointerUp: () => {
                const d = drag.current;
                drag.current = null;
                if (!d?.live) return;
                setDragging(false);
                // A little momentum: a flick carries on about six frames' worth.
                let t = Math.round(posRef.current + d.v * 6);
                if (!wrap) t = Math.min(count - 1, Math.max(0, t));
                target.current = t; vel.current = 0;
                commit(t);
                animate();
            },
            onPointerCancel: () => { drag.current = null; setDragging(false); goTo(norm(posRef.current)); },
        };
    };

    const onKeyDown = (e: React.KeyboardEvent) => {
        const k = e.key;
        if (k === "ArrowDown" || k === "ArrowRight") step(1);
        else if (k === "ArrowUp" || k === "ArrowLeft") step(-1);
        else if (k === "Home") goTo(0);
        else if (k === "End") goTo(count - 1);
        else if (/^[1-9]$/.test(k) && Number(k) <= count) goTo(Number(k) - 1);
        else return;
        e.preventDefault();
    };

    /** Signed distance of section i from the active position, in sections (wrapped when the ring wraps). */
    const offset = (i: number) => {
        let o = i - pos;
        if (wrap) o = ((((o % count) + count + count / 2) % count) - count / 2);
        return o;
    };

    useEffect(() => () => cancelAnimationFrame(raf.current), []);
    return {pos, offset, goTo, aimAt, committed: () => committed.current, step, nudge, bindWheel, pointerHandlers, onKeyDown, dragging};
}
