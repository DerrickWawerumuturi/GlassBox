import {describe, expect, it} from "vitest";

import {appliedDay, dayKey, rowClickToggles} from "./application-rows";

/** Enough of an element for closest(): the selectors it sits inside. */
const inside = (...selectors: string[]) => ({closest: (s: string) => s.split(", ").some((x) => selectors.includes(x)) || null});

describe("selecting rows", () => {
    it("leaves a click on the row's checkbox to the checkbox", () => {
        expect(rowClickToggles(inside("[data-row-select]"))).toBe(false);
    });

    it("leaves the date picker alone", () => {
        expect(rowClickToggles(inside("[data-row-own]"))).toBe(false);
    });

    it("toggles the row for a click anywhere else", () => {
        expect(rowClickToggles(inside())).toBe(true);
    });
});

describe("the applied day", () => {
    it("is the stored date part, whatever the time zone", () => {
        const day = appliedDay("2026-09-14T12:00:00+00:00")!;
        expect([day.getFullYear(), day.getMonth(), day.getDate()]).toEqual([2026, 8, 14]);
        expect(appliedDay(null)).toBeUndefined();
    });

    it("goes back as the day that was clicked", () => {
        expect(dayKey(new Date(2026, 0, 5))).toBe("2026-01-05");
    });
});
