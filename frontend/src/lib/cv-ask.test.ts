import {describe, expect, it, vi} from "vitest";

import {ApiError} from "@/lib/api";
import {Ask, ASK, askCount, checkFile, familyAskSkills, IDLE, MAX_BYTES, marketAskSkills, readingSteps, runUpload, scanError, ScanEvent, scanStep, ScanState, stickyShows} from "@/lib/cv-ask";
import {haveSet, Look} from "@/lib/landing/look";
import fixture from "@/lib/landing/look.fixture.json";
import {MarketBody} from "@/lib/market-pages";
import stories from "@/lib/market-story.fixture.json";

const entry = stories["entry-level-software"] as unknown as MarketBody;
const look = fixture as unknown as Look;
const ask = (skills = marketAskSkills(entry)): Ask => ({skills, what: "skills entry level software jobs name most", jobs: entry.readable, subject: "entry level software"});

describe("which skills the ask is about", () => {
    it("a market page asks about the 15 skills its jobs name most, broad ones only", () => {
        const skills = marketAskSkills(entry);
        expect(skills).toHaveLength(15);
        expect(skills[0]).toEqual({key: "python", name: entry.names.python ?? "python"});
        const any = skills.map((s) => entry.story.skills.find((x) => x.key === s.key)!);
        expect(any.every((s) => s.broad)).toBe(true);
        expect(any.map((s) => s.any)).toEqual([...any.map((s) => s.any)].sort((a, b) => b - a));
    });

    it("a page with fewer skills asks about what it has", () => {
        const few = {...entry, story: {...entry.story, skills: entry.story.skills.slice(0, 4)}};
        expect(marketAskSkills(few)).toHaveLength(4);
        const narrow = {...entry, story: {...entry.story, skills: entry.story.skills.slice(0, 3).map((s) => ({...s, broad: false}))}};
        expect(marketAskSkills(narrow).map((s) => s.key)).toEqual(entry.story.skills.slice(0, 3).map((s) => s.key));
    });

    it("the landing count asks about a job type's 10 most asked skills, in the count's order", () => {
        const backend = look.families.backend;
        const skills = familyAskSkills(backend, look.skills);
        expect(skills).toHaveLength(Math.min(10, Object.keys(backend.skills).length));
        const counts = skills.map((s) => backend.skills[s.key]);
        expect(counts).toEqual([...counts].sort((a, b) => b - a));
        expect(skills[0].name).toBe(look.skills[skills[0].key] ?? skills[0].key);
    });
});

describe("the count: k of N", () => {
    it("is a question mark before a scan", () => {
        const c = askCount(ask().skills, null);
        expect(c).toEqual({k: null, n: 15, mine: Array(15).fill(false)});
    });

    it("counts the scan's skills among the page's, by key or by name", () => {
        const skills = ask().skills;
        // "LLMs" is how a scan names the skill the count keys as "llm".
        const c = askCount(skills, haveSet(["Python", "TypeScript", "LLMs", "node.js", "Cobol"]));
        expect(c.n).toBe(15);
        expect(c.k).toBe(3);
        expect(skills.filter((_, i) => c.mine[i]).map((s) => s.key)).toEqual(["python", "typescript", "llm"]);
    });

    it("is zero of N, not a question mark, for a scan with none of them", () => {
        expect(askCount(ask().skills, haveSet(["Cobol"])).k).toBe(0);
    });
});

describe("one ask on screen at a time", () => {
    const base = {past: true, askInView: false, sheetOpen: false, scanning: false, answered: false};

    it("shows the sticky line once past the top, while nothing else asks", () => {
        expect(stickyShows(base)).toBe(true);
        expect(stickyShows({...base, past: false})).toBe(false);
    });

    it("steps aside for the page's own ask, the sheet and a running scan", () => {
        expect(stickyShows({...base, askInView: true})).toBe(false);
        expect(stickyShows({...base, sheetOpen: true})).toBe(false);
        expect(stickyShows({...base, scanning: true})).toBe(false);
    });

    it("hides once the question is answered", () => {
        expect(stickyShows({...base, answered: true})).toBe(false);
    });
});

describe("the sheet's states", () => {
    const run = (events: ScanEvent[], from: ScanState = IDLE) => events.reduce(scanStep, from);

    it("idle, reading, then the result", () => {
        const reading = run([{type: "start", kind: "upload", file: "cv.pdf"}]);
        expect(reading).toMatchObject({phase: "reading", found: false, file: "cv.pdf"});
        expect(run([{type: "found"}, {type: "done"}], reading)).toMatchObject({phase: "result", found: true});
    });

    it("a failure says why, and a new start clears it", () => {
        const failed = run([{type: "start", kind: "upload", file: "cv.pdf"}, {type: "failed", error: "nope"}]);
        expect(failed).toMatchObject({phase: "error", error: "nope"});
        expect(run([{type: "start", kind: "upload", file: "b.pdf"}], failed)).toMatchObject({phase: "reading", error: null});
        expect(run([{type: "reset"}], failed)).toEqual(IDLE);
    });

    it("a late answer never moves a finished scan", () => {
        const done = run([{type: "start", kind: "upload", file: null}, {type: "done"}]);
        expect(run([{type: "found"}], done)).toBe(done);
        expect(run([{type: "done"}], IDLE)).toBe(IDLE);
    });
});

