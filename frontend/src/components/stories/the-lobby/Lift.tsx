'use client'

import React, {createContext, useCallback, useContext, useEffect, useRef, useState} from "react";

import t from "@/components/stories/story.module.css";
import {storyInteracted} from "@/lib/analytics";
import {fmt} from "@/lib/market-page";
import {bandWords, FLOORS, LOBBY} from "@/lib/stories/the-lobby";
import {cn} from "@/lib/utils";
import {ANGLES, arc, carY, corridor, floorH, floorW, floorY, pt, SEC} from "./geometry";
import l from "./lift.module.css";
import s from "./lobby.module.css";

/*
 * The lift. Five floors, one per band of years the live page publishes. Press
 * a button: the needle sweeps, the car climbs the section, the doors open on
 * that floor's corridor, one door per job, a few with the titles the page
 * lists. "Call the lift" in the hero brings the reader here and opens the
 * lobby. Everything it says is also in the section, the caption and the bars.
 */

type Lift = {floor: number | null; open: boolean; travel: number; shown: number | null; go: (i: number) => void};
const LiftCtx = createContext<Lift | null>(null);
const useLift = () => {
    const lift = useContext(LiftCtx);
    if (!lift) throw new Error("useLift must be used inside <LiftProvider>");
    return lift;
};
const reduced = () => typeof matchMedia === "function" && matchMedia("(prefers-reduced-motion: reduce)").matches;

/** A panel reads top floor first. */
const ORDER = [4, 3, 2, 1, 0];

export function LiftProvider({children}: {children: React.ReactNode}) {
    // `floor` is the button pressed, `shown` the floor the car has reached and the note describes.
    const [floor, setFloor] = useState<number | null>(null);
    const [shown, setShown] = useState<number | null>(null);
    const [open, setOpen] = useState(false);
    const [travel, setTravel] = useState(800);
    const at = useRef(0), isOpen = useRef(false), timers = useRef<number[]>([]);

    const go = useCallback((i: number) => {
        timers.current.forEach(clearTimeout);
        timers.current = [];
        const still = reduced();
        const later = (fn: () => void, ms: number) => { if (still || !ms) fn(); else timers.current.push(window.setTimeout(fn, ms)); };
        setFloor(i);
        const wasOpen = isOpen.current;
        isOpen.current = false;
        setOpen(false);
        later(() => {
            const t = Math.max(500, Math.abs(i - at.current) * 450);
            at.current = i;
            setTravel(t);
            setShown(i);
            later(() => { isOpen.current = true; setOpen(true); }, t + 80);
        }, wasOpen ? 560 : 0);
    }, []);
    useEffect(() => () => timers.current.forEach(clearTimeout), []);
    return <LiftCtx.Provider value={{floor, open, travel, shown, go}}>{children}</LiftCtx.Provider>;
}

/** "Call the lift": scrolls to the lift and opens the lobby's doors. */
export function CallLift() {
    const {go} = useLift();
    const call = () => {
        storyInteracted("the-lobby", "lift");
        document.getElementById("lift")?.scrollIntoView({behavior: reduced() ? "auto" : "smooth", block: "start"});
        if (reduced()) go(0); else window.setTimeout(() => go(0), 700);
    };
    return <button type={"button"} className={s.call} onClick={call}><i aria-hidden />Call the lift</button>;
}

function Indicator({floor}: {floor: number | null}) {
    const turn = floor === null ? undefined : {transform: `rotate(${90 - ANGLES[floor]}deg)`};
    return (
        <svg className={l.ind} viewBox={"0 0 440 130"} aria-hidden>
            <defs><linearGradient id={"lb-brass"} x1={"0"} x2={"0"} y1={"0"} y2={"1"}><stop offset={"0"} stopColor={"#e8c875"} /><stop offset={".6"} stopColor={"#c9a24a"} /><stop offset={"1"} stopColor={"#8a6a2a"} /></linearGradient></defs>
            <path d={"M100 126A120 120 0 0 1 340 126Z"} fill={"url(#lb-brass)"} stroke={"#8a6a2a"} strokeWidth={2} />
            <path d={"M126 126A94 94 0 0 1 314 126"} fill={"none"} stroke={"#3d2d0f"} strokeWidth={1.2} opacity={.55} />
            {FLOORS.map((f, i) => {
                const [x, y] = arc(ANGLES[i], 107);
                return (
                    <g key={f.k}>
                        <path d={`M${pt(ANGLES[i], 84)}L${pt(ANGLES[i], 94)}`} stroke={"#3d2d0f"} strokeWidth={2} />
                        <text x={x.toFixed(1)} y={(y + 6).toFixed(1)} textAnchor={"middle"} fontSize={18} fill={"#3d2d0f"} style={{fontFamily: "var(--deco)"}}>{f.k}</text>
                    </g>
                );
            })}
            <g className={l.needle} style={turn}><path d={"M220 126L213 116L220 46L227 116Z"} fill={"#21201c"} /></g>
            <circle cx={220} cy={126} r={9} fill={"#3d2d0f"} /><circle cx={220} cy={126} r={4} fill={"#e8c875"} />
            <rect x={86} y={124} width={268} height={6} fill={"#8a6a2a"} />
        </svg>
    );
}

