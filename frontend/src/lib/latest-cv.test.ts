import {describe, expect, it} from "vitest";

import {ApiError} from "@/lib/api";
import {readOnLabel, reuseError, skillsLabel} from "./latest-cv";

describe("saved CV copy", () => {
    it("dates the read plainly, with the year only when it differs", () => {
        const now = new Date("2026-10-05T12:00:00Z");
        expect(readOnLabel("2026-10-05T08:30:00Z", now)).toBe("read on 5 Oct");
        expect(readOnLabel("2025-12-31T08:30:00Z", now)).toBe("read on 31 Dec 2025");
    });

    it("counts skills with the right word", () => {
        expect(skillsLabel(1)).toBe("1 skill");
        expect(skillsLabel(12)).toBe("12 skills");
    });

    it("asks for the CV again when an older parser read it", () => {
        expect(reuseError(new ApiError("conflict", 409))).toBe("We've updated how CVs are read. Upload it again.");
        expect(reuseError(new ApiError("missing", 404))).toBe("Your saved skills are gone. Upload your CV.");
        expect(reuseError(new Error("Analysis timed out."))).toBe("Analysis timed out.");
    });
});
