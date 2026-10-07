'use client'

import React from "react";

import AddCvButton from "@/components/AddCvButton";
import {MarketPage} from "@/lib/analytics";

/**
 * "See where you stand": the page's one ask, at the end. It only wires the
 * existing CV flow (AddCvButton: the same dialog and scan, the page's name on
 * the click and the scan); the visitor stays and the figures above mark their
 * skills. Its look is a placeholder: the CV ask redesign replaces the inside.
 */
export default function MarketCvAsk({page, thin}: {page: MarketPage; thin?: boolean}) {
    return (
        <section id={"cv"} aria-labelledby={"cv-h"}
                 className={"mt-20 grid scroll-mt-[70px] items-center gap-[18px] rounded-[14px] bg-foreground p-7 text-background sm:mt-28 md:grid-cols-[1fr_auto]"}>
            <div>
                <h2 id={"cv-h"} className={"m-0 mb-1.5 font-heading text-[25px] font-bold leading-[1.15] tracking-[-0.015em] sm:text-[30px]"}>See where you stand</h2>
                <p className={"m-0 font-read text-[16px] text-background/80"}>
                    {thin ? "Add your CV and see which skills today's jobs name are already on it." : "Add your CV and the charts above mark which of these skills are already on it."}
                </p>
                <p className={"mt-2.5 mb-0 font-mono text-[12px] text-background/70"}>About a minute. No account needed.</p>
            </div>
            <div className={"flex flex-wrap items-center gap-3"}>
                <AddCvButton label={"Add your CV"} reading={"Reading your CV…"} page={page} />
            </div>
        </section>
    );
}