/** The building in section: floor widths are counts, the lit floor is the one the car is on. */
export function Section() {
    const {shown} = useLift();
    const {SX, GY} = SEC, top = FLOORS.length - 1;
    const label = `A section of the building, floor widths as counts. The lobby, where ${fmt(FLOORS[0].jobs)} of the ${fmt(LOBBY.jobs)} jobs state no number of years, is the widest floor. `
        + `Above it, of the ${fmt(LOBBY.years.stated)} jobs that state a number: ${FLOORS.slice(1).map((f, j) => `${fmt(f.jobs)} ${j ? `for ${bandWords(f)}` : f.says}`).join(", ")}.`;
    return (
        <svg className={l.sec} viewBox={"0 0 600 460"} role={"img"} aria-label={label}>
            <defs>
                <pattern id={"lb-sh"} width={7} height={7} patternUnits={"userSpaceOnUse"} patternTransform={"rotate(45)"}><rect width={2} height={7} fill={"#8a8f99"} /></pattern>
                <clipPath id={"lb-shaft"}><rect x={60} y={48} width={44} height={372} /></clipPath>
            </defs>
            <rect x={0} y={GY} width={600} height={40} fill={"#d9ccb3"} /><path d={`M0 ${GY}H600`} stroke={"#21201c"} strokeWidth={2} />
            <rect x={60} y={48} width={44} height={372} fill={"#2a2f3f"} /><rect x={54} y={24} width={56} height={26} fill={"#e6dcc8"} stroke={"#21201c"} strokeWidth={1.5} />
            <g clipPath={"url(#lb-shaft)"}>
                <g className={l.car} style={{transform: `translateY(${carY(shown ?? 0)}px)`}}>
                    <path d={"M82 -400V372"} stroke={"#8a8f99"} strokeWidth={1.5} /><rect x={66} y={372} width={32} height={44} fill={"#c9a24a"} stroke={"#3d2d0f"} strokeWidth={1.5} /><path d={"M82 374V414"} stroke={"#3d2d0f"} />
                </g>
            </g>
            {FLOORS.map((f, i) => {
                const y = floorY(i), h = floorH(i), w = floorW(i), lx = i ? SX + w + 12 : SX + 16, ly = y + h / 2;
                return (
                    <g key={f.k}>
                        <rect className={cn(l.floor, shown === i && l.lit)} x={SX} y={y} width={w.toFixed(1)} height={h} />
                        {i === 0 && <rect x={SX} y={y} width={w.toFixed(1)} height={h} fill={"url(#lb-sh)"} stroke={"#21201c"} strokeWidth={1.5} />}
                        <text x={lx.toFixed(1)} y={ly + 8} fontSize={24} fill={"#21201c"} style={{fontFamily: "var(--deco)"}}>{f.k}</text>
                        <text x={(lx + (i ? 56 : 40)).toFixed(1)} y={ly + 7} fontSize={21} fill={"#21201c"} style={{fontFamily: "var(--mono)"}}>{fmt(f.jobs)}{i ? "" : " state no number"}</text>
                    </g>
                );
            })}
            <rect x={SX - 3} y={floorY(top) - 5} width={(floorW(top) + 6).toFixed(1)} height={6} fill={"#21201c"} />
            <text x={396} y={322} fontSize={26} fill={"var(--pen)"} style={{fontFamily: "var(--hand)"}}>the biggest floor</text>
            <path d={"M470 328q6 10 2 22M465 342l7 10 7-8"} fill={"none"} stroke={"var(--pen)"} strokeWidth={1.6} strokeLinecap={"round"} strokeLinejoin={"round"} />
        </svg>
    );
}

