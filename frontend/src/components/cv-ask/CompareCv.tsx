'use client'

import React from "react";

import {Button} from "@/components/ui/button";
import {ASK} from "@/lib/cv-ask";
import {cn} from "@/lib/utils";

/**
 * The CV action on a page that hasn't been scanned yet (founder, 12 Oct 2026):
 * one plain button, "Compare your CV", and the three facts under it. Used once
 * per page: the landing hero, a market page, the years page. It opens the CV
 * sheet. The button keeps the design system's radius (--radius-lg, 8px), not
 * the pill (docs/decisions/design-system.md). White text on the orange in both
 * themes (founder, 12 Oct); landing.css lets it past the landing's `color: inherit`.
 */
export default function CompareCv({onClick, scanning, className}: {onClick: () => void; scanning: boolean; className?: string}) {
    return (
        <div className={cn("flex flex-col items-center gap-2 text-center", className)}>
            <Button className={"cv-compare h-11 rounded-lg px-6 text-[16px] text-white"} onClick={onClick} disabled={scanning}>{ASK.compare}</Button>
            <p className={"m-0 font-mono text-[12px] text-muted-foreground"} role={scanning ? "status" : undefined}>
                {scanning ? ASK.reading : ASK.compareSmall}
            </p>
        </div>
    );
}
