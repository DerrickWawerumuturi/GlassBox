'use client'

import React, {useEffect, useState} from "react";

import {GlassboxWordmark} from "@/components/brand/Logo";
import css from "./editorial.module.css";

/**
 * A slim bar with the page's headline once the lead visual has scrolled
 * away. Slides in, or simply appears with reduced motion. Hidden from screen
 * readers: the same heading is on the page. (Until 12 Oct 2026 it also
 * carried the sticky question ask, removed with the others.)
 */
export default function TitleBar({title}: {title: string}) {
    const [on, setOn] = useState(false);
    useEffect(() => {
        const lead = document.getElementById("lead-visual");
        if (!lead || !("IntersectionObserver" in window)) return;
        const io = new IntersectionObserver(([e]) => setOn(!e.isIntersecting && e.boundingClientRect.top < 0));
        io.observe(lead);
        return () => io.disconnect();
    }, []);
    return (
        <div aria-hidden={!on} inert={!on} data-on={on} className={`${css.bar} fixed inset-x-0 top-0 z-40 border-b border-border bg-background`}>
            <div className={"mx-auto grid h-[52px] max-w-[1120px] grid-cols-[1fr] items-center gap-4 px-4 sm:px-6 md:grid-cols-[120px_1fr_120px]"}>
                <span className={"hidden md:block"}><GlassboxWordmark className={"h-[13px] w-auto"} /></span>
                <span className={"truncate font-heading text-[15px] font-bold md:text-center"}>{title}</span>
            </div>
        </div>
    );
}
