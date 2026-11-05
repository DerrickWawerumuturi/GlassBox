import React from "react";
import {renderToStaticMarkup} from "react-dom/server";
import {describe, expect, it} from "vitest";
import {StatTiles} from "./MarketParts";
import type {MarketAnalysis} from "@/types/jobradar";

describe("scan overview context", () => {
    const market = {jobs_analyzed: 58, skill_coverage: {covered: 7, total: 10, coverage: 0.7},
        skill_gaps: [{skill: "Rust", frequency: 0.1, job_count: 6}]} as MarketAnalysis;
    it("shows the coverage denominator, sample, and limitations of zero frequent gaps", () => {
        const text = renderToStaticMarkup(React.createElement(StatTiles, {market, marks: []}));
        expect(text).toContain("7 of 10");
        expect(text).toContain("58 jobs");
        expect(text).toContain("at least 20%");
        expect(text).toContain("Zero here doesn’t mean zero possible gaps");
        expect(text).toContain("Coverage counts skills, not how many jobs you qualify for");
    });
    it("does not imply coverage when no skills could be compared", () => {
        const text = renderToStaticMarkup(React.createElement(StatTiles, {market: {...market,
            skill_coverage: {covered: 0, total: 0, coverage: 0}}, marks: []}));
        expect(text).toContain("No skills to compare in this sample yet");
        expect(text).not.toContain("0 of 0");
    });
});