/** The indicator, the doors with the corridor behind them, the panel, and the note on the floor reached. */
export function LiftCar() {
    const {floor, open, shown, go} = useLift();
    const panel = useRef<HTMLDivElement>(null);
    const keys = (e: React.KeyboardEvent) => {
        const d = ({ArrowDown: 1, ArrowRight: 1, ArrowUp: -1, ArrowLeft: -1} as Record<string, number>)[e.key];
        const bs = [...(panel.current?.querySelectorAll("button") ?? [])], k = bs.indexOf(document.activeElement as HTMLButtonElement);
        if (k < 0 || !d) return;
        e.preventDefault();
        bs[(k + d + bs.length) % bs.length].focus();
    };
    const f = open && shown !== null ? FLOORS[shown] : null;
    return (
        <div className={cn(l.lf, open && l.open)}>
            <Indicator floor={shown} />
            <div className={l.doorway}>
                <div className={l.doors}>
                    <svg className={l.cor} viewBox={"0 0 300 320"} aria-hidden dangerouslySetInnerHTML={{__html: shown === null ? "" : corridor(FLOORS[shown].jobs)}} />
                    <div className={cn(l.door, l.l)} /><div className={cn(l.door, l.r)} />
                </div>
                <div ref={panel} className={l.panel} role={"group"} aria-label={"Lift buttons, one per band of years"} onKeyDown={keys}>
                    {ORDER.map((i) => (
                        <button key={i} type={"button"} className={l.fb} aria-pressed={floor === i} aria-label={FLOORS[i].aria} onClick={() => { storyInteracted("the-lobby", "lift"); go(i); }}>
                            <i aria-hidden>{FLOORS[i].k}</i><span aria-hidden>{fmt(FLOORS[i].jobs)}</span>
                        </button>
                    ))}
                </div>
            </div>
            <div className={l.fnote} aria-live={"polite"}>
                <p className={l.ro}>
                    {f ? <><b>{fmt(f.jobs)}</b> doors on this floor: the jobs that {f.says}, {f.of}.{f.note && ` ${f.note}`}
                        {f.doors.length > 0 && ` Plates on the doors, from the ${LOBBY.listed} titles the page lists:`}</>
                        : "Press a floor, or call the lift from the street."}
                </p>
                {f && f.doors.length > 0 && (
                    <ul className={l.plates}>
                        {f.doors.map((d) => <li key={d.title}>{d.title}<small>{d.employer}{d.asks && ` · ${d.asks}`}</small></li>)}
                    </ul>
                )}
            </div>
        </div>
    );
}

/** Show all floors: the same five counts as bars, which is also the table. Lit with the floor the car is on. */
export function AllFloors() {
    const {shown} = useLift();
    const [unfolded, setUnfolded] = useState(false);
    return (
        <>
            <p className={cn(s.cue, l.cue)}>
                <button type={"button"} className={l.link} aria-expanded={unfolded} aria-controls={"allfloors"} onClick={() => { storyInteracted("the-lobby", "all_floors"); setUnfolded((v) => !v); }}>
                    {unfolded ? "Hide the floors" : "Show all floors"}
                </button>
            </p>
            <table id={"allfloors"} className={cn(l.allfloors, !unfolded && l.folded)}>
                <caption className={t.sr}>The five floors as bars: jobs by the years they ask for</caption>
                <tbody>
                    {ORDER.map((i) => (
                        <tr key={i} className={cn(i === 0 && l.lobby, shown === i && l.lit)}>
                            <th scope={"row"}>{FLOORS[i].k}</th>
                            <td className={l.bc}><span className={l.bar} style={{width: `${((FLOORS[i].jobs / FLOORS[0].jobs) * 100).toFixed(1)}%`}} /></td>
                            <td className={l.n}>{fmt(FLOORS[i].jobs)}</td>
                            <td className={l.what}>{FLOORS[i].says}</td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </>
    );
}

/** The lift figure's frame: carries the travel time for the needle and the car. */
export function LiftFrame({children}: {children: React.ReactNode}) {
    const {travel} = useLift();
    return <figure className={s.wide} id={"lift"} style={{"--t": `${travel}ms`} as React.CSSProperties}>{children}</figure>;
}
