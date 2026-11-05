import React from "react";
import {renderToStaticMarkup} from "react-dom/server";
import {describe, expect, it, vi} from "vitest";
import type {SkillMark} from "@/lib/market";

const host = vi.hoisted(() => ({width: 720}));
vi.mock("./MarketParts", async (original) => ({...await original<typeof import("./MarketParts")>(),
    useWidth: () => [{current: null}, host.width],
}));
import DemandBars from "./DemandBars";

describe("demand chart scale and labels", () => {
    const marks: SkillMark[] = [{skill: "Python", label: "Python", count: 10000, percent: 100, have: true},
        {skill: "Long label", label: "A deliberately long technical skill name", count: 2500, percent: 25, have: false}];

    it.each([290, 720])("keeps the 0–100%% scale and labels inside a %ipx chart", (width) => {
        host.width = width;
        const html = renderToStaticMarkup(React.createElement(DemandBars, {marks, jobs: 10000}));
        expect(html).toContain("scale from 0 to 100 percent");
        expect(html).toContain(">100%</text>");
        expect(html).not.toContain(">125%</text>");
        expect(html).toContain("A deliberately long technical skill name: 2500 of 10000 jobs (25%)");
        const positions = [...html.matchAll(/<text x="([\d.-]+)"/g)].map((match) => Number(match[1]));
        expect(positions.length).toBeGreaterThan(4);
        expect(positions.every((x) => x >= 0 && x <= width)).toBe(true);
    });
});
