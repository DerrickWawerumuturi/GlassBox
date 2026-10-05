import React from 'react'
import {cn} from "@/lib/utils";

interface MarketCardInfo {
    label: string,
    value: string | number,
    hint?: string,
    /** Marks the headline metric with a hairline on top. */
    accent?: boolean,
    className?: string,
}

const MarketCard = ({label, value, hint, accent, className}: MarketCardInfo) => {
    return (
        <div
            className={cn(
                "relative flex min-w-0 flex-col justify-between gap-4 overflow-hidden rounded-xl border border-border bg-card px-4 py-4",
                className
            )}
        >
            {/* Top hairline: neutral. Orange acts, so it never marks a number. */}
            <span
                aria-hidden
                className={"absolute inset-x-0 top-0 h-0.5"}
                style={{
                    background: accent
                        ? "var(--tile-accent, var(--border))"
                        : "var(--tile-accent, transparent)"
                }}
            />
            <h3 className={"truncate font-mono text-[10px] font-medium uppercase tracking-[0.16em] text-muted-foreground"}>
                {label}
            </h3>
            <div className={"flex min-w-0 flex-col gap-1"}>
                <p
                    className={cn(
                        "truncate font-mono text-2xl leading-none font-bold tracking-tight tabular-nums xl:text-3xl",
                        accent && "text-foreground"
                    )}
                    title={typeof value === "string" ? value : undefined}
                >
                    {value}
                </p>
                {hint && (
                    <p
                        className={"truncate font-mono text-[10px] uppercase tracking-[0.08em] text-muted-foreground"}
                        title={hint}
                    >
                        {hint}
                    </p>
                )}
            </div>
        </div>
    )
}
export default MarketCard
