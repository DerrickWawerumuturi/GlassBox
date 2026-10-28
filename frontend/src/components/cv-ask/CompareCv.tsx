'use client'

import React from "react";

import {PeekGlyph} from "@/components/brand/Peek";
import PhoneHandoff from "@/components/cv-ask/PhoneHandoff";
import {Button} from "@/components/ui/button";
import type {CtaPlace} from "@/lib/analytics";
import {ASK} from "@/lib/cv-ask";
import {cn} from "@/lib/utils";

/**
 * The CV action on a page that hasn't been scanned yet: one button, "Compare
 * your CV", and nothing under it (founder, 13 Oct 2026: the line under it was
 * too much text; the trust facts live in the sheet it opens). Used once per
 * page: the landing hero, a market page, the years page. While a scan runs,
 * one status line says so. White text on the orange in both themes (founder,
 * 12 Oct); landing.css lets it past the landing's `color: inherit`. The look
 * is the peek family's (founder's pick, 13 Oct, issue #6): brand/Peek.tsx.
 */
export default function CompareCv({onClick, scanning, where, className, showHandoff = true}: {onClick: () => void; scanning: boolean; where: CtaPlace; className?: string; showHandoff?: boolean}) {
    return (
        <div className={cn("flex flex-col items-center gap-2 text-center", className)}>
            <Button className={"peek peek-button cv-compare text-white"} onClick={onClick} disabled={scanning}>
                <PeekGlyph />
                {ASK.compare}
            </Button>
            {scanning ? <p className={"m-0 font-mono text-[12px] text-muted-foreground"} role={"status"}>{ASK.reading}</p>
                : showHandoff && <PhoneHandoff where={where} />}
        </div>
    );
}
