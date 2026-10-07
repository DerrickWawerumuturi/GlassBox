import {TRUST} from "@/components/landing/copy";
import {ApiError} from "@/lib/api";
import {type LookFamily, normSkill} from "@/lib/landing/look";
import type {MarketBody} from "@/lib/market-pages";

/*
 * The CV ask as a question (docs/decisions/cv-ask.md; the founder's pick,
 * docs/local/cv-ask-prototype.html, 7 Oct 2026): "How many of these are on
 * your CV?" over the skills a page just showed, then a sheet that reads the
 * CV and answers "9 of 15". Everything here is pure, so it is tested
 * (cv-ask.test.ts): the words, which skills are asked about, the count, the
 * one ask on screen rule, and the scan's states and steps.
 */

export interface AskSkill {key: string; name: string}

/** What a page asks about: its skills, and what they are, as a phrase ("skills entry level software jobs name most"). */
export interface Ask {
    skills: AskSkill[];
    what: string;
    /** The jobs the skills were counted from, for "compare them with 135 entry level software jobs". */
    jobs: number;
    subject: string;
}

export const MAX_BYTES = 10 * 1024 * 1024;
const fmt = (n: number) => n.toLocaleString("en");

export const ASK = {
    question: "How many of these are on your CV?",
    sub: (ask: Ask) => `The ${ask.skills.length} ${ask.what}.`,
    count: "on your CV",
    cta: "Find out",
    small: "About a minute. No account.",
    reading: "Reading your CV. About a minute.",
    done: (k: number) => `${k} of these ${k === 1 ? "is" : "are"} on your CV`,
    doneLink: "See the jobs that ask for them",
    doneNote: "The charts above now mark yours in green.",
    /** The landing page's count card: one line, following the job type picked. */
    line: (ask: Ask) => `of the ${ask.skills.length} ${ask.what} are on your CV.`,
    sheet: {
        title: (ask: Ask | null) => (ask ? "How many are on your CV?" : "See where you stand"),
        line: (ask: Ask | null) => ask
            ? `We read your CV for skills and compare them with ${fmt(ask.jobs)} ${ask.subject} jobs.`
            : "We read your CV for skills and compare them with today's jobs.",
        exampleKick: "You'll see",
        exampleTag: "example",
        /**
         * Made up numbers, always labelled "example": never the visitor's. Out of
         * the same total as the ask that opened the sheet ("? of 10" shows "6 of 10").
         */
        example: (of = 15) => ({have: Math.round(of * 0.6), of, line: "skills on your CV",
            chips: [["Python", true], ["React", true], ["Go", false], ["SQL", true], ["Kubernetes", false]] as const}),
        choosePhone: "Choose your CV",
        drop: "Drop your CV here",
        or: "or",
        chooseDesk: "Choose a file",
        reuse: "Use last CV",
        orNew: "or choose a new one",
        trust: TRUST,
        fine: "PDF, up to 10 MB",
        fineDesk: "PDF, up to 10 MB · about a minute",
        what: {href: "/your-cv", label: "What happens to your CV"},
        reading: "Reading your CV",
        comparing: "Comparing your skills",
        steps: (ask: Ask | null) => ["Read the PDF", "Find your skills", ask ? `Compare with ${fmt(ask.jobs)} jobs` : "Compare with today's jobs"],
        reuseStep: (ask: Ask | null) => (ask ? `Compare your kept skills with ${fmt(ask.jobs)} jobs` : "Compare your kept skills with today's jobs"),
        now: "now",
        doneStep: "done",
        deleted: "The file is deleted once it's read.",
        result: (k: number, n: number) => `${k} of ${n}`,
        resultLine: (ask: Ask) => `of the ${ask.what} are on your CV.`,
        seeThem: "See them",
        keep: "Keep them",
        keepLine: " with a free account, to compare again later.",
    },
    errors: {
        notPdf: "That file isn't a PDF. Choose the PDF of your CV.",
        tooBig: "That PDF is over 10 MB. Try a smaller export.",
        unreadable: "We couldn't read this PDF. Try exporting it again.",
        slow: "That took too long. Try again in a minute.",
    },
} as const;

export type StickyContext = {kind: "page"; n: number} | {kind: "count"; ask: Ask} | {kind: "ad"; n: number};

/**
 * The sticky line, as its bold lead and the rest: a market page's skills
 * ("? of 15 skills here on your CV"), or on the landing page what the visitor
 * last looked at, the count's job type or an ad.
 */
export function stickyLine(ctx: StickyContext): [string, string] {
    if (ctx.kind === "page") return [`? of ${ctx.n}`, "skills here on your CV"];
    if (ctx.kind === "ad") return [`? of the ${ctx.n}`, "asks in this ad are on your CV"];
    return [`? of the ${ctx.ask.skills.length}`, `${ctx.ask.what} are on your CV`];
}

// ------------------------------------------------------------ which skills

/**
 * A market page's ask: the skills its jobs name most, only those named by
 * jobs at enough employers (the breadth rule, so one company's hiring is
 * never a headline). A page without any broad skill asks about the most
 * named ones. Fifteen, or what the page has.
 */
export function marketAskSkills(page: MarketBody, limit = 15): AskSkill[] {
    const sorted = [...page.story.skills].sort((a, b) => b.any - a.any);
    const broad = sorted.filter((s) => s.broad);
    return (broad.length ? broad : sorted).slice(0, limit).map((s) => ({key: s.key, name: page.names[s.key] ?? s.key}));
}

