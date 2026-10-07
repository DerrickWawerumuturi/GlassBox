import React from "react";

import {fmt} from "@/lib/market-page";
import {Ctx, squaresCaption, squaresLabel, squaresLegend} from "@/lib/market-story";
import css from "./editorial.module.css";

/*
 * The lead visual: the count itself, and one square per job. Lime marks the
 * jobs naming the headline skill (the one highlight), an outline marks an
 * internship. Squares are grouped, so the picture reads as proportions.
 */

const size = (jobs: number) => (jobs <= 200 ? css.s24 : jobs <= 600 ? css.s14 : css.s9);

function Swatch({className, style}: {className?: string; style?: React.CSSProperties}) {
    return <i aria-hidden className={`inline-block size-[13px] rounded-[3px] ${className ?? ""}`} style={style} />;
}

export default function LeadSquares({c}: {c: Ctx}) {
    const {page} = c, sq = page.story.squares, l = squaresLegend(c);
    const groups: Array<[number, string]> = [[sq.skill, css.lime], [sq.both, `${css.lime} ${css.ring}`], [sq.neither, ""], [sq.internship, css.ring]];
    return (
        <figure id={"lead-visual"} className={"m-0 grid items-center gap-5 rounded-[14px] border border-border bg-card p-[18px] sm:gap-9 sm:p-[30px] md:grid-cols-[250px_minmax(0,1fr)]"}>
            <div>
                <div className={"font-heading text-[80px] font-bold leading-[0.9] tracking-[-0.04em] sm:text-[112px]"}>{fmt(page.jobs)}</div>
                <p className={"mt-2.5 font-read text-[16px] text-foreground/85"}>{squaresCaption(c)}</p>
            </div>
            <div>
                <div role={"img"} aria-label={squaresLabel(c)} className={`${css.squares} ${size(page.jobs)}`}>
                    {groups.flatMap(([n, cls], g) => Array.from({length: n}, (_, i) => <i key={`${g}-${i}`} className={cls || undefined} />))}
                </div>
                <figcaption className={"mt-4 flex flex-wrap gap-x-[18px] gap-y-1.5 font-mono text-[12px] font-medium text-muted-foreground"}>
                    {l.skill && <span className={"inline-flex items-center gap-[7px]"}>
                        <Swatch className={"bg-accent-lime shadow-[inset_0_0_0_1px_var(--accent-lime-edge)]"} />names {l.skill}, {fmt(l.named)}</span>}
                    {l.skill && <span className={"inline-flex items-center gap-[7px]"}><Swatch className={"bg-foreground"} />doesn&apos;t, {fmt(l.without)}</span>}
                    {l.interns > 0 && <span className={"inline-flex items-center gap-[7px]"}>
                        <Swatch className={"shadow-[inset_0_0_0_2px_var(--foreground)]"} />outlined: internship, {fmt(l.interns)}</span>}
                </figcaption>
            </div>
        </figure>
    );
}
