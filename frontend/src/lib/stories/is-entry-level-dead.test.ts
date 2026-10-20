import {createElement} from "react";
import {renderToStaticMarkup} from "react-dom/server";
import {describe, expect, it, vi} from "vitest";

// The CV ask's sheet and scan need the app's stores; the story's words are what is tested here.
vi.mock("@/components/landing/useHave", () => ({useHave: () => null}));
vi.mock("@/components/cv-ask/useCvScan", () => ({useCvScan: () => ({open: vi.fn(), isOpen: false, scanning: false, sheet: null})}));
vi.mock("next/navigation", () => ({useRouter: () => ({push: vi.fn()})}));

import {existsSync, readFileSync} from "node:fs";
import {join} from "node:path";

import {isEntryLevelDeadCover} from "@/components/stories/covers/is-entry-level-dead";
import IsEntryLevelDead, {GUESS_ASK, TURN_ASK} from "@/components/stories/is-entry-level-dead/IsEntryLevelDead";
import {makeLayout} from "@/components/stories/is-entry-level-dead/layouts";
import {HEAD_DIR, HEADS} from "@/components/stories/is-entry-level-dead/people";
import {drawn, ELD, FINISHED, IS_ENTRY_LEVEL_DEAD, MID, ONE_IN, PER, PER_100, share, TITLED} from "./is-entry-level-dead";

/*
 * Is entry level dead?'s numbers are one week's (is-entry-level-dead.ts).
 * These catch a refresh that breaks them: a sum that no longer holds, a share
 * that doesn't round from its count, a drawn crowd that no longer matches its
 * scale, or a sentence the story writes that the new numbers no longer bear
 * out. A failing test names the sentence to read again.
 */

