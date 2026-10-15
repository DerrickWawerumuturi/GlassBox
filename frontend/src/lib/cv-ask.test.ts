import {describe, expect, it, vi} from "vitest";

import {ApiError} from "@/lib/api";
import {Ask, ASK, askCount, checkFile, failReason, familyAskSkills, fileProblem, IDLE, MAX_BYTES, marketAskSkills, marketWhat, readingSteps, runUpload, scanError, ScanEvent, scanStep, ScanState, STORY_WHAT, waitClock, WAIT_LINE_SECONDS} from "@/lib/cv-ask";
import {haveSet, Look} from "@/lib/landing/look";
import fixture from "@/lib/landing/look.fixture.json";
import {MarketBody} from "@/lib/market-pages";
import stories from "@/lib/market-story.fixture.json";

const entry = stories["entry-level-software"] as unknown as MarketBody;
const look = fixture as unknown as Look;
const ask = (skills = marketAskSkills(entry)): Ask => ({skills, what: marketWhat("entry level software"), jobs: entry.readable, subject: "entry level software"});

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
            onStart: vi.fn(), onParsed: vi.fn(), onResult: vi.fn(), onFailed: vi.fn(), onRefused: vi.fn()};
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
        expect(d.onFailed).toHaveBeenCalledWith("We couldn't read this PDF. Try exporting it again.", "server");
        expect(d.onResult).not.toHaveBeenCalled();
    });

    it("a file that isn't a PDF is never sent", async () => {
        const analyze = vi.fn(), parse = vi.fn();
        const {d, events} = deps(analyze, parse);
        await runUpload(new File(["x"], "cv.png", {type: "image/png"}), d);
        expect(analyze).not.toHaveBeenCalled();
        expect(parse).not.toHaveBeenCalled();
        expect(d.onStart).not.toHaveBeenCalled();
        expect(d.onRefused).toHaveBeenCalledWith("not_pdf");
        expect(events).toEqual([{type: "failed", error: "That file isn't a PDF. Choose the PDF of your CV."}]);
    });
});

describe("the sheet's example", () => {
    it("adds up: its count is the chips it shows", () => {
        const e = ASK.sheet.example;
        expect(e.of).toBe(e.chips.length);
        expect(e.have).toBe(e.chips.filter(([, have]) => have).length);
        expect(`${e.have} of ${e.of}`).toBe("3 of 5");
    });
});

describe("the sheet's words", () => {
    it("names which jobs the skills were counted from", () => {
        // The comparison is with the skills, not the jobs (copy rewrite P14, 15 Oct 2026).
        expect(ASK.sheet.line(ask())).toBe(`We read the skills on your CV and compare them with the 15 that ${entry.readable} entry level software jobs mention most.`);
        expect(ASK.sheet.title(ask())).toBe("How many of these 15 are on your CV?");
        expect(ASK.sheet.resultLine(ask())).toBe("of the 15 skills entry level software jobs mention most are already on your CV.");
        // A story picks its skills, so its sheet never says they are the ones mentioned most.
        const story: Ask = {...ask(ask().skills.slice(0, 11)), what: STORY_WHAT};
        expect(ASK.sheet.line(story)).toBe(`We read the skills on your CV and compare them with the 11 this story counts in ${entry.readable} entry level software jobs.`);
        expect(ASK.sheet.line(null)).toBe("We read the skills on your CV and compare them with the latest jobs.");
    });

    it("asks a market page's question beside its button, with the count it is about", () => {
        expect(ASK.lead(ask())).toBe("Curious how many of the 15 skills these jobs ask for most are already on your CV?");
    });

    it("says nothing is kept to someone without an account", () => {
        const lines = ASK.sheet.trust(false).join(" ");
        expect(lines).toContain("Your PDF is deleted after reading.");
        expect(lines).toContain("Groq, a US service");
        expect(lines).toContain("Without an account, we keep nothing about you on our servers.");
        expect(lines).not.toMatch(/we keep the skills/i);
    });

    it("says what is kept to someone signed in: the skills, never the file", () => {
        const lines = ASK.sheet.trust(true).join(" ");
        expect(lines).toContain("Your PDF is deleted after reading.");
        expect(lines).toContain("We keep the skills read from your latest CV, never the file. Delete them any time.");
        expect(lines).not.toMatch(/keep nothing/i);
    });
});

describe("the long wait line", () => {
    it("shows once the promised minute has passed, and never after the scan ended", () => {
        vi.useFakeTimers();
        try {
            const onLong = vi.fn();
            waitClock(onLong);
            vi.advanceTimersByTime(WAIT_LINE_SECONDS * 1000 - 1);
            expect(onLong).not.toHaveBeenCalled();
            vi.advanceTimersByTime(1);
            expect(onLong).toHaveBeenCalledOnce();

            const ended = vi.fn();
            const cancel = waitClock(ended);
            vi.advanceTimersByTime(30_000);
            cancel();
            vi.advanceTimersByTime(60_000);
            expect(ended).not.toHaveBeenCalled();
        } finally {
            vi.useRealTimers();
        }
    });

    it("waits for the minute the sheet promises", () => {
        expect(WAIT_LINE_SECONDS).toBe(60);
        expect(ASK.sheet.fineDesk).toMatch(/about a minute/);
        expect(ASK.sheet.waitLong).toBe("Still reading. This one is taking more than a minute.");
    });
});

describe("why a file or a scan failed, as a kind", () => {
    it("a refused file says which rule it broke", () => {
        expect(fileProblem({name: "cv.docx", type: "application/msword", size: 9})).toBe("not_pdf");
        expect(fileProblem({name: "cv.pdf", type: "application/pdf", size: MAX_BYTES + 1})).toBe("too_big");
        expect(fileProblem({name: "cv.pdf", type: "application/pdf", size: 9})).toBeNull();
    });

    it("a failed scan is a timeout, the server, the network or the file", () => {
        expect(failReason(new Error("Analysis timed out. The API may be starting up, try again."))).toBe("timeout");
        expect(failReason(new ApiError("Something went wrong", 500))).toBe("server");
        expect(failReason(new ApiError("too big", 413))).toBe("too_big");
        expect(failReason(new ApiError("not a PDF", 415))).toBe("not_pdf");
        expect(failReason(new ApiError("No CV kept yet", 404))).toBe("not_kept");
        expect(failReason(new TypeError("Failed to fetch"))).toBe("network");
        expect(failReason("??")).toBe("other");
    });
});
