import {describe, expect, it} from "vitest";

import {MARKET_VIEWS, viewFrom} from "./market-views";

describe("viewFrom", () => {
    it("opens Overview for an old ?view=landscape link", () => {
        expect(viewFrom("landscape")).toBe("overview");
    });

    it("keeps the four views and falls back for nothing or junk", () => {
        expect(MARKET_VIEWS.map((v) => v.id)).toEqual(["overview", "demand", "yours", "gaps"]);
        expect(viewFrom("gaps")).toBe("gaps");
        expect(viewFrom(null)).toBe("overview");
        expect(viewFrom("nope")).toBe("overview");
    });
});
