'use client'

import React, {useCallback, useEffect, useRef, useState} from "react";
import {BriefcaseIcon, CalendarIcon, ChevronLeftIcon, ClipboardPasteIcon, ExternalLinkIcon, LoaderIcon} from "lucide-react";

import {Button} from "@/components/ui/button";
import {Select, SelectContent, SelectItem, SelectTrigger, SelectValue} from "@/components/ui/select";
import {track} from "@/lib/analytics";
import {AdError, pasteBody, readAd, ReadAd} from "@/lib/landing/ad";
import {AdAsk, adAsks, adFor, askRows, Level, Look, LookAd, normSkill, rarest} from "@/lib/landing/look";
import {COPY, FAMILY_LABEL} from "./copy";

const G = COPY.glass;
const fmt = (n: number) => n.toLocaleString("en");
const LEVEL_WORD: Record<string, string> = {junior: "junior", mid: "mid level", senior: "senior", unstated: ""};

/** What the glass is showing: one of today's ads (stepping with the count), or the visitor's own. */
type Shown = {kind: "today"; ad: LookAd; family: string} | {kind: "own"; ad: ReadAd};

const posted = (iso: string | null) => iso
    ? new Date(`${iso}T12:00:00Z`).toLocaleDateString("en-GB", {day: "numeric", month: "short", timeZone: "UTC"}) : null;

/** A skill on the paper: underlined; once a CV is in, green when it is on the CV, hatched when not. */
function Mark({k, name, opt, have}: {k: string; name: string; opt?: boolean; have: Set<string> | null}) {
    const state = have ? (have.has(normSkill(k)) ? "have" : "gap") : "";
    return <mark className={`${opt ? "opt" : ""} ${state}`}>{name}</mark>;
}

function Paper({shown, names, have, busy, barRef}: {
    shown: Shown | null; names: Record<string, string>; have: Set<string> | null; busy: string | null;
    barRef: React.RefObject<HTMLSpanElement | null>;
}) {
    const list = (keys: string[], opt?: boolean) => keys.map((k, i) => (
        <React.Fragment key={k}>{i > 0 && ", "}<Mark k={k} name={names[k] ?? k} opt={opt} have={have} /></React.Fragment>
    ));
    const body = (() => {
        if (!shown) return null;
        if (shown.kind === "own") {
            const req = shown.ad.asks.filter((a) => a.kind === "req"), opt = shown.ad.asks.filter((a) => a.kind === "opt");
            return (
                <>
                    <span className={"tape r"} />
                    <div className={"src"}>{G.yourAd}</div>
                    <div className={"pt"}>{shown.ad.title}</div>
                    {req.length > 0 && <><div className={"h"}>{G.asksFor}</div><div className={"asked"}>{list(req.map((a) => a.key))}</div></>}
                    {opt.length > 0 && <><div className={"h"}>{G.optional}</div><div className={"asked"}>{list(opt.map((a) => a.key), true)}</div></>}
                </>
            );
        }
        const {ad, family} = shown;
        const place = ad.location && !/^n\/?a$/i.test(ad.location) ? `${ad.location}${ad.remote && !/remote/i.test(ad.location) ? ", remote" : ""}` : G.placeNotStated;
        const opt = ad.pref.filter((k) => !ad.req.includes(k));
        return (
            <>
                <div className={"src"}>{G.oneOfToday(LEVEL_WORD[ad.lvl], FAMILY_LABEL[family] ?? family)}</div>
                <div className={"pt"}>{ad.title}</div>
                <div className={"pm"}>{ad.company} · {place}</div>
                <div className={"h"}>{G.asksFor}</div><div className={"asked"}>{list(ad.req)}</div>
                {opt.length > 0 && <><div className={"h"}>{G.optional}</div><div className={"asked"}>{list(opt, true)}</div></>}
                <div className={"pf"}>
                    <span><BriefcaseIcon className={"ic"} />{ad.years ? <b>{G.yearsAsked(ad.years)}</b> : G.yearsNotStated}</span>
                    <span><CalendarIcon className={"ic"} />{G.posted} <b>{posted(ad.posted) ?? G.dateNotStated}</b></span>
                </div>
                <a className={"orig"} href={ad.url} target={"_blank"} rel={"noopener noreferrer"}>{G.viewOriginal} <ExternalLinkIcon className={"ic"} /></a>
                <span className={"adbar"} aria-hidden ref={barRef} />
            </>
        );
    })();
    return (
        <div className={`paper ${busy ? "scanning" : ""}`} style={!shown ? {minHeight: 260} : undefined}>
            <span className={"tape"} />
            {body}
            {busy && <><span className={"scanline"} aria-hidden /><span className={"scanlabel"}><LoaderIcon className={"ic"} />{busy}</span></>}
        </div>
    );
}

