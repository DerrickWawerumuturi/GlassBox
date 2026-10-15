import type {FailReason, REFUSALS} from "@/lib/analytics";
import {ApiError} from "@/lib/api";
import {type LookFamily, normSkill} from "@/lib/landing/look";
import type {MarketBody} from "@/lib/market-pages";

/*
 * The CV ask (docs/decisions/cv-ask.md): one "Compare your CV" button per
 * page (founder, 12 Oct 2026; the question with a blank count is gone),
 * a sheet that reads the CV and answers "9 of 15" about the skills the page
 * showed, and the page lit up with the answer. Everything here is pure, so it
 * is tested (cv-ask.test.ts): the words, which skills are compared, the count,
 * and the scan's states and steps.
 */

export interface AskSkill {key: string; name: string}

/** What a page asks about: its skills, and what they are, as a phrase ("skills entry level software jobs name most"). */
export interface Ask {
    skills: AskSkill[];
    what: string;
    /** The jobs the skills were counted from: those whose ads we read, not every job counted. */
    jobs: number;
    subject: string;
}

export const MAX_BYTES = 10 * 1024 * 1024;
const fmt = (n: number) => n.toLocaleString("en");

const EXAMPLE_CHIPS = [["Python", true], ["React", true], ["Go", false], ["SQL", true], ["Kubernetes", false]] as const;
const EXAMPLE = {have: EXAMPLE_CHIPS.filter(([, have]) => have).length, of: EXAMPLE_CHIPS.length, line: "skills on your CV", chips: EXAMPLE_CHIPS};

/** A story's ask: the skills it picked, which need not be the ones its jobs mention most. */
export const STORY_WHAT = "skills this story counts";

/** A market page's ask: the skills its jobs mention most. */
export const marketWhat = (subject: string) => `skills ${subject} jobs mention most`;

export const ASK = {
    compare: "Compare your CV",
    /** The question beside a market page's button (founder's yes, 15 Oct 2026: docs/local/copy-rewrite.html P13). */
    lead: (ask: Ask) => `Curious how many of the ${ask.skills.length} skills these jobs ask for most are already on your CV?`,
    sub: (ask: Ask) => `The ${ask.skills.length} ${ask.what}.`,
    count: "on your CV",
    reading: "Reading your CV. About a minute.",
    done: (k: number) => `${k} of these ${k === 1 ? "is" : "are"} on your CV`,
    doneLink: "See the jobs that ask for them",
    doneNote: "The charts above now mark yours in green.",
    sheet: {
        title: (ask: Ask | null) => (ask ? `How many of these ${ask.skills.length} are on your CV?` : "See where you stand"),
        /** The comparison is with the skills, not the jobs; the jobs are the ones whose ads we read. A story picks its skills, so it says so. */
        line: (ask: Ask | null) => !ask ? "We read the skills on your CV and compare them with the latest jobs."
            : ask.what === STORY_WHAT
                ? `We read the skills on your CV and compare them with the ${ask.skills.length} this story counts in ${fmt(ask.jobs)} ${ask.subject} jobs.`
                : `We read the skills on your CV and compare them with the ${ask.skills.length} that ${fmt(ask.jobs)} ${ask.subject} jobs mention most.`,
        exampleKick: "You'll see",
        exampleTag: "example",
        /** A made up result, always labelled "example": never the visitor's. The count is the chips' own, so it adds up. */
        example: EXAMPLE,
        choosePhone: "Choose your CV",
        drop: "Drop your CV here",
        or: "or",
        chooseDesk: "Choose a file",
        reuse: "Use last CV",
        orNew: "or choose a new one",
        /**
         * What happens to the CV, true for who is reading it (app/(public)/your-cv):
         * without an account nothing is kept on our servers; with one, the skills
         * read from the latest CV are, never the file.
         */
        trust: (signedIn: boolean) => [
            "Your PDF is deleted after reading.",
            "Its text goes to Groq, a US service, to read the skills.",
            signedIn ? "We keep the skills read from your latest CV, never the file. Delete them any time."
                : "Without an account, we keep nothing about you on our servers.",
        ],
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
        /** Past the promised minute, one plain line. It says what is true, not why: the wait can be the API waking or a slow job board. */
        waitLong: "Still reading. This one is taking more than a minute.",
        result: (k: number, n: number) => `${k} of ${n}`,
        resultLine: (ask: Ask) => `of the ${ask.skills.length} ${ask.what} are already on your CV.`,
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

/** When the reading steps add the line about a long wait: once the promised minute has passed. */
export const WAIT_LINE_SECONDS = 60;

/** Calls `onLong` once the wait passes WAIT_LINE_SECONDS. Returns the cancel, for when the scan ends first. */
export function waitClock(onLong: () => void, seconds = WAIT_LINE_SECONDS): () => void {
    const timer = setTimeout(onLong, seconds * 1000);
    return () => clearTimeout(timer);
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

type Refusal = (typeof REFUSALS)[number];

/** Why a chosen file is refused before anything is sent, as a kind; null when it can be read. */
export function fileProblem(file: {name: string; type: string; size: number}): Refusal | null {
    const pdf = file.type === "application/pdf" || (!file.type && /\.pdf$/i.test(file.name));
    if (!pdf) return "not_pdf";
    if (file.size > MAX_BYTES) return "too_big";
    return null;
}

/** Why a chosen file can't be read, in plain words; null when it can. */
export function checkFile(file: {name: string; type: string; size: number}): string | null {
    const problem = fileProblem(file);
    return problem === "not_pdf" ? ASK.errors.notPdf : problem === "too_big" ? ASK.errors.tooBig : null;
}

/**
 * Why a scan failed, as a kind for analytics: never the error's text. The
 * server answers an unreadable PDF and its own fault with the same 500, so
 * both are "server".
 */
export function failReason(error: unknown): FailReason {
    if (error instanceof ApiError) {
        if (error.status === 413) return "too_big";
        if (error.status === 415) return "not_pdf";
        if (error.status === 404 || error.status === 409) return "not_kept";
        return error.status >= 500 ? "server" : "other";
    }
    if (error instanceof Error && /timed out/i.test(error.message)) return "timeout";
    // fetch rejects with a TypeError when the request never reached the API.
    if (error instanceof TypeError) return "network";
    return "other";
}

/** A failed scan in plain words. */
export function scanError(error: unknown): string {
    if (error instanceof ApiError && error.status === 413) return ASK.errors.tooBig;
    if (error instanceof ApiError && error.status === 415) return ASK.errors.notPdf;
    if (error instanceof Error && /timed out/i.test(error.message)) return ASK.errors.slow;
    return ASK.errors.unreadable;
}

/**
 * One upload scan: the file checked first (nothing is sent when it fails;
 * `onRefused` says why, for analytics),
 * then both requests at once. The skills (`parse`) tick the first two steps;
 * the comparison (`analyze`) ends the scan. A failed `parse` only loses its
 * tick: the comparison alone decides whether the scan worked.
 */
export async function runUpload<A, C>(file: File, d: {
    analyze: (f: File) => Promise<A>; parse: (f: File) => Promise<C>;
    onStart: () => void; onParsed: (c: C) => void; onResult: (a: A) => void; onFailed: (message: string, reason: FailReason) => void;
    onRefused?: (reason: Refusal) => void; dispatch: (e: ScanEvent) => void;
}): Promise<void> {
    const problem = fileProblem(file);
    if (problem) { d.onRefused?.(problem); d.dispatch({type: "failed", error: checkFile(file)!}); return; }
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
        d.onFailed(message, failReason(e));
        d.dispatch({type: "failed", error: message});
    }
}
