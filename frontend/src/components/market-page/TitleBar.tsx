'use client'

import React, {useEffect, useState} from "react";

import {GlassboxWordmark} from "@/components/brand/Logo";
import StickyAsk, {AskLine} from "@/components/cv-ask/StickyAsk";
import {useMarketSticky} from "@/components/market-page/StickyCvAsk";
import css from "./editorial.module.css";

/**
 * A slim bar with the page's question once the lead visual has scrolled
 * away, and the sticky CV line beside it while nothing else asks (on a
 * phone, the line sits at the foot of the screen instead). Slides in, or
 * simply appears with reduced motion. Hidden from screen readers: the same
 * heading and ask are on the page.
 */
export default function TitleBar({question}: {question: string}) {
    const [on, setOn] = useState(false);
    useEffect(() => {
        const lead = document.getElementById("lead-visual");
        if (!lead || !("IntersectionObserver" in window)) return;
        const io = new IntersectionObserver(([e]) => setOn(!e.isIntersecting && e.boundingClientRect.top < 0));
        io.observe(lead);
        return () => io.disconnect();
    }, []);
    const sticky = useMarketSticky(on);
    return (
        <>
            <div aria-hidden={!on} inert={!on} data-on={on} className={`${css.bar} fixed inset-x-0 top-0 z-40 border-b border-border bg-background`}>
                <div className={"mx-auto grid h-[52px] max-w-[1120px] grid-cols-[1fr] items-center gap-4 px-4 sm:px-6 md:grid-cols-[120px_1fr_auto]"}>
                    <span className={"hidden md:block"}><GlassboxWordmark className={"h-[13px] w-auto"} /></span>
                    <span className={"truncate font-heading text-[15px] font-bold md:text-center"}>{question}</span>
                    <span className={"hidden md:block"}>{sticky.show && <AskLine context={sticky.context} onFind={sticky.onFind} />}</span>
                </div>
            </div>
            <StickyAsk show={sticky.show} context={sticky.context} onFind={sticky.onFind} />
        </>
    );
}
