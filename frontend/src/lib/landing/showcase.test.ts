import {describe, expect, it} from "vitest";

import fixture from "./look.fixture.json";
import type {Look} from "./look";
import {exampleHave, marketMarks, sampleApplications, sampleJobs, sampleSkillData, showcaseFamily} from "./showcase";

const look = fixture as unknown as Look;

describe("the showcase", () => {
    const family = showcaseFamily(look);
    const have = exampleHave(look);

    it("uses only sample skills that today's jobs name", () => {
        for (const k of have) expect(look.skills[k]).toBeDefined();
    });

    it("counts the bars from today's jobs, share of the jobs read", () => {
        const marks = marketMarks(look, family, have);
        const data = look.families[family];
        expect(marks[0].count).toBe(Math.max(...Object.values(data.skills)));
        expect(marks[0].percent).toBe(Math.round((marks[0].count / data.readable) * 100));
        expect(marks.every((m) => m.have === have.has(m.skill))).toBe(true);
    });

    it("draws Bridges from today's sample ads", () => {
        const data = sampleSkillData(look, family, have);
        expect(data.total).toBe(look.families[family].ads.length);
        for (const k of data.mine) expect(have.has(k)).toBe(true);
    });

    it("shows jobs that ask for something on the sample CV, the best covered first", () => {
        const jobs = sampleJobs(look, family, have);
        expect(jobs.every((j) => j.haveReq > 0)).toBe(true);
        const share = jobs.map((j) => j.haveReq / j.ad.req.length);
        expect([...share].sort((a, b) => b - a)).toEqual(share);
    });

    it("gives each example application a different company", () => {
        const apps = sampleApplications(look, family);
        expect(new Set(apps.map((a) => a.company)).size).toBe(apps.length);
    });
});
