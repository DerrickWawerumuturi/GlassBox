import React from "react";

import {cn} from "@/lib/utils";

/**
 * A skill in the CV ask. On your CV: green, solid. Not on it yet, or not
 * known yet: grey and dashed, never red (strengths first).
 */
export default function Chip({name, have}: {name: string; have: boolean}) {
    return (
        <span className={cn("rounded-full px-[9px] py-1 font-mono text-[12px] leading-none font-medium",
            have ? "border border-chart-have/55 bg-chart-have/12 text-[var(--chart-have-ink)]" : "border border-dashed border-chart-gap text-muted-foreground")}>
            {name}
            {have && <span className={"sr-only"}>, on your CV</span>}
        </span>
    );
}
