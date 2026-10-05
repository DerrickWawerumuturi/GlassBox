import {describe, expect, it} from "vitest";

import {dotStyle} from "./SkillLandscape";

describe("landscape marks", () => {
    it("draws a missing skill as a dashed grey ring, never lime", () => {
        const ring = dotStyle(true, false, "var(--chart-gap)");
        expect(ring.stroke).toBe("var(--chart-gap)");
        expect(ring.dash).toBeTruthy();
        expect(JSON.stringify(ring)).not.toContain("lime");
    });

    it("keeps lime for the one annotated skill", () => {
        expect(dotStyle(true, true, "var(--chart-gap)").fill).toBe("var(--accent-lime)");
        expect(JSON.stringify(dotStyle(false, false, "var(--chart-have)"))).not.toContain("lime");
    });
});
