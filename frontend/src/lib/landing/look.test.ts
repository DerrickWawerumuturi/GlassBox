import {describe, expect, it} from "vitest";

import fixture from "./look.fixture.json";
import {apportion, askRows, familyOrder, haveSet, Look, normSkill, pickWall, rarest, sharePct, squaresFor, topTenHave, WALL_CAP} from "./look";

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
        const have = haveSet(["Python", "Go"]);
        expect(topTenHave(look.families.backend, have)).toBeGreaterThanOrEqual(1);
    });

    it("puts required asks first and finds the rarest", () => {
        const rows = askRows([{key: "python", name: "Python", kind: "opt"}, {key: "go", name: "Go", kind: "req"},
            {key: "rust", name: "Rust", kind: "req"}], look.families.backend);
        expect(rows[0].kind).toBe("req");
        expect(rarest(rows)?.key).toBe(rows.filter((r) => r.kind === "req").sort((a, b) => a.n - b.n)[0].key);
    });
});
