'use client'

import {useEffect} from "react";

/**
 * One listener for every `.spotlight` card (globals.css): it moves the card's
 * soft light to the mouse. Mouse only; touch has nothing to follow.
 */
export default function SpotlightWatcher() {
    useEffect(() => {
        const move = (e: PointerEvent) => {
            if (e.pointerType !== "mouse") return;
            const el = (e.target as Element | null)?.closest?.(".spotlight") as HTMLElement | null;
            if (!el) return;
            const r = el.getBoundingClientRect();
            el.style.setProperty("--mx", `${e.clientX - r.left}px`);
            el.style.setProperty("--my", `${e.clientY - r.top}px`);
        };
        document.addEventListener("pointermove", move, {passive: true});
        return () => document.removeEventListener("pointermove", move);
    }, []);
    return null;
}
