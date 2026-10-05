import {describe, expect, it} from "vitest";

import {bottomRoom, modeFor} from "./ViewDial";

describe("Market view picker by width", () => {
    it("is a tab bar under 640px, the half dial to 767px, the column above", () => {
        expect(modeFor(390)).toBe("tabs");
        expect(modeFor(639)).toBe("tabs");
        expect(modeFor(640)).toBe("half");
        expect(modeFor(767)).toBe("half");
        expect(modeFor(768)).toBe("column");
    });

    it("leaves room under the page for the tab bar and the home indicator", () => {
        expect(bottomRoom("tabs")).toBe("calc(80px + env(safe-area-inset-bottom))");
        expect(bottomRoom("column")).toBeUndefined();
    });
});
