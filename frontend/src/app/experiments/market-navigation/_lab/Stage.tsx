import React from "react";

import {Section, SECTIONS} from "./sections";

/* The chart for the active view. Plain on purpose: the experiment judges the navigation. */
export default function Stage({section}: {section: Section}) {
    return (
        <div id={"lab-stage"} role={"tabpanel"} aria-labelledby={`tab-${section.id}`}
             className={"flex min-h-[320px] min-w-0 flex-1 flex-col rounded-2xl border border-border bg-card p-5 sm:p-8"}>
            <p className={"font-mono text-[12px] uppercase tracking-[0.12em] text-muted-foreground"}>
                {SECTIONS.indexOf(section) + 1} / {SECTIONS.length} · sample data
            </p>
            <h2 className={"mt-1 font-heading text-[28px] font-semibold leading-tight"}>{section.name}</h2>
            <p className={"text-[14px] text-muted-foreground"}>{section.question}</p>
            <div className={"mt-6 flex-1"}>
                {section.kind === "tiles" && <Tiles s={section} />}
                {(section.kind === "bars" || section.kind === "bands") && <Bars s={section} />}
                {section.kind === "line" && <Line s={section} />}
            </div>
        </div>
    );
}

function Tiles({s}: {s: Section}) {
    return (
        <div className={"grid gap-3 sm:grid-cols-3"}>
            {s.bars.map((b) => (
                <div key={b.label} className={"rounded-xl border border-border p-4"}>
                    <div className={"font-heading text-[40px] font-semibold leading-none"}>{b.value}</div>
                    <div className={"mt-2 text-[14px] text-muted-foreground"}>{b.label}</div>
                </div>
            ))}
        </div>
    );
}

function Bars({s}: {s: Section}) {
    return (
        <ul className={"flex flex-col gap-3"}>
            {s.bars.map((b) => (
                <li key={b.label} className={"grid grid-cols-[96px_1fr_auto] items-center gap-3 text-[14px] sm:grid-cols-[120px_1fr_auto]"}>
                    <span className={"truncate"}>{b.label}</span>
                    <span className={"h-3 rounded-full bg-foreground/10"}>
                        <span className={"block h-3 rounded-full bg-foreground/70"} style={{width: `${b.value}%`}} />
                    </span>
                    <span className={"font-mono text-[12px] text-muted-foreground"}>{b.note ?? `${b.value}%`}</span>
                </li>
            ))}
        </ul>
    );
}

function Line({s}: {s: Section}) {
    const max = Math.max(...s.bars.map((b) => b.value)), min = Math.min(...s.bars.map((b) => b.value)) - 5;
    const pts = s.bars.map((b, i) => `${(i / (s.bars.length - 1)) * 100},${40 - ((b.value - min) / (max - min)) * 36}`).join(" ");
    return (
        <div>
            <svg viewBox={"0 0 100 42"} preserveAspectRatio={"none"} className={"h-40 w-full"} aria-hidden>
                <polyline points={pts} fill={"none"} stroke={"var(--foreground)"} strokeWidth={1.5} vectorEffect={"non-scaling-stroke"} />
            </svg>
            <div className={"mt-1 flex justify-between font-mono text-[12px] text-muted-foreground"}>
                {s.bars.map((b) => <span key={b.label}>{b.label}</span>)}
            </div>
        </div>
    );
}

/** The baseline: plain tabs, the thing every concept has to beat. */
export function TabsNav({index, onSelect, phone}: {index: number; onSelect: (i: number) => void; phone: boolean}) {
    const onKeyDown = (e: React.KeyboardEvent) => {
        const by = e.key === "ArrowDown" || e.key === "ArrowRight" ? 1 : e.key === "ArrowUp" || e.key === "ArrowLeft" ? -1 : 0;
        const digit = /^[1-9]$/.test(e.key) && Number(e.key) <= SECTIONS.length ? Number(e.key) - 1 : -1;
        if (!by && digit < 0) return;
        e.preventDefault();
        const next = digit >= 0 ? digit : Math.min(SECTIONS.length - 1, Math.max(0, index + by));
        onSelect(next);
        (e.currentTarget.querySelector(`[data-i="${next}"]`) as HTMLElement | null)?.focus();
    };
    return (
        <div role={"tablist"} aria-orientation={phone ? "horizontal" : "vertical"} aria-label={"Market charts views"} onKeyDown={onKeyDown}
             className={phone ? "flex gap-1 overflow-x-auto pb-1" : "flex w-[200px] flex-col gap-1"}>
            {SECTIONS.map((s, i) => (
                <button key={s.id} type={"button"} role={"tab"} id={`tab-${s.id}`} aria-selected={i === index} aria-controls={"lab-stage"}
                        data-i={i} tabIndex={i === index ? 0 : -1} onClick={() => onSelect(i)}
                        className={"shrink-0 rounded-lg px-3 py-2 text-left text-[14px] outline-none focus-visible:ring-2 focus-visible:ring-foreground/60 "
                            + (i === index ? "bg-foreground text-background" : "text-muted-foreground hover:bg-foreground/10 hover:text-foreground")}>
                    {s.name}
                </button>
            ))}
        </div>
    );
}
