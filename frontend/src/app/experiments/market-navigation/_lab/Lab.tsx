'use client'

import React, {useCallback, useEffect, useRef, useState} from "react";

import {ConceptId, CONCEPTS} from "./concepts";
import NeedleDial from "@/components/Market/NeedleDial";
import RingNav from "./RingNav";
import {SECTIONS} from "./sections";
import Stage, {TabsNav} from "./Stage";

/*
 * The lab: pick a concept, use it, and run the speed test (six "go to X"
 * jumps, timed) to compare it with plain tabs. Results stay in this tab's
 * sessionStorage only.
 */

type Choice = ConceptId | "tabs";
const CHOICES: {id: Choice; name: string; label: string}[] = [
    ...CONCEPTS.map(({id, name, label}) => ({id, name, label})),
    {id: "tabs", name: "Baseline", label: "Plain tabs"},
];
const PHONE_BAND: Record<Choice, number> = {arc: 120, edge: 112, orbit: 104, dial: 170, tabs: 56};
const RESULTS_KEY = "market-nav-lab-results";

function useViewport() {
    const [vp, setVp] = useState({w: 0, h: 0});
    useEffect(() => {
        const read = () => setVp({w: window.innerWidth, h: window.innerHeight});
        read();
        window.addEventListener("resize", read);
        return () => window.removeEventListener("resize", read);
    }, []);
    return vp;
}

const median = (xs: number[]) => [...xs].sort((a, b) => a - b)[Math.floor(xs.length / 2)];

export default function Lab() {
    const vp = useViewport();
    const [choice, setChoice] = useState<Choice>("arc");
    const [index, setIndex] = useState(0);
    const [test, setTest] = useState<{targets: number[]; k: number; t0: number; times: number[]} | null>(null);
    const [results, setResults] = useState<Partial<Record<Choice, number[]>>>({});
    const testRef = useRef(test);
    const row = useRef<HTMLDivElement>(null);
    const [rowTop, setRowTop] = useState(320);
    testRef.current = test;

    useEffect(() => {
        const c = new URLSearchParams(window.location.search).get("c") as Choice | null;
        if (c && CHOICES.some((x) => x.id === c)) setChoice(c);
        try { setResults(JSON.parse(sessionStorage.getItem(RESULTS_KEY) ?? "{}")); } catch {}
    }, []);

    const pick = (c: Choice) => {
        setChoice(c); setIndex(0); setTest(null);
        window.history.replaceState(null, "", `?c=${c}`);
    };

    const onSelect = useCallback((i: number) => {
        setIndex(i);
        const t = testRef.current;
        if (!t || i !== t.targets[t.k]) return;
        const times = [...t.times, performance.now() - t.t0];
        if (t.k + 1 < t.targets.length) { setTest({...t, k: t.k + 1, t0: performance.now(), times}); return; }
        setTest(null);
        setResults((prev) => {
            const next = {...prev, [choice]: times};
            try { sessionStorage.setItem(RESULTS_KEY, JSON.stringify(next)); } catch {}
            return next;
        });
    }, [choice]);

    const startTest = () => {
        // Six targets, never the current view and never the same twice in a row.
        const targets: number[] = [];
        let last = index;
        while (targets.length < 6) {
            const t = Math.floor(Math.random() * SECTIONS.length);
            if (t !== last) { targets.push(t); last = t; }
        }
        setTest({targets, k: 0, t0: performance.now(), times: []});
    };

    // The nav fills what is left of the window below the header, so the whole ring is in view.
    useEffect(() => { if (row.current) setRowTop(row.current.getBoundingClientRect().top + window.scrollY); }, [vp.w, choice]);

    if (!vp.w) return <main className={"min-h-screen bg-background"} />;
    const phone = vp.w < 640;
    const concept = CONCEPTS.find((c) => c.id === choice);
    const navH = Math.max(420, vp.h - rowTop - 48);

    const navW = phone ? vp.w : 340, navHeight = phone ? PHONE_BAND[choice] : navH;
    const nav = choice === "tabs"
        ? <TabsNav index={index} onSelect={onSelect} phone={phone} />
        : choice === "dial"
        ? <NeedleDial key={`dial-${phone}`} items={SECTIONS} controls={"lab-stage"} phone={phone} index={index} onSelect={onSelect} w={navW} h={navHeight} />
        : <RingNav key={`${choice}-${phone}`} concept={choice} phone={phone} index={index} onSelect={onSelect}
                   w={navW} h={navHeight} />;

    return (
        <main className={"min-h-screen bg-background text-foreground"}>
            <header className={"border-b border-border px-4 py-4 sm:px-8"}>
                <p className={"font-mono text-[12px] uppercase tracking-[0.12em] text-muted-foreground"}>Experiment · not in the app</p>
                <h1 className={"font-heading text-[20px] font-semibold"}>Market Charts navigation</h1>
                <nav aria-label={"Concepts"} className={"mt-3 flex gap-1.5 overflow-x-auto pb-1"}>
                    {CHOICES.map((c) => (
                        <button key={c.id} type={"button"} onClick={() => pick(c.id)} aria-pressed={c.id === choice}
                                className={"shrink-0 rounded-full border px-3 py-1.5 text-[13px] "
                                    + (c.id === choice ? "border-foreground bg-foreground text-background" : "border-border text-muted-foreground hover:text-foreground")}>
                            <span className={"font-mono"}>{c.name}</span> · {c.label}
                        </button>
                    ))}
                </nav>
                <p className={"mt-2 max-w-[760px] text-[14px] text-muted-foreground"}>
                    {concept ? (phone ? concept.mobile : concept.how) : "Ordinary tabs, for comparison. Click, or use the arrow keys."}
                    {" "}Keys 1–6 jump straight to a view.
                </p>
                <div className={"mt-3 flex flex-wrap items-center gap-3 text-[13px]"}>
                    {test
                        ? <span className={"rounded-full bg-foreground px-3 py-1.5 font-medium text-background"} role={"status"}>
                            Go to: {SECTIONS[test.targets[test.k]].name} <span className={"font-mono opacity-70"}>({test.k + 1}/6)</span>
                          </span>
                        : <button type={"button"} onClick={startTest} className={"rounded-full border border-border px-3 py-1.5 hover:border-foreground"}>
                            Speed test: six timed jumps
                          </button>}
                    {CHOICES.filter((c) => results[c.id]?.length).map((c) => (
                        <span key={c.id} className={"font-mono text-[12px] text-muted-foreground"}>
                            {c.label}: {(median(results[c.id]!) / 1000).toFixed(2)}s median
                        </span>
                    ))}
                </div>
            </header>
            {phone ? (
                <div className={"flex flex-col"}>
                    <div className={"p-4"} style={{paddingBottom: PHONE_BAND[choice] + 24}}><Stage section={SECTIONS[index]} /></div>
                    <div className={"fixed inset-x-0 bottom-0 border-t border-border bg-background"}>{nav}</div>
                </div>
            ) : (
                <div ref={row} className={"flex gap-6 py-6 pr-8"} style={{paddingLeft: choice === "tabs" ? 32 : 0}}>
                    <div className={"sticky top-6 shrink-0 self-start"}>{nav}</div>
                    <Stage section={SECTIONS[index]} />
                </div>
            )}
        </main>
    );
}
