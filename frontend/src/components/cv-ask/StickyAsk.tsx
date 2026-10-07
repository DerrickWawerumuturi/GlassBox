'use client'

import React, {useEffect, useState} from "react";

import {Button} from "@/components/ui/button";
import {ASK, stickyLine, StickyContext} from "@/lib/cv-ask";
import {cn} from "@/lib/utils";

/**
 * Whether any of the page's own asks (`data-cv-ask`) is on screen, so the
 * sticky line can step aside: one ask on screen at a time. `key` re-reads the
 * page when asks mount later (the landing page's, once today's count is in).
 */
export function useAskInView(key?: unknown): boolean {
    const [inView, setInView] = useState(false);
    useEffect(() => {
        if (!("IntersectionObserver" in window)) return;
        const seen = new Set<Element>();
        const io = new IntersectionObserver((entries) => {
            entries.forEach((e) => (e.isIntersecting ? seen.add(e.target) : seen.delete(e.target)));
            setInView(seen.size > 0);
        });
        document.querySelectorAll("[data-cv-ask]").forEach((el) => io.observe(el));
        return () => io.disconnect();
    }, [key]);
    return inView;
}

/** "? of 15 skills here on your CV" and the button: one slim line. */
export function AskLine({context, onFind, className}: {context: StickyContext; onFind: () => void; className?: string}) {
    const [lead, rest] = stickyLine(context);
    return (
        <span className={cn("flex min-w-0 items-center gap-3", className)}>
            <span className={"min-w-0 font-heading text-[14px] leading-[1.25] font-semibold"}>
                <b className={"font-bold"}>{lead}</b> {rest}
            </span>
            <Button className={"h-8 shrink-0 rounded-full px-3.5 text-[14px]"} onClick={onFind}>{ASK.cta}</Button>
        </span>
    );
}

/**
 * The sticky line at the foot of a phone screen, hidden until `show`. Wider
 * screens draw the line in their own bar (the market title bar, the landing
 * page's pill), so this one is for phones only.
 */
export default function StickyAsk({show, context, onFind}: {show: boolean; context: StickyContext; onFind: () => void}) {
    return (
        <div role={"complementary"} aria-label={ASK.cta} inert={!show} data-on={show}
             className={cn("fixed inset-x-0 bottom-0 z-40 border-t border-border bg-background/95 px-4 pt-2.5 pb-[calc(12px+env(safe-area-inset-bottom))] backdrop-blur md:hidden",
                 "transition-[transform,opacity] duration-300 motion-reduce:transition-none data-[on=false]:pointer-events-none data-[on=false]:translate-y-full data-[on=false]:opacity-0")}>
            <AskLine context={context} onFind={onFind} className={"justify-between"} />
            <small className={"mt-0.5 block font-mono text-[12px] text-muted-foreground"}>{ASK.small}</small>
        </div>
    );
}
