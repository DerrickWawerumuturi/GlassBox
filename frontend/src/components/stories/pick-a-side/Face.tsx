import React from "react";

import {fmt} from "@/lib/market-page";
import {Card, PICK, suit} from "@/lib/stories/pick-a-side";
import {cn} from "@/lib/utils";
import {ICON, PIP, PIP_BOX} from "./icons";
import s from "./pick.module.css";

/*
 * A playing card's face, drawn for one skill: rank and pip in two corners
 * (the bottom one turned round, as on a real card), and a court frame with
 * the skill's glyph in a medallion, its name and the panel that holds the
 * two numbers. The game (Cards.tsx), the hero's face up card and the hand
 * share it. No state: it renders on the server.
 */

/** The deck's pip for a card's suit, in ink. */
export const Pip = ({c, className = s.pip}: {c: Card; className?: string}) => (
    <svg className={className} viewBox={PIP_BOX} aria-hidden><path d={PIP[suit(c)]} /></svg>
);

/** A corner index: rank over pip. Longer ranks set smaller so JAVA fits where PY does. */
export const Index = ({c, at}: {c: Card; at: "tl" | "br"}) => (
    <span className={cn(s.idx, s[at], c.rank.length > 3 ? s.long : c.rank.length === 3 && s.mid)} aria-hidden>
        <b>{c.rank}</b><Pip c={c} />
    </span>
);

/** Both numbers, as they sit under the scratch panel. The senior count is missing where the page gives a share only. */
export function Numbers({c, hidden}: {c: Card; hidden: boolean}) {
    return (
        <div className={s.nums} aria-hidden={hidden}>
            <div className={cn(s.num, s.e)}><i>entry level</i><b>{c.e.share}%</b><small>{c.e.jobs} of {fmt(PICK.readable)}</small></div>
            <div className={cn(s.num, s.sen)}><i>senior</i><b>{c.s.share}%</b>
                {c.s.jobs === null ? <small className={s.only}>share only</small> : <small>{fmt(c.s.jobs)} of {fmt(PICK.senior)}</small>}</div>
        </div>
    );
}

/** The face. `panel` is what sits over the numbers: the scratch canvas in play, the closed back on the hero. */
export function Face({c, panel, hidden = true}: {c: Card; panel: React.ReactNode; hidden?: boolean}) {
    return (
        <div className={cn(s.face, c.key === PICK.beats.lime && s.lime)}>
            <Index c={c} at={"tl"} /><Index c={c} at={"br"} />
            <div className={s.court}>
                <svg className={s.glyph} viewBox={"0 0 28 28"} fill={"none"} stroke={"#1a1a1a"} strokeWidth={1.9} strokeLinecap={"round"} strokeLinejoin={"round"}
                     aria-hidden dangerouslySetInnerHTML={{__html: ICON[c.key] ?? ""}} />
                <h3>{c.name}</h3>
                <p className={s.named}>named in</p>
                <div className={s.panel}><Numbers c={c} hidden={hidden} />{panel}</div>
                <p className={s.emp}>{c.employers ? `named by jobs at ${c.employers} employers` : "named by jobs at 10 or more employers"}</p>
            </div>
        </div>
    );
}