describe("the reading steps move only on real answers", () => {
    const reading: ScanState = {...IDLE, phase: "reading", file: "cv.pdf"};
    const marks = (s: ScanState) => readingSteps(s, ask()).map((x) => x.mark);

    it("names what is compared, with the page's job count", () => {
        expect(readingSteps(reading, ask()).map((s) => s.label)).toEqual(["Read the PDF", "Find your skills", `Compare with ${entry.readable} jobs`]);
    });

    it("waits until the skills come back, then ticks reading and finding together", () => {
        expect(marks(reading)).toEqual(["now", "wait", "wait"]);
        expect(marks({...reading, found: true})).toEqual(["done", "done", "now"]);
        expect(marks({...reading, phase: "result", found: true})).toEqual(["done", "done", "done"]);
    });

    it("a result before the skills came back ticks everything at once", () => {
        expect(marks({...reading, phase: "result"})).toEqual(["done", "done", "done"]);
    });

    it("a rescan from kept skills has one step, no PDF", () => {
        expect(readingSteps({...reading, kind: "reuse"}, ask())).toEqual([{label: `Compare your kept skills with ${entry.readable} jobs`, mark: "now"}]);
    });
});

describe("a chosen file", () => {
    it("must be a PDF up to 10 MB", () => {
        expect(checkFile({name: "cv.pdf", type: "application/pdf", size: 200_000})).toBeNull();
        expect(checkFile({name: "cv.pdf", type: "", size: 200_000})).toBeNull();
        expect(checkFile({name: "cv.docx", type: "application/vnd.openxmlformats-officedocument.wordprocessingml.document", size: 9})).toMatch(/isn't a PDF/);
        expect(checkFile({name: "cv.pdf", type: "application/pdf", size: MAX_BYTES + 1})).toMatch(/over 10 MB/);
    });

    it("a failed scan is said in plain words", () => {
        expect(scanError(new ApiError("pdf_inspector exploded", 500))).toBe("We couldn't read this PDF. Try exporting it again.");
        expect(scanError(new ApiError("too big", 413))).toMatch(/over 10 MB/);
        expect(scanError(new ApiError("That isn't a PDF.", 415))).toBe(ASK.errors.notPdf);   // the server's own check
        expect(scanError(new Error("Analysis timed out. The API may be starting up, try again."))).toBe("That took too long. Try again in a minute.");
    });
});

describe("one upload scan, with a mocked API", () => {
    const pdf = new File(["%PDF-1.4"], "cv.pdf", {type: "application/pdf"});
    const deps = (analyze: () => Promise<unknown>, parse: () => Promise<unknown>) => {
        const events: ScanEvent[] = [];
        const d = {analyze, parse, dispatch: (e: ScanEvent) => events.push(e),
            onStart: vi.fn(), onParsed: vi.fn(), onResult: vi.fn(), onFailed: vi.fn()};
        return {d, events};
    };

    it("starts, ticks when the skills come back, and ends with the comparison", async () => {
        const {d, events} = deps(() => new Promise((r) => setTimeout(() => r({market: {}}), 5)), () => Promise.resolve({skills: ["Python"]}));
        await runUpload(pdf, d);
        expect(events.map((e) => e.type)).toEqual(["start", "found", "done"]);
        expect(d.onStart).toHaveBeenCalledOnce();
        expect(d.onParsed).toHaveBeenCalledWith({skills: ["Python"]});
        expect(d.onResult).toHaveBeenCalledWith({market: {}});
        expect(events.reduce(scanStep, IDLE)).toMatchObject({phase: "result"});
    });

    it("a failed comparison ends in plain words", async () => {
        const {d, events} = deps(() => Promise.reject(new ApiError("boom", 500)), () => new Promise(() => {}));
        await runUpload(pdf, d);
        expect(events.reduce(scanStep, IDLE)).toMatchObject({phase: "error", error: "We couldn't read this PDF. Try exporting it again."});
        expect(d.onFailed).toHaveBeenCalledOnce();
        expect(d.onResult).not.toHaveBeenCalled();
    });

    it("a file that isn't a PDF is never sent", async () => {
        const analyze = vi.fn(), parse = vi.fn();
        const {d, events} = deps(analyze, parse);
        await runUpload(new File(["x"], "cv.png", {type: "image/png"}), d);
        expect(analyze).not.toHaveBeenCalled();
        expect(parse).not.toHaveBeenCalled();
        expect(d.onStart).not.toHaveBeenCalled();
        expect(events).toEqual([{type: "failed", error: "That file isn't a PDF. Choose the PDF of your CV."}]);
    });
});

describe("the sheet's example", () => {
    it("counts out of the same total as the ask that opened it", () => {
        expect(ASK.sheet.example(10)).toMatchObject({have: 6, of: 10});
        expect(ASK.sheet.example(15)).toMatchObject({have: 9, of: 15});
        expect(ASK.sheet.example()).toMatchObject({have: 9, of: 15});     // no ask: the sheet opened from the header
    });
});
