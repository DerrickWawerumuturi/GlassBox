'use client'

import React from "react";

import CompareCv from "@/components/cv-ask/CompareCv";
import {Ask} from "@/lib/cv-ask";
import {COPY} from "./copy";

const H = COPY.hero;

/**
 * The first screen (founder, 12 Oct 2026, reversing the 5 Oct "headline
 * only" hero; docs/decisions/cv-ask.md): the week's total, the headline, one
 * subtitle and one button, "Compare your CV", with nothing under it (13 Oct).
 * The sheet it opens compares the CV with the job type on the count below.
 */
export default function Hero({total, ask, scanning, onFind}: {total: string | null; ask: Ask | null; scanning: boolean; onFind: () => void}) {
    return (
        <header className={"hero"}>
            <div className={"kick"}>{H.eyebrow(total)}</div>
            <h1>{H.title}</h1>
            <p className={"lede"}>{H.lede}</p>
            {ask && ask.skills.length > 0 && <CompareCv onClick={onFind} scanning={scanning} where={"hero"} className={"hero-cta"} />}
        </header>
    );
}
