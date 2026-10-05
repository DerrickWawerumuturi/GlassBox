import React from "react";

import {pairsWith, SkillData} from "./skill-data";

/*
 * Concept D: specimen cards. One card per skill you don't have yet, like a
 * field guide: how many postings ask, a tally (one mark per posting, solid
 * when it asks), the roles asking, which of your skills it pairs with, and
 * how many postings learning it alone brings within reach. A grid on a
 * desktop, a deck you swipe on a phone. The staircase's first step wears
 * the lime "Start here".
 */

const CARDS = 6;

function roles(titles: string[]): string[] {
    // Most common first. Titles cut at their qualifier ("Software Engineer - Branching", "(Remote)"),
    // without seniority words or level numbers ("Software Engineer II", "Engineer 3").
    const tidy = (t: string) => t.split(/\s[-–|]\s|[,(]/)[0]
        .replace(/\b(senior|sr\.?|junior|jr\.?|lead|staff|principal|mid|mid-level|new grad|graduate|ii|iii)\b/gi, "").replace(/\s+(i{1,3}|iv|[1-5])$/i, "").replace(/\s+/g, " ").trim();
    const counts = new Map<string, number>();
    for (const t of titles.map(tidy)) if (t) counts.set(t, (counts.get(t) ?? 0) + 1);
    return [...counts].sort((a, b) => b[1] - a[1]).slice(0, 3).map(([t]) => t);
}

export default function Specimens({data, first}: {data: SkillData; first?: string}) {
    const base = data.reach(data.mine);
    const cards = data.skills.filter((s) => !s.have).slice(0, CARDS).map((s) => {
        const asking = data.postings.filter((p) => p.skills.has(s.key));
        return {
            s, asking,
            roles: roles(asking.map((p) => p.title)),
            pairs: pairsWith(data, s.key),
            opens: data.reach(new Set([...data.mine, s.key])) - base,
        };
    });

    return (
        <ul className={"-mx-4 flex snap-x snap-mandatory gap-3 overflow-x-auto px-4 pb-2 [scrollbar-width:none] sm:mx-0 sm:grid sm:grid-cols-2 sm:overflow-visible sm:px-0 lg:grid-cols-3"}>
            {cards.map(({s, asking, roles, pairs, opens}) => (
                <li key={s.key} className={"flex w-[82%] min-w-0 shrink-0 snap-center flex-col gap-3 rounded-2xl border border-border bg-background/40 p-4 sm:w-auto"}>
                    <div className={"flex items-start justify-between gap-2"}>
                        <h3 className={"font-heading text-[20px] font-semibold leading-tight"}>{s.name}</h3>
                        {s.key === first && <span className={"shrink-0 rounded-full bg-[var(--accent-lime)] px-2 font-mono text-[12px] font-bold leading-5 text-[var(--accent-lime-ink)]"}>Start here</span>}
                    </div>
                    <div>
                        <div className={"font-mono text-[12px] text-muted-foreground"}><b className={"text-foreground"}>{asking.length}</b> of {data.total} postings ask</div>
                        <Tally ask={asking.length} total={data.total} />
                    </div>
                    <dl className={"grid min-w-0 gap-2 text-[14px]"}>
                        <div>
                            <dt className={"font-mono text-[12px] uppercase tracking-[0.1em] text-muted-foreground"}>Asked by</dt>
                            <dd className={"line-clamp-2"}>{roles.join(", ") || "Various roles"}</dd>
                        </div>
                        <div>
                            <dt className={"font-mono text-[12px] uppercase tracking-[0.1em] text-muted-foreground"}>Pairs with yours</dt>
                            <dd className={"flex flex-wrap gap-1.5 pt-0.5"}>
                                {pairs.length ? pairs.map((p) => (
                                    <span key={p.skill.key} className={"inline-flex items-center gap-1.5 rounded-full bg-foreground/8 px-2 text-[13px]"}>
                                        <span aria-hidden className={"size-2 rounded-full bg-[var(--chart-have)]"} />{p.skill.name}
                                        <span className={"font-mono text-[12px] text-muted-foreground"}>{p.n}</span>
                                    </span>
                                )) : <span className={"text-muted-foreground"}>None of yours, yet</span>}
                            </dd>
                        </div>
                    </dl>
                    <p className={"mt-auto border-t border-border pt-3 text-[14px]"}>
                        {opens > 0 ? <>Alone, it brings <b>{opens}</b> more {opens === 1 ? "posting" : "postings"} within reach.</>
                            : <span className={"text-muted-foreground"}>Alone, it brings none within reach. It pays off with others.</span>}
                    </p>
                </li>
            ))}
        </ul>
    );
}

/** One mark per posting, in fives; solid where the posting asks. */
function Tally({ask, total}: {ask: number; total: number}) {
    const groups = Math.ceil(total / 5);
    return (
        <svg viewBox={`0 0 ${groups * 15} 16`} className={"mt-1.5 h-4 w-full"} preserveAspectRatio={"xMinYMid meet"} aria-hidden>
            {Array.from({length: total}, (_, k) => {
                const x = Math.floor(k / 5) * 15 + (k % 5) * 2.4 + 1;
                return <line key={k} x1={x} y1={2} x2={x} y2={14} stroke={k < ask ? "var(--chart-ink)" : "var(--foreground)"}
                             strokeOpacity={k < ask ? 0.9 : 0.15} strokeWidth={1.2} />;
            })}
        </svg>
    );
}
