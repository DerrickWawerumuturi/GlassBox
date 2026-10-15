'use client'

import {useEffect} from "react";

/**
 * "how we count" under a figure points at the story's own "How we counted"
 * (#method), a fold: open it on the way there, and on a visit that arrives
 * with that address. Renders nothing.
 */
export default function OpenMethod({id = "method"}: {id?: string}) {
    useEffect(() => {
        const open = () => { const el = document.getElementById(id); if (el instanceof HTMLDetailsElement) el.open = true; };
        if (location.hash === `#${id}`) open();
        const click = (e: MouseEvent) => { if ((e.target as Element | null)?.closest?.(`a[href="#${id}"]`)) open(); };
        document.addEventListener("click", click);
        return () => document.removeEventListener("click", click);
    }, [id]);
    return null;
}
