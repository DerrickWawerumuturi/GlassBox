import {describe, expect, it} from "vitest";

import {siteUrl} from "./site";

describe("siteUrl", () => {
    it("defaults to the production domain", () => {
        expect(siteUrl(undefined)).toBe("https://seeglassbox.com");
        expect(siteUrl("  ")).toBe("https://seeglassbox.com");
    });

    it("drops a trailing slash, so paths join cleanly", () => {
        expect(siteUrl("http://localhost:3000/")).toBe("http://localhost:3000");
    });
});
