import {describe, expect, it} from "vitest";

import {METHOD_PAGE} from "./method-copy";
import {
    contrastLead, copyText, copyUrl, countLine, ENTRY_COPY, entryForPage, EntryPage, headlineFacts, levelLabel,
} from "./market-page";

const PAGE: EntryPage = {
    taken_at: "2026-10-07T14:32:14Z", profiler_version: "requirements-v5",
    families: ["software_engineering", "backend", "frontend", "full_stack", "mobile"],
    min_readable: 100, publishable: true, jobs: 164, readable: 163, employers: 73, internships: 50, remote: 33,
    places: {us: 82, elsewhere: 57, unknown: 25}, largest_employer: {name: "Stripe", jobs: 18},
    skills: [{key: "python", any: 68, required: 56, senior_any: 487, senior_required: 428}],
    contrast: [
        {key: "python", any: 68, senior_any: 487},
        {key: "javascript", any: 37, senior_any: 123},
        {key: "distributed systems", any: 27, senior_any: 464},
    ],
    senior: {jobs: 1486, readable: 1478}, required_median: {entry: 5, senior: 5},
    titles: [["Engineering Intern", "Acme", "intern", null]],
    names: {python: "Python", javascript: "JavaScript", "distributed systems": "Distributed systems"},
};

describe("the entry level page's words", () => {
    it("says the count, the date and what it counts", () => {
        expect(countLine(PAGE)).toBe("On 7 October 2026 we counted 164 entry level software jobs at 73 employers, each job once, however many boards or cities list it.");
    });

    it("leads with the skill named most, then one leaning each way", () => {
        expect(headlineFacts(PAGE)).toEqual([
            "68 of the 163 entry level software jobs we counted on 7 October 2026 name Python.",
            "37 of the 163 entry level software jobs we counted on 7 October 2026 name JavaScript. So do 123 of the 1,478 senior ones.",
            "27 of the 163 entry level software jobs we counted on 7 October 2026 name Distributed systems. So do 464 of the 1,478 senior ones.",
        ]);
    });

    it("shows no share under the 100 job rule: only the count", () => {
        expect(headlineFacts({...PAGE, publishable: false, readable: 80})).toEqual([countLine(PAGE)]);
    });

    it("states the chart's finding with both shares", () => {
        expect(contrastLead(PAGE)).toBe("Python: 42% of entry level jobs, 33% of senior ones");
    });

    it("copies the sentence and a tagged link to the page", () => {
        const url = copyUrl();
        expect(url).toMatch(/\/market\/entry-level-software\?utm_source=copy&utm_campaign=entry-level-software$/);
        expect(copyText("Python is named in 68 jobs.", url)).toBe(`Python is named in 68 jobs. ${url}`);
    });

    it("labels a title by its level, or by the years it asks for", () => {
        expect(levelLabel("intern", null)).toBe("Internship");
        expect(levelLabel("junior", 2)).toBe("Junior");
        expect(levelLabel("mid", 2)).toBe("Asks 2 years");
        expect(levelLabel("mid", 1)).toBe("Asks 1 year");
        expect(levelLabel("unknown", 0)).toBe("No experience asked");
        expect(levelLabel("unknown", null)).toBeNull();
    });
});

describe("entryForPage", () => {
    const ok = (body: unknown) => (async () => new Response(JSON.stringify(body), {status: 200})) as unknown as typeof fetch;
    const down = (async () => new Response("{}", {status: 503})) as unknown as typeof fetch;

    it("returns the page's counts", async () => {
        expect(await entryForPage(100, ok(PAGE), false)).toEqual(PAGE);
    });

    it("renders without them at build time, and keeps the last page during a revalidation", async () => {
        expect(await entryForPage(100, down, false)).toBeNull();
        expect(await entryForPage(100, ok({detail: "odd"}), false)).toBeNull();
        await expect(entryForPage(100, down, true)).rejects.toThrow();
    });
});

// CLAUDE.md section 1 and 2, checked on every line these pages say.
const lines = (value: unknown): string[] => typeof value === "string" ? [value]
    : Array.isArray(value) ? value.flatMap(lines)
    : value && typeof value === "object" ? Object.values(value).flatMap(lines)
    : typeof value === "function" ? [String(call(value as (...a: unknown[]) => unknown))] : [];

/** A copy function, called with whichever sample arguments it takes. */
function call(fn: (...a: unknown[]) => unknown): unknown {
    for (const args of [[1, 2, 3], [PAGE.places], [PAGE.largest_employer, 164]]) {
        try { return fn(...args); } catch { /* the next shape */ }
    }
    throw new Error(`no sample arguments fit ${fn}`);
}

describe("copy rules on the market page and /method", () => {
    const all = [...lines(ENTRY_COPY), ...lines(METHOD_PAGE), ...headlineFacts(PAGE)];

    it("never advises, never says postings, never uses an em dash or an exclamation mark", () => {
        const banned = /\b(?:you should|learn next|start here|best next step|recommended|postings?|missing|gaps?)\b|—|!/i;
        expect(all.filter((l) => banned.test(l))).toEqual([]);
    });

    it("keeps the button to three words", () => {
        expect(ENTRY_COPY.cta.split(" ").length).toBeLessThanOrEqual(3);
    });
});