const html = () => renderToStaticMarkup(createElement(IsEntryLevelDead, {fonts: ""})).replace(/<!-- -->/g, "").replace(/&#x27;/g, "'").replace(/&quot;/g, "\"");
const count = <T, >(xs: ArrayLike<T>, f: (x: T) => boolean) => Array.from(xs).filter(f).length;

describe("Is entry level dead?'s numbers", () => {
    it("put every software job on one step of the ladder: 629 + 1,091 + 2,816 = 4,536", () => {
        expect(MID).toBe(1091);
        expect(ELD.entry + MID + ELD.senior).toBe(ELD.jobs);
        expect(ELD.weeks[ELD.weeks.length - 1]).toEqual({week: ELD.week, jobs: ELD.jobs, entry: ELD.entry});
    });

    it("leave 355 jobs for everyone who has finished, and 368 with an early career title", () => {
        expect(FINISHED).toBe(ELD.entry - ELD.internships);
        expect(FINISHED).toBe(355);
        expect(TITLED).toBe(339 + 29);
        expect(ELD.titled.unstated).toBeLessThanOrEqual(TITLED);
        expect(ELD.readable).toBeLessThanOrEqual(ELD.entry);
        expect(ELD.employers).toBeLessThanOrEqual(ELD.entry);
        expect(ELD.gradBoards).toBeLessThan(ELD.boards);
    });

    it("round the weekly shares as shown: 16.2, 15.6 and 13.9, drawn as 16%, 16% and 14%", () => {
        expect(ELD.weeks.map(share)).toEqual([16.2, 15.6, 13.9]);
        expect(ELD.weeks.map((w) => Math.round(share(w)))).toEqual([16, 16, 14]);
    });

    it("say 'about 1 in 7' and '14 of every 100' from the counts", () => {
        expect(ONE_IN).toBe(7);
        expect(ELD.jobs / ELD.entry).toBeCloseTo(7.2, 1);
        expect(PER_100).toBe(14);
    });
});

describe("the drawn people", () => {
    it("are 282 / 109 / 63 at 10 jobs each, 113 / 44 / 25 at 25, rounded", () => {
        expect([ELD.senior, MID, ELD.entry].map((n) => drawn(n, PER.wide))).toEqual([282, 109, 63]);
        expect([ELD.senior, MID, ELD.entry].map((n) => drawn(n, PER.phone))).toEqual([113, 44, 25]);
        expect(makeLayout(false).N).toBe(454);
        expect(makeLayout(true).N).toBe(182);
    });

    it("split the bottom step 36 / 27 (14 / 11 on a phone): the 355 stay, the 274 internships turn lime", () => {
        for (const [ph, stay, lime] of [[false, 36, 27], [true, 14, 11]] as const) {
            const S = makeLayout(ph).state(5);
            expect(count(S.COL, (c) => c === 1)).toBe(lime);
            expect(count(S.A, (a) => a > 0) - lime).toBe(stay);
            expect(lime).toBe(drawn(ELD.internships, ph ? PER.phone : PER.wide));
        }
    });

    it("tag 37 people for the 368 titled jobs, 34 blank and 3 'yrs' (15: 14 and 1 on a phone)", () => {
        for (const [ph, blank, stated] of [[false, 34, 3], [true, 14, 1]] as const) {
            const S = makeLayout(ph).state(6);
            expect(count(S.TAG, (t) => t === 1)).toBe(blank);
            expect(count(S.TAG, (t) => t === 2)).toBe(stated);
            expect(blank + stated).toBe(drawn(TITLED, ph ? PER.phone : PER.wide));
        }
    });

    it("label each picture with the week's numbers", () => {
        const labels = (k: number) => makeLayout(false).state(k).labels.map((l) => l.t);
        expect(labels(3)).toEqual(expect.arrayContaining(["2,816", "1,091", "629", "about 1 in 7"]));
        expect(labels(4)).toEqual(expect.arrayContaining(["the bottom step: 629 entry level jobs", "250 employers"]));
        expect(labels(5)).toEqual(expect.arrayContaining(["355 jobs", "274 internships"]));
        expect(labels(6)).toEqual(expect.arrayContaining(["339", "29 state a number"]));
        expect(makeLayout(false).state(8).weeks!.map((w) => `${w.big} ${w.of} ${w.lab}`)).toEqual(["16% 532 of 3,274 jobs 5 Oct", "16% 561 of 3,595 jobs 12 Oct", "14% 629 of 4,536 jobs 19 Oct"]);
    });
});

describe("the photo heads", () => {
    it("are self hosted, and every photographer is named on the page and in the credits beside them", () => {
        const pub = join(__dirname, "..", "..", "..", "public"), credits = readFileSync(join(pub, HEAD_DIR, "CREDITS.md"), "utf8"), h = html();
        expect(credits).toContain("https://www.pexels.com/license/");
        for (const head of Object.values(HEADS)) {
            expect(existsSync(join(pub, HEAD_DIR, head.file)), head.file).toBe(true);
            expect(credits).toContain(`| ${head.file} |`);
            expect(credits).toContain(head.by);
            expect(h).toContain(`<a href="${head.page}">${head.by}</a>`);
        }
    });
});

describe("the story as rendered", () => {
    const h = html();

    it("says the week near the top and dates every source line", () => {
        expect(h).toContain("By the Glassbox team · the week of 19 October 2026");
        expect(h).toContain("This story keeps to one week, 19 October 2026.");
        const sources = h.match(/Source: Glassbox count, weeks? of [^·]*·/g) ?? [];
        expect(sources.filter((s) => s === "Source: Glassbox count, week of 19 October 2026 ·").length).toBe(8);
        expect(sources).toContain("Source: Glassbox count, weeks of 5, 12 and 19 October 2026 ·");
    });

    it("writes the key sentences from the numbers", () => {
        expect(h).toContain("We sorted this week’s 4,536 software jobs into a ladder, and looked at the bottom step.");
        expect(h).toContain("This week, Prima advertised a job called <b>Junior Software Engineer</b>. It got us curious about the state of software jobs.");
        expect(h).toContain("We decided to investigate. Glassbox counts public job ads every week, so we looked at that data.");
        expect(h).toContain("employment of 22 to 25 year olds in the jobs most exposed to AI is 19% below where it would be had it kept pace with their peers.");
        expect(h).toContain("14 of every 100 software jobs advertised this week were entry level: 629 of the 4,536.");
        expect(h).toContain("Our count, 14 of the 100, raises a hand and turns lime.");
        expect(h).toContain("Now, as a crowd of 4,536 software jobs advertised this week, from about 255 company job boards and a few job sites.");
        expect(h).toMatch(/Each drawn person is <b><span class="[^"]*">10<\/span><span class="[^"]*">25<\/span><\/b> of them, rounded\./);
        expect(h).toContain("The top step is crowded: 2,816 senior jobs. 1,091 sit in the middle, mid level or not saying.");
        expect(h).toContain("The bottom step holds 629.");
        expect(h).toContain("71% of their rise between May 2025 and May 2026 came from senior roles.");
        expect(h).toContain("So no, not dead. In one week, 250 different employers advertised an entry level software job.");
        expect(h).toContain("80 of the 255 company boards we read were chosen because they post graduate and intern jobs");
        expect(h).toContain("Look closer, though. 274 of the 629 are internships, for people who are still studying.");
        expect(h).toContain("Take those away, and 355 jobs are left for everyone who has already finished.");
        expect(h).toContain("Of the 368 jobs with an early career title, 339 state no number of years.");
        expect(h).toContain("One of them is called “Senior Back-End Engineer Intern”. It asks for two.");
        expect(h).toContain("a median of 4 required skills, against 6 for senior jobs.");
        expect(h).toContain("We’ve counted for three weeks, and our collection is still growing: 3,274 software jobs on 5 October, 4,536 this week.");
        expect(h).toContain("Three points are not a trend.");
        expect(h).toContain("To be honest, the bottom step is thin: about 1 in 7 software jobs.");
        expect(h).not.toMatch(/1 in 7 are software jobs|around 5000|cool features/);
        expect(h).toContain("About 255 company boards, picked by hand");
        expect(h).toContain("Three weeks are not a trend.");
    });

    it("describes every graphic in words, with the same numbers", () => {
        expect(h).toContain("Bottom step, 629 entry level jobs, about 1 in 7.");
        expect(h).toContain("Under the step, 250 tally marks, one per employer.");
        expect(h).toContain("Four internship titles hang above on lime paper slips, in handwriting: Software Engineer Intern - Ads at Mirakl Labs; "
            + "Werkstudent (w/m/d) Software Development at Holzland Becker; Ground Software Engineering Intern (Summer 2027) at Muon Space; Backend Engineer - Internship (6 months) at Qonto.");
        expect(h).toContain("16 percent on 5 October (532 of 3,274 jobs), 16 percent on 12 October (561 of 3,595), 14 percent on 19 October (629 of 4,536)");
        expect(h).toContain("Empty slots follow for 26 October and 2 November.");
        expect(h).toContain('aria-label="A paper job ad pinned to the page: Junior Software Engineer, at Prima, as posted this week."');
    });

    it("links chapter two, and ends with the CV button and how we counted", () => {
        expect(h).toContain('<a href="/market/entry-level-software/pick-a-side">Pick a side</a>');
        expect(h).toContain("Thanks for reading. Curious where your own CV stands against this week’s jobs?");
        expect(h).toMatch(/<button[^>]*class="[^"]*\bpeek\b[^"]*"[^>]*>(?:<svg[^>]*>[\s\S]*?<\/svg>)?Compare your CV<\/button>/);
        expect(h).toContain("We look for about 250 named skills, by fixed rules, in the 627 ads long enough to read. The other 2 were too short.");
        expect(h).toContain('<details class="');
        expect(h).toContain('id="method"');
    });

    it("draws the cover from the same numbers, with no orange on the drawing but the pen note", () => {
        const svg = isEntryLevelDeadCover();
        for (const t of [">2,816<", ">1,091<", ">629<", ">about 1 in 7<"]) expect(svg).toContain(t);
        // 113 + 44 + 25 people, one <use> each.
        expect(svg.match(/<use /g)?.length).toBe(182);
        expect(svg).not.toMatch(/#f5532a/i);
    });

    it("asks for the CV inside the story, not only at the end (20 Oct: no reader clicked the ending's ask)", () => {
        // The turn's ask renders with the page; the guess's ask appears once the count is shown, so its wiring is checked in the source.
        expect(h).toContain("Studying or finished, where does your own CV stand against this week’s jobs?");
        const src = readFileSync(join(__dirname, "..", "..", "components", "stories", "is-entry-level-dead", "IsEntryLevelDead.tsx"), "utf8");
        expect(src).toMatch(/after=\{<StoryCvAsk[^>]*place=\{"story_is_entry_level_dead_guess"\}/);
        expect(src).toContain('place={"story_is_entry_level_dead_turn"}');
        // Honest scope: the sheet compares a CV with this week's jobs, so no ask claims "these 629".
        for (const ask of [GUESS_ASK, TURN_ASK]) expect(ask).toMatch(/this week’s jobs\?$/);
        for (const ask of [GUESS_ASK, TURN_ASK]) expect(ask).not.toMatch(/\d/);
    });

    it("gives the hub its card line from the numbers", () => {
        expect(IS_ENTRY_LEVEL_DEAD.card).toBe("629 of the 4,536 software jobs in one week were entry level, about 1 in 7. 274 of them were internships.");
    });
});