/** The landing count's ask: a job type's ten most asked skills, or what it has. Same order as the count. */
export function familyAskSkills(data: LookFamily, names: Record<string, string>, limit = 10): AskSkill[] {
    return Object.entries(data.skills).sort((a, b) => b[1] - a[1]).slice(0, limit).map(([key]) => ({key, name: names[key] ?? key}));
}

/** How many of the asked skills are on the CV: k of n, and which. Before a scan, k is null. */
export function askCount(skills: AskSkill[], have: Set<string> | null): {k: number | null; n: number; mine: boolean[]} {
    const mine = skills.map((s) => Boolean(have && (have.has(normSkill(s.key)) || have.has(normSkill(s.name)))));
    return {k: have ? mine.filter(Boolean).length : null, n: skills.length, mine};
}

// ------------------------------------------------------------ one ask at a time

/**
 * The sticky line shows only when nothing else is asking: the page's own ask
 * is out of view, the sheet is closed, no scan is running, and there is no
 * answer yet. After a scan it hides rather than repeating the result: the
 * answer sits where the question was asked and in the figures, and a bar
 * that stays after the question is answered is pressure without a purpose.
 */
export function stickyShows(s: {past: boolean; askInView: boolean; sheetOpen: boolean; scanning: boolean; answered: boolean}): boolean {
    return s.past && !s.askInView && !s.sheetOpen && !s.scanning && !s.answered;
}

// ------------------------------------------------------------ the scan

export type Phase = "idle" | "reading" | "result" | "error";
export interface ScanState {phase: Phase; kind: "upload" | "reuse"; found: boolean; file: string | null; error: string | null}
export type ScanEvent =
    | {type: "start"; kind: "upload" | "reuse"; file: string | null}
    | {type: "found"} | {type: "done"} | {type: "failed"; error: string} | {type: "reset"};

export const IDLE: ScanState = {phase: "idle", kind: "upload", found: false, file: null, error: null};

/** The sheet's states. Steps move only on events the browser really sees; a late answer never moves a finished scan. */
export function scanStep(state: ScanState, event: ScanEvent): ScanState {
    switch (event.type) {
        case "start": return {phase: "reading", kind: event.kind, found: false, file: event.file, error: null};
        case "found": return state.phase === "reading" ? {...state, found: true} : state;
        case "done": return state.phase === "reading" ? {...state, phase: "result", found: true} : state;
        case "failed": return {...state, phase: "error", error: event.error};
        case "reset": return IDLE;
    }
}

export type StepMark = "done" | "now" | "wait";

/**
 * The reading steps and their marks. The scan is two requests: /cv/parse reads
 * the PDF and finds the skills, /analyze compares them with the jobs. The
 * server says nothing in between, so "Read the PDF" and "Find your skills"
 * tick together when the skills come back, and "Compare" ticks when the
 * comparison does. Until then the first open step says "now", never more.
 */
export function readingSteps(state: ScanState, ask: Ask | null): Array<{label: string; mark: StepMark}> {
    const done = state.phase === "result";
    if (state.kind === "reuse") return [{label: ASK.sheet.reuseStep(ask), mark: done ? "done" : "now"}];
    const [read, find, compare] = ASK.sheet.steps(ask);
    const found = state.found || done;
    return [
        {label: read, mark: found ? "done" : "now"},
        {label: find, mark: found ? "done" : "wait"},
        {label: compare, mark: done ? "done" : found ? "now" : "wait"},
    ];
}

/** Why a chosen file can't be read, before anything is sent; null when it can. */
export function checkFile(file: {name: string; type: string; size: number}): string | null {
    const pdf = file.type === "application/pdf" || (!file.type && /\.pdf$/i.test(file.name));
    if (!pdf) return ASK.errors.notPdf;
    if (file.size > MAX_BYTES) return ASK.errors.tooBig;
    return null;
}

/** A failed scan in plain words. */
export function scanError(error: unknown): string {
    if (error instanceof ApiError && error.status === 413) return ASK.errors.tooBig;
    if (error instanceof ApiError && error.status === 415) return ASK.errors.notPdf;
    if (error instanceof Error && /timed out/i.test(error.message)) return ASK.errors.slow;
    return ASK.errors.unreadable;
}

/**
 * One upload scan: the file checked first (nothing is sent when it fails),
 * then both requests at once. The skills (`parse`) tick the first two steps;
 * the comparison (`analyze`) ends the scan. A failed `parse` only loses its
 * tick: the comparison alone decides whether the scan worked.
 */
export async function runUpload<A, C>(file: File, d: {
    analyze: (f: File) => Promise<A>; parse: (f: File) => Promise<C>;
    onStart: () => void; onParsed: (c: C) => void; onResult: (a: A) => void; onFailed: (message: string) => void;
    dispatch: (e: ScanEvent) => void;
}): Promise<void> {
    const invalid = checkFile(file);
    if (invalid) { d.dispatch({type: "failed", error: invalid}); return; }
    d.dispatch({type: "start", kind: "upload", file: file.name});
    d.onStart();
    try {
        const analysis = d.analyze(file);
        d.parse(file).then((cv) => { d.onParsed(cv); d.dispatch({type: "found"}); })
            .catch((e) => console.error("CV breakdown error:", e));
        const result = await analysis;
        d.onResult(result);
        d.dispatch({type: "done"});
    } catch (e) {
        const message = scanError(e);
        d.onFailed(message);
        d.dispatch({type: "failed", error: message});
    }
}
