'use client'

import React, {useEffect, useMemo, useRef, useState} from "react";
import Link from "next/link";
import {ChevronDownIcon, InfoIcon, PauseIcon, PlayIcon} from "lucide-react";

import {Button} from "@/components/ui/button";
import {Popover, PopoverContent, PopoverTrigger} from "@/components/ui/popover";
import {ToggleGroup, ToggleGroupItem} from "@/components/ui/toggle-group";
import {Tooltip, TooltipContent, TooltipTrigger} from "@/components/ui/tooltip";
import {useWidth} from "@/components/dashboard/MarketParts";
import {Level, LEVELS, LookFamily, sharePct, squaresFor, topTenHave} from "@/lib/landing/look";
import {COPY, FAMILY_LABEL} from "./copy";

const C = COPY.count;
const RING = 2 * Math.PI * 15;
// A job type with its own market page (lib/market-pages.ts), linked from the card.
const ROLE_PAGE: Record<string, string> = {software_engineering: "software-engineering", ai: "ai", machine_learning: "machine-learning", devops: "devops"};
const cap = (f: string) => { const l = FAMILY_LABEL[f] ?? f; return l === "QA" || l === "DevOps" ? l : l[0].toUpperCase() + l.slice(1); };
const fmt = (n: number) => n.toLocaleString("en");
const LEVEL_WORD: Record<Level, string> = {junior: "junior", mid: "mid level", senior: "senior or above"};

/** The number, counting up to it over 600ms unless motion is reduced. */
function Tween({value, reduce}: {value: number; reduce: boolean}) {
    const ref = useRef<HTMLSpanElement>(null), from = useRef(value);
    useEffect(() => {
        const el = ref.current, start = from.current;
        from.current = value;
        if (!el) return;
        if (reduce || start === value) { el.textContent = fmt(value); return; }
        let raf = 0;
        const t0 = performance.now();
        const tick = (t: number) => {
            const p = Math.min(1, (t - t0) / 600), e = 1 - Math.pow(1 - p, 3);
            el.textContent = fmt(Math.round(start + (value - start) * e));
            if (p < 1) raf = requestAnimationFrame(tick);
        };
        raf = requestAnimationFrame(tick);
        return () => cancelAnimationFrame(raf);
    }, [value, reduce]);
    return <span className={"num"} ref={ref}>{fmt(value)}</span>;
}

/** The job types outside the main ten, one card that opens a list. Picking one puts it on the card. */
function MoreTypes({more, data, family, level, onPick}: {
    more: string[]; data: Record<string, LookFamily>; family: string; level: Level; onPick: (family: string, level: Level) => void;
}) {
    const [open, setOpen] = useState(false);
    const active = more.includes(family);
    return (
        <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger render={<Button variant={"ghost"} className={"fc more h-auto"} data-pressed={active ? "" : undefined} aria-pressed={active} />}>
                {active ? <><b>{cap(family)}</b><span>{fmt(data[family].jobs)} jobs</span></>
                    : <><b>{C.more} <ChevronDownIcon className={"inline size-3.5"} /></b><span>{C.moreCount(more.length)}</span></>}
            </PopoverTrigger>
            <PopoverContent align={"start"} className={"la-more w-64 p-1"}>
                <ul className={"grid"}>
                    {more.map((f) => (
                        <li key={f}>
                            <Button variant={"ghost"} className={"h-auto w-full justify-between px-2.5 py-2 font-normal"} aria-current={f === family}
                                    onClick={() => { onPick(f, level); setOpen(false); }}>
                                <span>{cap(f)}</span><span className={"font-mono text-xs text-muted-foreground"}>{fmt(data[f].jobs)} jobs</span>
                            </Button>
                        </li>
                    ))}
                </ul>
            </PopoverContent>
        </Popover>
    );
}

