import {describe, expect, it, vi} from "vitest";

import fixture from "./look.fixture.json";
import {apportion, askRows, familyOrder, getLook, haveSet, Look, normSkill, pickWall, rarest, sharePct, squaresFor, WALL_CAP} from "./look";

const look = fixture as unknown as Look;

describe("today's count", () => {
    it("splits squares in proportion and keeps a square for every level with jobs", () => {
        const split = apportion({junior: 1, mid: 3, senior: 900, unstated: 96}, 100);
        expect(Object.values(split).reduce((a, b) => a + b, 0)).toBe(100);
        expect(split.junior).toBe(1);
        expect(split.senior).toBeGreaterThan(80);
    });

    it("draws one square per job, or per 10 above 240 jobs", () => {
        const backend = look.families.backend, se = look.families.software_engineering;
        expect(squaresFor("backend", backend)).toMatchObject({perSquare: 1});
        expect(squaresFor("backend", backend).levels).toHaveLength(backend.jobs);
        const big = squaresFor("software_engineering", se);
        expect(big.perSquare).toBe(10);
        expect(big.levels).toHaveLength(Math.ceil(se.jobs / 10));
        expect(squaresFor("backend", backend).levels).toEqual(squaresFor("backend", backend).levels);   // seeded
    });

    it("lights only titles at the level, at most 14 in all", () => {
        const {list, nLit} = pickWall("backend", look.families.backend, "junior");
        expect(list.length).toBeLessThanOrEqual(WALL_CAP);
        expect(list.filter((t) => t[2] === "junior")).toHaveLength(nLit);
    });

    it("steps through the families in the cycle order, then the rest", () => {
        expect(familyOrder(look).slice(0, 3)).toEqual(["backend", "qa", "machine_learning"]);
    });

    it("says under 1% rather than 0%", () => {
        expect(sharePct(1, 400)).toBe("under 1%");
        expect(sharePct(6, 114)).toBe("5%");
    });
});

describe("the user's skills", () => {
    it("matches a scan's names to the count's keys", () => {
        expect(normSkill("Node.js")).toBe(normSkill("node.js"));
        expect(normSkill("CI/CD")).toBe(normSkill("ci/cd"));
        expect(haveSet(["Node.js", "CI/CD"])).toEqual(new Set([normSkill("node.js"), normSkill("ci/cd")]));
    });

    it("puts required asks first and finds the rarest", () => {
        const rows = askRows([{key: "python", name: "Python", kind: "opt"}, {key: "go", name: "Go", kind: "req"},
            {key: "rust", name: "Rust", kind: "req"}], look.families.backend);
        expect(rows[0].kind).toBe("req");
        expect(rarest(rows)?.key).toBe(rows.filter((r) => r.kind === "req").sort((a, b) => a.n - b.n)[0].key);
    });
});

describe("getLook", () => {
    it("waits while the count is being built, then returns it", async () => {
        const answers = [new Response("{}", {status: 503, headers: {"Retry-After": "2"}}),
            new Response(JSON.stringify({taken_at: "x", families: {backend: {jobs: 5}}}), {status: 200})];
        const waits: number[] = [];
        vi.stubGlobal("fetch", vi.fn(async () => answers.shift()!));
        const look = await getLook(undefined, async (ms) => { waits.push(ms); });
        expect(look.taken_at).toBe("x");
        expect(waits).toEqual([2000]);
        vi.unstubAllGlobals();
    });

    it("refuses a count with no jobs, never drawing an empty market", async () => {
        for (const body of [{taken_at: "x", families: {}}, {taken_at: "x", families: {backend: {jobs: 0}}}]) {
            vi.stubGlobal("fetch", vi.fn(async () => new Response(JSON.stringify(body), {status: 200})));
            await expect(getLook(undefined, async () => {})).rejects.toThrow("no jobs");
        }
        vi.unstubAllGlobals();
    });

    it("gives up on other errors at once", async () => {
        vi.stubGlobal("fetch", vi.fn(async () => new Response("{}", {status: 500})));
        await expect(getLook(undefined, async () => {})).rejects.toThrow("500");
        vi.unstubAllGlobals();
    });
});
