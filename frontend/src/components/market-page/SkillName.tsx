'use client'

import React from "react";

import {cn} from "@/lib/utils";
import {useHave} from "@/components/landing/useHave";
import {normSkill} from "@/lib/landing/look";

export const HAVE = "On your CV";
export const NOT_YET = "Not on your CV yet";

/**
 * A skill's name in a figure. After the visitor's own scan it carries a mark:
 * green for a skill on their CV, a grey dashed square for one not on it yet
 * (the landing page's rule: only their own scan, useHave). Before a scan, and
 * in the server HTML, it is the name alone.
 */
export default function SkillName({k, name}: {k: string; name: string}) {
    const have = useHave();
    const mine = have ? have.has(normSkill(k)) || have.has(normSkill(name)) : null;
    return (
        <span className={"inline-flex min-w-0 items-center gap-1.5"}>
            {mine !== null && <i aria-hidden className={cn("inline-block size-2.5 shrink-0 rounded-[3px]",
                mine ? "bg-chart-have" : "border border-dashed border-chart-gap")} />}
            <span className={"truncate"}>{name}</span>
            {mine !== null && <span className={"sr-only"}>{`, ${mine ? HAVE : NOT_YET}`}</span>}
        </span>
    );
}

/** After a scan: how many of the skills in this page's figures are on the visitor's CV. */
export function ScanStatus({skills}: {skills: Array<{key: string; name: string}>}) {
    const have = useHave();
    if (!have) return null;
    const mine = skills.filter((s) => have.has(normSkill(s.key)) || have.has(normSkill(s.name))).length;
    return (
        <div role={"status"} className={"my-6 flex flex-wrap items-center gap-x-5 gap-y-1.5 rounded-lg border border-border px-4 py-3 text-[15px]"}>
            <span className={"font-medium"}>{`${mine} of the ${skills.length} skills in these charts are on your CV.`}</span>
            <span aria-hidden className={"flex gap-4 font-mono text-[12px] uppercase tracking-[0.06em] text-muted-foreground"}>
                <span className={"inline-flex items-center gap-1.5"}><i className={"inline-block size-2.5 rounded-[3px] bg-chart-have"} />{HAVE}</span>
                <span className={"inline-flex items-center gap-1.5"}><i className={"inline-block size-2.5 rounded-[3px] border border-dashed border-chart-gap"} />{NOT_YET}</span>
            </span>
        </div>
    );
}
