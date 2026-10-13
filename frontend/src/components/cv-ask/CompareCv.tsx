'use client'

import React from "react";

import {Button} from "@/components/ui/button";
import {ASK} from "@/lib/cv-ask";
import {cn} from "@/lib/utils";

import "./compare-cv.css";

/*
 * TEMPORARY (founder, 13 Oct 2026, GitHub issue #6): three looks for the
 * button, picked on localhost with ?btn=c, ?btn=d or ?btn=e; no parameter
 * keeps today's look. The first two tries (A and B, stash's big button) were
 * too big, so these are smaller and cosier, each with one small moment drawn
 * from the brand mark. Once he picks, the chosen look becomes the only one and
 * this switch goes. Read after mount, so the server render and the static
 * pages never depend on the address.
 */
type Look = "now" | "c" | "d" | "e";
function useLook(): Look {
    const [look, setLook] = React.useState<Look>("now");
    React.useEffect(() => {
        const btn = new URLSearchParams(window.location.search).get("btn");
        if (btn === "c" || btn === "d" || btn === "e") setLook(btn);
    }, []);
    return look;
}

/** C: the wordmark's box O, drawn in white. The dot inside it peeks over the rim on hover. */
function BoxPeek() {
    return (
        <svg className={"cv-glyph"} viewBox={"0 0 20 20"} aria-hidden>
            <circle className={"cv-peek-dot"} cx={10} cy={10} r={2.75} fill={"currentColor"} />
            <rect x={2} y={2} width={16} height={16} rx={4.5} fill={"none"} stroke={"currentColor"} strokeWidth={2} />
        </svg>
    );
}

/** D: a small CV page above an open box. On hover the page slides into the box, and stays in view: it's glass. */
function PageIntoBox() {
    return (
        <svg className={"cv-glyph"} viewBox={"0 0 22 22"} aria-hidden>
            <g className={"cv-page"}>
                <rect x={7} y={1} width={8} height={11} rx={1.2} fill={"currentColor"} />
                <path d={"M9 4.5h4M9 7h4M9 9.5h2.5"} stroke={"var(--primary)"} strokeWidth={1} strokeLinecap={"round"} />
            </g>
            <path d={"M3 9v7a3 3 0 0 0 3 3h10a3 3 0 0 0 3-3V9"} fill={"none"} stroke={"currentColor"} strokeWidth={2} strokeLinecap={"round"} />
        </svg>
    );
}

/** E: no glyph. A handwritten note appears beside the button on hover, the one true fact about the wait. */
function MinuteNote() {
    return (
        <span className={"cv-note"} aria-hidden>
            <svg viewBox={"0 0 26 14"} width={26} height={14}>
                <path d={"M25 3C19 2 11 4 3 9M7 11l-4-2 1-4.5"} fill={"none"} stroke={"currentColor"} strokeWidth={1.6} strokeLinecap={"round"} strokeLinejoin={"round"} />
            </svg>
            about a minute
        </span>
    );
}

/**
 * The CV action on a page that hasn't been scanned yet: one button, "Compare
 * your CV", and nothing under it (founder, 13 Oct 2026: the line under it was
 * too much text; the trust facts live in the sheet it opens). Used once per
 * page: the landing hero, a market page, the years page. While a scan runs,
 * one status line says so. White text on the orange in both themes (founder,
 * 12 Oct); landing.css lets it past the landing's `color: inherit`.
 */
export default function CompareCv({onClick, scanning, className}: {onClick: () => void; scanning: boolean; className?: string}) {
    const look = useLook();
    return (
        <div className={cn("flex flex-col items-center gap-2 text-center", className)}>
            <Button className={cn("cv-compare text-white", look === "now" ? "h-11 rounded-lg px-6 text-[16px]" : `cv-cosy cv-look-${look}`)}
                    onClick={onClick} disabled={scanning}>
                {look === "c" && <BoxPeek />}
                {ASK.compare}
                {look === "d" && <PageIntoBox />}
                {look === "e" && <MinuteNote />}
            </Button>
            {scanning && <p className={"m-0 font-mono text-[12px] text-muted-foreground"} role={"status"}>{ASK.reading}</p>}
        </div>
    );
}
