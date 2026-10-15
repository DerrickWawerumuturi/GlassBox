import {createElement} from "react";
import {renderToStaticMarkup} from "react-dom/server";
import {describe, expect, it, vi} from "vitest";

// The CV ask's sheet and scan need the app's stores; the story's words are what is tested here.
vi.mock("@/components/landing/useHave", () => ({useHave: () => null}));
vi.mock("@/components/cv-ask/useCvScan", () => ({useCvScan: () => ({open: vi.fn(), isOpen: false, scanning: false, sheet: null})}));

import {theLobbyCover} from "@/components/stories/covers/the-lobby";
import {FACADE} from "@/components/stories/the-lobby/Facade";
import TheLobby from "@/components/stories/the-lobby/TheLobby";
import {commonest, FLOORS, LOBBY, THE_LOBBY} from "./the-lobby";

/*
 * The lobby's numbers are one week's (the-lobby.ts). These catch a refresh
 * that breaks them: a count over its total, a sum that no longer holds, a
 * share that doesn't round from its count, or a sentence the story writes
 * that the new numbers no longer bear out. A failing test names the sentence.
 */

const pct = (n: number, of: number) => Math.round((100 * n) / of);
const sum = (ns: number[]) => ns.reduce((a, b) => a + b, 0);
const html = () => renderToStaticMarkup(createElement(TheLobby, {fonts: ""})).replace(/<!-- -->/g, "").replace(/&#x27;/g, "'");

describe("the lobby's numbers", () => {
    it("never count more jobs than there are", () => {
        expect(LOBBY.readable).toBeLessThanOrEqual(LOBBY.jobs);
        for (const [name, n] of [...LOBBY.wings, ...LOBBY.named]) expect([name, n <= LOBBY.readable]).toEqual([name, true]);
        expect(LOBBY.languages.twoOrMore).toBeLessThanOrEqual(LOBBY.languages.any);
        expect(LOBBY.languages.any).toBeLessThanOrEqual(LOBBY.readable);
        expect(LOBBY.largest.jobs).toBeLessThanOrEqual(LOBBY.jobs);
        expect(LOBBY.employers).toBeLessThanOrEqual(LOBBY.jobs);
    });

    it("add up: the bands to the jobs that state a number, and those to every job", () => {
        expect(sum(Object.values(LOBBY.bands))).toBe(LOBBY.years.stated);   // 200 + 283 + 644 + 447 = 1,574
        expect(LOBBY.years.stated + LOBBY.years.unstated).toBe(LOBBY.jobs);   // 1,574 + 1,207 = 2,781
        expect(sum(FLOORS.map((f) => f.jobs))).toBe(LOBBY.jobs);
    });

    it("light every window once: the levels add to the jobs counted", () => {
        expect(sum(Object.values(LOBBY.levels))).toBe(LOBBY.jobs);
    });

    it("place every job: US, elsewhere or no country we can read", () => {
        const {us, elsewhere, unknown} = LOBBY.places;
        expect(us + elsewhere + unknown).toBe(LOBBY.jobs);
    });

    it("round the remote and internship shares from their counts", () => {
        expect(LOBBY.remote.share).toBe(pct(LOBBY.remote.jobs, LOBBY.jobs));
        expect(LOBBY.internships.share).toBe(pct(LOBBY.internships.jobs, LOBBY.jobs));
    });

    it("fit the building: full rows of windows, the rest in the penthouse", () => {
        const left = LOBBY.jobs - (FACADE.ROWS - 1) * FACADE.COLS;
        expect(left).toBeGreaterThan(0);
        expect(left).toBeLessThanOrEqual(FACADE.PENTHOUSE);
    });
});

describe("the sentences the numbers must bear out", () => {
    it("'the lobby is the biggest floor': more jobs state no number than ask for any band", () => {
        for (const f of FLOORS.slice(1)) expect([f.k, FLOORS[0].jobs > f.jobs]).toEqual([f.k, true]);
    });

    it("'5 to 7 is the most common ask among the jobs that state one'", () => {
        expect(commonest().k).toBe("5–7");
        expect(FLOORS.find((f) => f.note.startsWith("The most common ask"))?.k).toBe("5–7");
    });

    it("'it mostly means senior': more than half the jobs are senior, lead or principal", () => {
        expect(LOBBY.levels.senior * 2).toBeGreaterThan(LOBBY.jobs);
    });

    it("'the top floor': the employer with the most jobs has a plate on 8+", () => {
        expect(FLOORS[FLOORS.length - 1].doors.some((d) => d.employer === LOBBY.largest.name)).toBe(true);
    });

    it("gives the hub its card line from the numbers", () => {
        expect(THE_LOBBY.card).toBe("1,207 of the 2,781 software engineering jobs state no number of years.");
    });
});

describe("the story as rendered", () => {
    const h = html();

    it("says the week it counts near the top, fixed to it, and links the live page", () => {
        const top = h.slice(0, h.indexOf("The lobby directory."));
        expect(top).toContain("Software engineering · week of 12 October 2026");
        expect(top).toContain("By the Glassbox team · the week of 12 October 2026");
        expect(top).toContain("This story keeps to one week, 12 October 2026.");
        expect(top).toMatch(/<a href="\/market\/software-engineering">The software engineering page<\/a> starts a new count every Monday/);
    });

    it("dates every source line with the week", () => {
        const sources = h.match(/Source: Glassbox count, week of [^·]*·/g) ?? [];
        expect(sources.length).toBe(5);
        for (const s of sources) expect(s).toBe("Source: Glassbox count, week of 12 October 2026 ·");
    });

    it("writes the key sentences from the numbers", () => {
        expect(h).toContain("1,207 of the 2,781 software engineering jobs we counted state no number of years. Of the 1,574 that do, 644 ask for 5 to 7.");
        expect(h).toContain("1,728 of the 2,781 jobs are senior, lead or principal. 424 read as intern, entry level or junior, 240 as mid level, and 389 don’t say.");
        expect(h).toContain("Floor widths are counts: 1,207 state no number, 200 ask for 0 to 2 years, 283 for 3 to 4, 644 for 5 to 7, 447 for 8 or more.");
        expect(h).toContain("the most common ask is 5 to 7: 644 of them.");
        expect(h).toContain("861 of the 2,781 jobs are marked remote by their job board.");
        expect(h).toContain("employers posted them. Rocket Lab Corporation has the most, 74.");
    });

    it("reads its figures aloud: the facade and the section", () => {
        expect(h).toContain('aria-label="2,781 windows, one per software engineering job counted, lit by level: 1,728 senior, lead or principal; 424 intern, entry level or junior; 240 mid level; 389 with no level stated."');
        expect(h).toContain("Above it, of the 1,574 jobs that state a number: 200 ask for 0 to 2 years, 283 for 3 to 4, 644 for 5 to 7, 447 for 8 or more.");
    });

    it("ends with the question, the CV button and how we counted, scope included", () => {
        expect(h).toContain("Curious how many of these skills are already on your CV?");
        // After the ask, the week once more in one short line; the fold says what "read" meant (copy rewrite S2, S9).
        expect(h).toMatch(/One week, 12 October 2026\. <a href="\/market\/software-engineering">The software engineering page<\/a> counts again on Monday\./);
        expect(h).toContain("We look for about 250 named skills, by fixed rules, in the 2,757 ads long enough to read. The other 24 were too short.");
        expect(h).not.toMatch(/stays fixed to it|the live page|Skills are matched against/);
        expect(h).toMatch(/<button[^>]*class="[^"]*\bpeek\b[^"]*peek-button[^"]*"[^>]*>(?:<svg[^>]*>[\s\S]*?<\/svg>)?Compare your CV<\/button>/);
        expect(h).toContain("How we counted");
        expect(h).toContain("titles like software engineer, developer or programmer");
        expect(h).toContain("What we can't see:");
    });

    it("draws the cover from the same numbers", () => {
        const svg = theLobbyCover();
        expect(svg).toContain(">644 of 1,574<");
        expect(svg).toContain('id="sweBrass"');
    });
});