export default function CountCard({families, more, data, family, level, date, onPick, subscribe, playing, onPlaying, state, reduce, have}: {
    families: string[]; more: string[]; data: Record<string, LookFamily>; family: string; level: Level; date: string;
    onPick: (family: string, level: Level) => void; subscribe: (fn: (p: number) => void) => () => void;
    playing: boolean; onPlaying: (p: boolean) => void; state: string; reduce: boolean; have: Set<string> | null;
}) {
    const d = data[family];
    const {perSquare, levels} = useMemo(() => squaresFor(family, d), [family, d]);
    const ringRef = useRef<SVGCircleElement>(null), barRefs = useRef<Record<string, HTMLElement | null>>({});
    const li = LEVELS.indexOf(level);

    // The ring and the job type's bar follow the timer without re-rendering the card.
    useEffect(() => subscribe((p) => {
        ringRef.current?.setAttribute("stroke-dashoffset", (RING * (1 - p)).toFixed(2));
        Object.entries(barRefs.current).forEach(([f, el]) => { if (el) el.style.width = f === family ? `${((li + p) / 3) * 100}%` : "0"; });
    }), [subscribe, family, li]);

    const n = d.seniority[level];
    const label = FAMILY_LABEL[family] ?? family;
    const part = (k: Level | "unstated", text: string) => k === level ? <b>{fmt(d.seniority[k])} {text}</b> : <>{fmt(d.seniority[k])} {text}</>;
    // Seven rows, as many columns as it takes; squares between 6 and 18px wide.
    const [wrapRef, width] = useWidth<HTMLDivElement>();
    const cols = Math.ceil(levels.length / 7), gap = width < 360 ? 2 : 3;
    const size = Math.max(6, Math.min(18, Math.floor((width + gap) / cols - gap)));

    return (
        <div className={"card countcard"}>
            <div className={"cc-hd"}>
                <span className={"kick"}>{C.kicker(date)}</span>
                <Tooltip>
                    <TooltipTrigger render={<Button variant={"ghost"} size={"icon-sm"} aria-label={"How we count"} className={"iconbtn"} />}>
                        <InfoIcon className={"size-4"} />
                    </TooltipTrigger>
                    <TooltipContent className={"max-w-64 font-mono text-[12px] leading-snug"}>{C.howWeCount}</TooltipContent>
                </Tooltip>
            </div>
            <ToggleGroup aria-label={"Job type"} className={"famcards"} value={[family]} spacing={0}
                         onValueChange={(v: unknown[]) => { if (v[0]) onPick(String(v[0]), level); }}>
                {families.map((f) => (
                    <ToggleGroupItem key={f} value={f} className={"fc"}>
                        <b>{cap(f)}</b><span>{fmt(data[f].jobs)} jobs</span>
                        <i className={"tbar"} ref={(el) => { barRefs.current[f] = el; }} />
                    </ToggleGroupItem>
                ))}
                {more.length > 0 && <MoreTypes more={more} data={data} family={family} level={level} onPick={onPick} />}
            </ToggleGroup>
            <div className={"ctl-row"}>
                <ToggleGroup aria-label={"Level"} className={"lvl"} value={[level]} spacing={0}
                             onValueChange={(v: unknown[]) => { if (v[0]) onPick(family, v[0] as Level); }}>
                    {LEVELS.map((l, i) => <ToggleGroupItem key={l} value={l}>{C.levels[i]}</ToggleGroupItem>)}
                </ToggleGroup>
            </div>
            <div className={"cc-fig"}>
                <Tween value={n} reduce={reduce} />
                <span className={"of"}>of {fmt(d.jobs)}</span>
                <span className={"lime"}>{C.share(sharePct(n, d.jobs), label)}</span>
            </div>
            <p className={"cc-say"}>{C.say(n, fmt(d.jobs), label, level)}</p>
            <div className={"sqwrap"} ref={wrapRef}>
                <div className={"sq"} role={"img"} aria-label={`${n} of ${d.jobs} ${label} jobs are ${LEVEL_WORD[level]}. One square is ${perSquare === 1 ? "one job" : "10 jobs"}.`}
                     // Until the width is measured (the server render), the CSS default size holds the space.
                     style={width ? {"--sq": `${size}px`, "--gap": `${gap}px`} as React.CSSProperties : undefined}>
                    {levels.map((k, i) => (
                        <i key={`${family}-${i}`} className={`${k === "unstated" ? "ns" : ""} ${k === level ? "lit" : ""} ${reduce ? "" : "enter"}`}
                           style={reduce ? undefined : {animationDelay: `${Math.floor(i / 7) * 14}ms`, transitionDelay: `${Math.floor(i / 7) * 10}ms`}} />
                    ))}
                </div>
            </div>
            <div className={"legend"}>
                <span><i className={"l-lit"} />{C.legendOne(perSquare)}</span>
                <span><i className={"l-off"} />{C.legendOther}</span>
                <span><i className={"l-ns"} />{C.legendUnstated}</span>
            </div>
            <p className={"breakdown"}>
                {part("junior", "junior")} · {part("mid", "mid level")} · {part("senior", "senior or above")} · {C.unstated(fmt(d.seniority.unstated))}
            </p>
            {ROLE_PAGE[family] && (
                <p className={"mt-2 text-[14px]"}>
                    <Link href={`/market/${ROLE_PAGE[family]}`} className={"text-primary underline-offset-4 hover:underline"}>What {label} jobs ask for</Link>
                </p>
            )}
            {have && <p className={"cvline"}>{C.yourCv(topTenHave(d, have), label)}</p>}
            {reduce ? <p className={"sub"} style={{marginTop: 12}}>{C.reduced}</p> : (
                <div className={"timer"}>
                    <Button variant={"ghost"} size={"icon"} className={"ringbtn"} aria-label={playing ? "Pause" : "Play"} onClick={() => onPlaying(!playing)}>
                        <svg className={"ring"} viewBox={"0 0 34 34"} aria-hidden>
                            <circle className={"bgc"} cx={17} cy={17} r={15} />
                            <circle className={"fg"} ref={ringRef} cx={17} cy={17} r={15} strokeDasharray={RING.toFixed(2)} strokeDashoffset={RING.toFixed(2)} />
                        </svg>
                        {playing ? <PauseIcon className={"size-3"} /> : <PlayIcon className={"size-3"} />}
                    </Button>
                    <span className={"state"}>{state}</span>
                </div>
            )}
            <div className={"sr-only"} aria-live={"polite"}>{C.say(n, fmt(d.jobs), label, level)}</div>
        </div>
    );
}
