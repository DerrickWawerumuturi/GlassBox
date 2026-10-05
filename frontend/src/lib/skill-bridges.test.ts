import {describe, expect, it} from "vitest";

import {JobRadarAnalysis} from "@/types/jobradar";
import {buildSkillData, jobsAsk, mostConnected, topRoles} from "./skill-bridges";

/** A scan from jobs given as their skills; every skill is required. */
function scan(mine: string[], postings: Array<string[]>, titles: string[] = []): JobRadarAnalysis {
    return {
        market: {user_skill_presence: mine.map((skill) => ({skill}))},
        ranked_jobs: postings.map((skills, i) => ({
            job: {skills, job: {title: titles[i] ?? "Role", company: "Co"}},
            match: {required: {
                matched: skills.filter((s) => mine.includes(s)), partial: [],
                missing: skills.filter((s) => !mine.includes(s)),
            }},
        })),
    } as unknown as JobRadarAnalysis;
}

function pick(analysis: JobRadarAnalysis) {
    const data = buildSkillData(analysis);
    const top = mostConnected(data, data.skills.filter((s) => s.have), data.skills.filter((s) => !s.have));
    return top && {skill: top.skill.name, links: top.links};
}

describe("mostConnected", () => {
    it("picks the skill linked to the most of yours, not the strongest single pair", () => {
        // Python and Go share 5 postings, the strongest single bridge (the old pick).
        // But Rust is asked alongside three of your skills, Go alongside one.
        const postings = [
            ...Array.from({length: 5}, () => ["Python", "Go"]),
            ["Python", "Rust"], ["SQL", "Rust"], ["Git", "Rust"],
        ];
        expect(pick(scan(["Python", "SQL", "Git"], postings))).toEqual({skill: "Rust", links: 3});
    });

    it("breaks a tie toward the skill more postings ask for", () => {
        const postings = [["Python", "Go"], ["Python", "Rust"], ["Rust"]];
        expect(pick(scan(["Python"], postings))).toEqual({skill: "Rust", links: 1});
    });

    it("is empty when no posting asks for one of yours with one you lack", () => {
        expect(pick(scan(["Python"], [["Python"], ["Go"]]))).toBeNull();
    });
});

describe("topRoles", () => {
    it("tidies titles and lists the most common first", () => {
        const data = buildSkillData(scan(["Python"], [["Go"], ["Go"], ["Go"], ["Go"]],
            ["Senior Backend Engineer", "Backend Engineer II", "Platform Engineer (Remote)", "Go Developer - Payments"]));
        expect(topRoles(data, "go")).toEqual(["Backend Engineer", "Platform Engineer", "Go Developer"]);
    });
});

describe("jobsAsk", () => {
    it("names what it counts, singular and plural", () => {
        expect(jobsAsk(1)).toBe("1 job asks");
        expect(jobsAsk(16)).toBe("16 jobs ask");
    });
});
