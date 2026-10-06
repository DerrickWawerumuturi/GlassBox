import {describe, expect, it} from "vitest";

import {rankedToRow} from "./dashboard-data";
import type {RankedJob} from "@/types/jobradar";

const job = (over: Partial<RankedJob["job"]["job"]> = {}, match = true) => ({
    job: {job: {id: "j1", title: "Backend Engineer", company: "Plaid", location: "Paris", remote: false, url: "https://x/1",
        employment_type: null, posted_at: "3 days ago", posted_at_utc: "2026-10-03T09:00:00Z", db_id: 42, ...over}, skills: []},
    overall_score: 0.7, title_score: 1, skills_score: 0.6, experience_score: 1, location_score: 1,
    match: match ? {score: 70, tier: "good", required: {matched: ["go"], partial: ["sql"], missing: ["kafka"]}} : undefined,
} as unknown as RankedJob);

describe("a scan's jobs as cards", () => {
    it("carries the matcher's numbers and the required split", () => {
        const row = rankedToRow(job(), 0, "2026-10-06T00:00:00Z")!;
        expect([row.match, row.tier, row.have, row.missing, row.required]).toEqual([70, "good", ["go", "sql"], ["kafka"], 3]);
        expect([row.jobId, row.listedAt, row.dateBasis]).toEqual([42, "2026-10-03T09:00:00Z", "posted"]);
    });

    it("falls back to when it was found, and to a local id", () => {
        const row = rankedToRow(job({posted_at_utc: null, db_id: null}), 3, "2026-10-06T00:00:00Z")!;
        expect([row.jobId, row.listedAt, row.dateBasis]).toEqual([-4, "2026-10-06T00:00:00Z", "fetched"]);
    });

    it("skips a job with no explanation", () => {
        expect(rankedToRow(job({}, false), 0, "x")).toBeNull();
    });
});
