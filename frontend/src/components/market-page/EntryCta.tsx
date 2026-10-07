'use client'

import React from "react";
import Link from "next/link";

import AddCvButton from "@/components/AddCvButton";
import {Button} from "@/components/ui/button";
import {useHave} from "@/components/landing/useHave";
import {ENTRY_COPY as C, ENTRY_NAME} from "@/lib/market-page";

/**
 * The page's one ask: the same CV dialog and scan as everywhere else
 * (AddCvButton), carrying this page's name into the click and the scan. The
 * visitor stays here and the skills table lights up; their full results are a
 * link away.
 */
export default function EntryCta({line}: {line: string}) {
    const have = useHave();
    return (
        <section aria-labelledby={"cta-h"} className={"flex flex-col gap-3 rounded-xl border border-border bg-card/60 p-5 sm:p-6"}>
            <h2 id={"cta-h"} className={"font-heading text-xl font-bold uppercase tracking-tight sm:text-2xl"}>{C.ctaTitle}</h2>
            <div className={"flex flex-wrap items-center gap-x-5 gap-y-2"}>
                <AddCvButton label={C.cta} reading={C.reading} page={ENTRY_NAME} />
                {have && <Button variant={"link"} className={"px-0 text-foreground"} nativeButton={false} render={<Link href={"/analysis"} />}>{C.results}</Button>}
            </div>
            <p className={"text-[14px] text-muted-foreground"}>{line}</p>
        </section>
    );
}