export default function GlassSection({look, family, level, have, subscribe, onHold, onAsks, reduce}: {
    look: Look; family: string; level: Level; have: Set<string> | null;
    subscribe: (fn: (p: number) => void) => () => void; onHold: (held: boolean) => void;
    /** The asks on the glass right now, with today's counts, for the closing section's preview. */
    onAsks: (asks: Array<{key: string; name: string; n: number}>, family: string) => void; reduce: boolean;
}) {
    const [own, setOwn] = useState<ReadAd | null>(null);
    const [busy, setBusy] = useState<string | null>(null);
    const [hint, setHint] = useState("");
    const [pick, setPick] = useState<string | null>(null);
    const barRef = useRef<HTMLSpanElement>(null);
    const sectionRef = useRef<HTMLElement>(null);
    // Read after hydration: the server can't know the visitor's keyboard.
    const [keys, setKeys] = useState("Ctrl+V");
    useEffect(() => { if (/Mac|iPhone|iPad/.test(navigator.userAgent)) setKeys("⌘V"); }, []);

    const today = adFor(look.families[family], level);
    const shown: Shown | null = own ? {kind: "own", ad: own} : today ? {kind: "today", ad: today, family} : null;
    const asks: AdAsk[] = own ? own.asks : adAsks(today, look.skills);
    const ownFamily = own && look.families[own.family] ? own.family : "software_engineering";
    const selected = pick ?? (own ? ownFamily : family);
    const data = look.families[selected] ?? look.families[family];
    const rows = askRows(asks, data);
    const rare = !have ? rarest(rows) : null;
    const haveN = have ? rows.filter((r) => have.has(normSkill(r.key))).length : 0;

    useEffect(() => { onHold(Boolean(own || busy)); }, [own, busy, onHold]);
    const asksKey = rows.map((r) => `${r.key}:${r.n}`).join(",");
    useEffect(() => {
        onAsks(rows.map((r) => ({key: r.key, name: look.skills[r.key] ?? r.name, n: r.n})), selected);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [asksKey, selected]);
    useEffect(() => { setPick(null); }, [family, own]);
    useEffect(() => subscribe((p) => { if (barRef.current) barRef.current.style.width = `${own ? 0 : p * 100}%`; }), [subscribe, own]);

    const analyse = useCallback(async (paste: string) => {
        const body = pasteBody(paste);
        if ("text" in body && !body.text) return;
        setHint("");
        track("ad_pasted", {kind: "url" in body ? "url" : "text"});
        sectionRef.current?.scrollIntoView({behavior: reduce ? "auto" : "smooth", block: "start"});
        setBusy("url" in body ? G.readingLink : G.reading);
        try {
            setOwn(await readAd(body));
        } catch (e) {
            setHint(e instanceof AdError && e.status === 429 ? G.tooMany : "url" in body ? G.linkFailed : G.none);
        } finally {
            setBusy(null);
        }
    }, [reduce]);

    // ⌘V anywhere on the page reads the clipboard as a job ad, unless the visitor is typing somewhere.
    useEffect(() => {
        const onPaste = (e: ClipboardEvent) => {
            const target = e.target as HTMLElement | null;
            if (target?.closest?.("input, textarea, [contenteditable]")) return;
            const text = e.clipboardData?.getData("text");
            if (text?.trim()) { e.preventDefault(); void analyse(text); }
        };
        document.addEventListener("paste", onPaste);
        return () => document.removeEventListener("paste", onPaste);
    }, [analyse]);

    const pasteFromButton = async () => {
        try {
            const text = await navigator.clipboard.readText();
            if (!text.trim()) { setHint(G.emptyClipboard); return; }
            void analyse(text);
        } catch {
            setHint(G.pressToPaste(keys));
        }
    };

    const options = Object.keys(look.families).sort((a, b) => look.families[b].jobs - look.families[a].jobs);
    return (
        <section className={"blk"} id={"glass"} aria-label={G.chapter} ref={sectionRef}>
            <div className={"chapter on"}><span className={"n"}>02</span><h2>{G.chapter}</h2></div>
            <div className={"glass-hd"}>
                <div>
                    <p className={"sub"} style={{fontSize: 13}}>{G.lede}</p>
                </div>
                <div className={"pastewrap"}>
                    <Button variant={"outline"} className={"pastepill h-auto"} onClick={pasteFromButton}>
                        <ClipboardPasteIcon className={"size-4"} /> {G.paste} <kbd>{keys}</kbd>
                    </Button>
                    <span className={"hint"} aria-live={"polite"}>{hint}</span>
                </div>
            </div>
            <div className={"glass-grid"}>
                <div className={"adwrap"}>
                    <Paper shown={shown} names={look.skills} have={have} busy={busy} barRef={barRef} />
                    {own && (
                        <Button variant={"link"} className={"back h-auto"} onClick={() => { setOwn(null); setHint(""); }}>
                            <ChevronLeftIcon className={"size-4"} /> {G.back}
                        </Button>
                    )}
                </div>
                <div className={"adwrap"}>
                    <div className={"kick"}>{G.asksKick(rows.length)}</div>
                    <div className={"asks-hd"}>
                        <span>{G.howMany}</span>
                        <Select value={selected} onValueChange={(v) => setPick(String(v))}>
                            <SelectTrigger size={"sm"} className={"font-mono text-[12px]"} aria-label={"Job type"}>
                                <SelectValue>{(v: string) => FAMILY_LABEL[v] ?? v}</SelectValue>
                            </SelectTrigger>
                            <SelectContent>
                                {options.map((f) => (
                                    <SelectItem key={f} value={f}>
                                        {FAMILY_LABEL[f] ?? f} <span className={"ml-auto font-mono text-[12px] text-muted-foreground"}>{fmt(look.families[f].readable)}</span>
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                        <span>{G.nameEach} <span style={{color: "var(--orange)", margin: "0 4px"}}>/</span> {G.readToday(fmt(data.readable))}</span>
                    </div>
                    <div className={"pills"}>
                        {rows.length ? rows.map((r, i) => {
                            const state = have ? (have.has(normSkill(r.key)) ? "have" : "gap") : "";
                            return (
                                <span key={r.key} className={`pill ${r.kind === "opt" ? "opt" : ""} ${state} ${rare && r.key === rare.key ? "rarest" : ""}`}
                                      style={{animationDelay: reduce ? "0ms" : `${i * 35}ms`}}>
                                    <span className={"nm"}>{look.skills[r.key] ?? r.name}{r.kind === "opt" && <em>{G.optionalKey}</em>}</span>
                                    <span className={"ct"}>in <b>{r.n}</b> of {fmt(data.readable)}</span>
                                    <span className={"meter"}><i style={{width: `${Math.max(r.n ? 2 : 0, (r.n / Math.max(1, data.readable)) * 100)}%`}} /></span>
                                </span>
                            );
                        }) : <div className={"empty"}>{G.none}</div>}
                    </div>
                    <div className={"pkey"}>
                        <span><i />{G.required}</span><span><i className={"d"} />{G.optionalKey}</span>
                        {have && <><span><i className={"h"} />{G.onCv}</span><span><i className={"g"} />{G.notYet}</span></>}
                    </div>
                    <div className={"rare"}>
                        {have && rows.length > 0 ? <><span className={"lime"}>{G.haveOf(haveN, rows.length)}</span><span className={"note"}>{G.haveNote}</span></>
                            : rare ? <><span className={"lime"}>{G.rarest(look.skills[rare.key] ?? rare.name, rare.n, fmt(data.readable), FAMILY_LABEL[selected] ?? selected)}</span><span className={"note"}>{G.rarestNote}</span></> : null}
                    </div>
                </div>
            </div>
        </section>
    );
}
