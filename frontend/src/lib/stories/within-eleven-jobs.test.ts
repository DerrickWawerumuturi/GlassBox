import {createElement} from "react";
import {renderToStaticMarkup} from "react-dom/server";
import {describe, expect, it, vi} from "vitest";

// The CV ask's sheet and scan need the app's stores; the story's words are what is tested here.
vi.mock("@/components/landing/useHave", () => ({useHave: () => null}));
vi.mock("@/components/cv-ask/useCvScan", () => ({useCvScan: () => ({open: vi.fn(), isOpen: false, scanning: false, sheet: null})}));

import {withinElevenJobsCover} from "@/components/stories/covers/within-eleven-jobs";
import WithinElevenJobs from "@/components/stories/within-eleven-jobs/WithinElevenJobs";
import {LANGS, LEVELS, SHIPS, TOP, YEARS} from "@/components/stories/within-eleven-jobs/yards";
import {ELEVEN, gap, WITHIN_ELEVEN_JOBS} from "./within-eleven-jobs";

/*
 * Within eleven jobs' numbers are one week's (within-eleven-jobs.ts). These
 * catch a refresh that breaks them: a count over its total, a sum that no
 * longer holds, a share that doesn't round from its count, or a sentence the
 * story writes that the new numbers no longer bear out.
 */

