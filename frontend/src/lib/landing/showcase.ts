import type {SkillMark} from "@/lib/market";
import {Posting, SkillData, skillData} from "@/lib/skill-bridges";
import type {ApplicationStatus} from "@/types/jobradar";
import {CYCLE, Look, LookAd} from "./look";

/*
 * "Inside Glassbox" on the landing page: each dashboard page drawn from today's
 * real jobs (GET /market/look) and one sample CV, which the page labels
 * "example". The jobs and counts are real; only the CV is made up, and so is
 * which stage the example applications are in.
 */

/** The sample CV's skills: a common backend set. Only the ones today's jobs name are used. */
export const EXAMPLE_SKILLS = ["python", "sql", "postgresql", "docker", "git", "javascript", "typescript", "react",
    "aws", "rest apis", "linux", "go"];

export function exampleHave(look: Look): Set<string> {
    return new Set(EXAMPLE_SKILLS.filter((k) => k in look.skills));
}

/** The job type the showcase draws: backend when there are backend jobs, else the first of the cycle. */
export function showcaseFamily(look: Look): string {
    return CYCLE.find((f) => (look.families[f]?.jobs ?? 0) > 0) ?? Object.keys(look.families)[0];
}

/** The Market page's ranked bars: today's most asked skills for the job type, the sample CV's marked. */
export function marketMarks(look: Look, family: string, have: Set<string>, limit = 8): SkillMark[] {
    const data = look.families[family];
    if (!data) return [];
    return Object.entries(data.skills).sort((a, b) => b[1] - a[1]).slice(0, limit).map(([key, count]) => ({
        skill: key, label: look.skills[key] ?? key, count,
        percent: data.readable ? Math.round((count / data.readable) * 100) : 0,
        have: have.has(key),
    }));
}

const asksOf = (ad: LookAd) => ({skills: new Set([...ad.req, ...ad.pref]), required: new Set(ad.req)});

/** Bridges from today's sample ads of the job type (real jobs), with the sample CV as "yours". */
export function sampleSkillData(look: Look, family: string, have: Set<string>): SkillData {
    const postings: Posting[] = (look.families[family]?.ads ?? []).map((ad) => ({title: ad.title, ...asksOf(ad)}));
    const mine = new Set([...have].filter((k) => postings.some((p) => p.skills.has(k))));
    return skillData(postings, mine, new Map(Object.entries(look.skills)));
}

export interface SampleJob {
    ad: LookAd;
    asks: Array<{key: string; name: string; have: boolean; required: boolean}>;
    /** How many of the job's required skills the sample CV has. */
    haveReq: number;
}

/** Opportunities: today's sample ads that ask for something on the sample CV, the best covered first. */
export function sampleJobs(look: Look, family: string, have: Set<string>, limit = 3): SampleJob[] {
    return (look.families[family]?.ads ?? [])
        .map((ad) => ({
            ad,
            asks: [...ad.req.map((k) => ({key: k, required: true})), ...ad.pref.filter((k) => !ad.req.includes(k)).map((k) => ({key: k, required: false}))]
                .map((a) => ({...a, name: look.skills[a.key] ?? a.key, have: have.has(a.key)})),
            haveReq: ad.req.filter((k) => have.has(k)).length,
        }))
        .filter((j) => j.haveReq > 0)
        .sort((a, b) => b.haveReq / b.ad.req.length - a.haveReq / a.ad.req.length || b.haveReq - a.haveReq)
        .slice(0, limit);
}

/** Applications: a few of today's job titles at made up stages, to show the tracker's shape. */
export const EXAMPLE_STAGES: ApplicationStatus[] = ["interview", "applied", "screening", "applied", "saved"];

export function sampleApplications(look: Look, family: string) {
    const seen = new Set<string>();
    return (look.families[family]?.titles ?? [])
        .filter(([, company]) => !seen.has(company) && seen.add(company))
        .slice(0, EXAMPLE_STAGES.length)
        .map(([title, company], i) => ({title, company, status: EXAMPLE_STAGES[i]}));
}