const pct = (n: number, of: number) => Math.round((100 * n) / of);
const html = () => renderToStaticMarkup(createElement(WithinElevenJobs, {fonts: ""})).replace(/<!-- -->/g, "").replace(/&#x27;/g, "'");
const E = ELEVEN;

describe("Within eleven jobs' numbers", () => {
    it("never count more jobs than there are", () => {
        expect(E.readable).toBeLessThanOrEqual(E.jobs);
        for (const c of [...E.top, ...E.languages]) expect(c.jobs, c.name).toBeLessThanOrEqual(E.readable);
        for (const z of E.zones) expect(z.jobs, z.name).toBeLessThanOrEqual(E.readable);
        expect(E.named.twoOrMore).toBeLessThanOrEqual(E.named.any);
        expect(E.named.any).toBeLessThanOrEqual(E.readable);
        expect(E.internships.jobs).toBeLessThanOrEqual(E.levels.junior);
        expect(E.largest.jobs).toBeLessThanOrEqual(E.jobs);
        expect(E.remote.jobs).toBeLessThanOrEqual(E.jobs);
        expect(E.seniorJobs).toBeLessThanOrEqual(E.levels.senior);
    });

    it("hold the sums the page writes out or draws", () => {
        expect(E.top[0].jobs - E.top[2].jobs).toBe(11);
        expect(E.readable - E.named.any).toBe(206);
        const three = E.years.bands.filter((b) => b.from >= 3).map((b) => b.jobs);
        expect(three).toEqual([55, 155, 68]);
        expect(three.reduce((a, b) => a + b, 0)).toBe(278);
        expect(E.years.bands.reduce((n, b) => n + b.jobs, 0)).toBe(E.years.stated);
        expect(E.years.stated + E.years.unstated).toBe(E.jobs);
        expect(E.levels.senior + E.levels.junior + E.levels.mid + E.levels.unstated).toBe(E.jobs);
        expect(E.places.us + E.places.elsewhere + E.places.unknown).toBe(E.jobs);
    });

    it("round every share from its count where the page gives both", () => {
        for (const c of [...E.top, ...E.languages]) expect([c.name, c.share]).toEqual([c.name, pct(c.jobs, E.readable)]);
        expect(E.internships.share).toBe(pct(E.internships.jobs, E.jobs));
        expect(E.remote.share).toBe(pct(E.remote.jobs, E.jobs));
        // The zones' first bays are the stacked skills: their painted share is the stack's.
        expect(E.zones[0].skills.slice(0, 2).map((k) => k.share)).toEqual([E.top[0].share, E.top[2].share]);
    });

    it("quote on the doors only titles whose years sit in some band", () => {
        for (const d of E.doors) {
            if (d.years !== null) expect(E.years.bands.some((b) => d.years! >= b.from && (b.to === null || d.years! <= b.to)), d.title).toBe(true);
        }
        expect(E.doors.length).toBeLessThanOrEqual(E.listed);
    });
});

describe("the sentences the numbers must bear out", () => {
    it("'Within eleven jobs': the title's number is first minus third", () => {
        expect(gap()).toBe(11);
        expect(WITHIN_ELEVEN_JOBS.title).toBe("Within eleven jobs");
    });

    it("'there is no leader': the top three stand within one layer of 12, in that order", () => {
        expect(E.top[0].jobs).toBeGreaterThanOrEqual(E.top[1].jobs);
        expect(E.top[1].jobs).toBeGreaterThanOrEqual(E.top[2].jobs);
        expect(gap()).toBeLessThan(12);
    });

    it("'stand at the same height', 'the jobs between them sit at the back of the top layer', 'one row short'", () => {
        const layers = (n: number) => Math.ceil(n / 12), [a, b, c] = E.top.map((t) => t.jobs);
        expect(layers(a)).toBe(layers(b));
        expect(layers(c)).toBe(layers(a) - 1);
        // The second stack's top layer fills its front row (6), so the difference stands behind it.
        expect(b % 12).toBeGreaterThanOrEqual(6);
    });

    it("'Python is the one language among the three'", () => {
        const langs = new Set(E.languages.map((l) => l.key));
        expect(E.top.filter((t) => langs.has(t.key)).map((t) => t.name)).toEqual(["Python"]);
        expect(E.languages[0].key).toBe("python");
    });

    it("'One of the seven languages is named more often across all jobs than in senior ones: PowerShell'", () => {
        const more = E.languages.filter((l) => l.share > l.senior!);
        expect(more.map((l) => l.name)).toEqual(["PowerShell"]);
        expect(more.length).toBe(E.leanAll);
        expect(E.languages[0].share).toBeLessThan(E.languages[0].senior!);
    });

    it("'After the three stacks come AWS, at 39%, and CI/CD, at 38%'", () => {
        const aws = E.zones[1].skills[0], cicd = E.zones[0].skills[2];
        expect([aws.name, cicd.name]).toEqual(["AWS", "CI/CD"]);
        expect(aws.share).toBeGreaterThan(cicd.share);
        expect(cicd.share).toBeLessThan(E.top[2].share);
    });

    it("'the fewest of the five pages we count': DevOps has the fewest internships", () => {
        for (const o of E.otherInternships) expect([o.subject, o.jobs > E.internships.jobs]).toEqual([o.subject, true]);
    });

    it("'5 to 7 years is the most common ask', and the yards stand tallest first", () => {
        expect(Math.max(...E.years.bands.map((b) => b.jobs))).toBe(E.years.bands.find((b) => b.from === 5)!.jobs);
        for (const y of [LANGS, LEVELS, YEARS, SHIPS]) {
            const n = y.bays.map((b) => b.n);
            expect(n, y.id).toEqual([...n].sort((a, b) => b - a));
        }
        expect(TOP.bays.map((b) => b.n)).toEqual(E.top.map((t) => t.jobs));
    });
});

describe("the story as rendered", () => {
    const h = html();

    it("says the week it counts near the top, fixed to it, and links the live page", () => {
        const top = h.slice(0, h.indexOf("Past Kubernetes"));
        expect(top).toContain("By the Glassbox team · the week of 12 October 2026");
        expect(top).toContain("This story keeps to one week, 12 October 2026.");
        expect(top).toMatch(/<a href="\/market\/devops">The DevOps page<\/a> starts a new count every Monday/);
    });

    it("dates every source line with the week", () => {
        const sources = h.match(/Source: Glassbox count, week of [^·]*·/g) ?? [];
        expect(sources.length).toBe(6);
        for (const s of sources) expect(s).toBe("Source: Glassbox count, week of 12 October 2026 ·");
    });

    it("writes the key sentences from the numbers", () => {
        expect(h).toContain("At the top of DevOps jobs there is no leader. Terraform / IaC, Python and Kubernetes are named in 248, 246 and 237 of the 567 job ads we read.");
        expect(h).toContain("248 minus 237 is 11, the number of jobs between first and third. Eleven jobs is less than one row of containers.");
        expect(h).toContain("The two jobs between them sit at the back of the top layer. Kubernetes is one row short.");
        expect(h).toContain("567 minus 361 leaves 206 that name none.");
        expect(h).toContain("One of the seven languages is named more often across all 567 jobs than in the 369 senior ones: PowerShell, 8% against 6%.");
        expect(h).toContain("That is the fewest of the five pages we count: 238 of the 561 entry level software jobs are internships, 211 of the 2,781 software engineering jobs, 41 of the 569 AI jobs, 27 of the 351 machine learning jobs.");
        expect(h).toContain("55 plus 155 plus 68 is 278: of the 302 that state a number, 278 ask for three years or more. 24 ask for 0 to 2.");
        expect(h).toContain("Cloudflare has the most, 27.");
    });

    it("reads every yard aloud, and the first drive's readout is in the HTML", () => {
        expect(h).toContain(`aria-label="${TOP.label}"`);
        expect(TOP.label).toContain("Terraform / IaC: 248 of 567 DevOps jobs, 44%. Python: 246 of 567, 43%. Kubernetes: 237 of 567, 42%.");
        expect(YEARS.label).toContain("Of the 302 that state a number: 155 ask for 5 to 7 years, 68 for 8 or more, 55 for 3 to 4, 24 for 0 to 2.");
        expect(h).toContain("<b>Terraform / IaC</b> is named in 248 of the 567 DevOps jobs we could read, 44%.");
        expect(h).toContain("Yard plan: the share of the 567 DevOps jobs we could read that name each skill.");
    });

    it("ends with the question, the CV button and how we counted, scope included", () => {
        expect(h).toContain("Curious how many of these skills are already on your CV?");
        // After the ask, the week once more in one short line; the fold says what "read" meant (copy rewrite S2, S9).
        expect(h).toMatch(/One week, 12 October 2026\. <a href="\/market\/devops">The DevOps page<\/a> counts again on Monday\./);
        expect(h).toContain("We look for about 250 named skills, by fixed rules, in the 567 ads long enough to read. The other 4 were too short.");
        expect(h).not.toMatch(/stays fixed to it|the live page|Skills are matched against/);
        expect(h).toMatch(/<button[^>]*class="[^"]*\bpeek\b[^"]*peek-button[^"]*"[^>]*>(?:<svg[^>]*>[\s\S]*?<\/svg>)?Compare your CV<\/button>/);
        expect(h).toContain("This page counts the DevOps jobs: titles that name DevOps");
        expect(h).toContain("What we can't see:");
    });

    it("draws the cover from the same numbers", () => {
        const svg = withinElevenJobsCover();
        for (const n of [">248<", ">246<", ">237<", "248 of 567", "week of 12 October 2026"]) expect(svg).toContain(n);
    });

    it("gives the hub its card line from the numbers", () => {
        expect(WITHIN_ELEVEN_JOBS.card).toBe("Terraform / IaC, Python and Kubernetes are named in 248, 246 and 237 of the 567 DevOps job ads we read.");
    });
});
