import {JobRadarAnalysis} from "@/types/jobradar";
import {skillKey, skillLabel} from "@/lib/market";

/*
 * What the skills page (Bridges) reads, all from the scan the user already
 * has: each job's skills (job.skills) and its required skills split by the
 * CV (match.required). Nothing is fetched.
 *
 * "Within reach" = the CV covers at least half of a job's required skills
 * (partial counts as covered). Jobs that list no required skills are left
 * out of reach: there is nothing to measure. Half was chosen on a real
 * 58-job scan: stricter lines chased one-off jobs (a single Salesforce or
 * Ruby ad) instead of skills many ask for.
 */

export const REACH = 0.5;

export type Posting = {title: string; skills: Set<string>; required: Set<string>};
export type Skill = {key: string; name: string; count: number; have: boolean};

export interface SkillData {
    total: number;
    postings: Posting[];
    /** Every skill in the scan, most asked first. */
    skills: Skill[];
    byKey: Map<string, Skill>;
    mine: Set<string>;
    /** Jobs that ask for both a and b. */
    together: (a: string, b: string) => number;
    /** How many jobs a set of skills brings within reach. */
    reach: (have: Set<string>) => number;
}

export function buildSkillData(analysis: JobRadarAnalysis): SkillData {
    const names = new Map<string, string>();
    const name = (raw: string) => {
        const key = skillKey(raw);
        if (!names.has(key)) names.set(key, skillLabel(raw));
        return key;
    };
    const mine = new Set((analysis.market?.user_skill_presence ?? []).map((s) => name(s.skill)));

    const postings: Posting[] = (analysis.ranked_jobs ?? []).map((r) => {
        const req = r.match?.required;
        for (const s of [...(req?.matched ?? []), ...(req?.partial ?? [])]) mine.add(name(s));
        const required = new Set([...(req?.matched ?? []), ...(req?.partial ?? []), ...(req?.missing ?? [])].map(name));
        const skills = new Set([...(r.job.skills ?? []).map(name), ...required]);
        return {title: r.job.job.title ?? "Untitled role", skills, required};
    });

    const counts = new Map<string, number>();
    for (const p of postings) for (const k of p.skills) counts.set(k, (counts.get(k) ?? 0) + 1);
    const skills = [...counts].map(([key, count]) => ({key, name: names.get(key) ?? key, count, have: mine.has(key)}))
        .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name));

    const pairs = new Map<string, number>();
    for (const p of postings) {
        const ks = [...p.skills].sort();
        for (let i = 0; i < ks.length; i++) for (let j = i + 1; j < ks.length; j++) {
            const id = `${ks[i]}|${ks[j]}`;
            pairs.set(id, (pairs.get(id) ?? 0) + 1);
        }
    }
    const measured = postings.filter((p) => p.required.size > 0);
    const reach = (have: Set<string>) => measured.filter((p) => {
        let got = 0;
        for (const k of p.required) if (have.has(k)) got++;
        return got / p.required.size >= REACH;
    }).length;

    return {
        total: postings.length, postings, skills, byKey: new Map(skills.map((s) => [s.key, s])), mine,
        together: (a, b) => pairs.get(a < b ? `${a}|${b}` : `${b}|${a}`) ?? 0,
        reach,
    };
}

/**
 * Not-yet skills ordered by how many of the user's skills they are linked to
 * (some job asks for both), ties to the skill more jobs ask for. This is the
 * fixed order of Bridges' right side.
 */
export function byConnection(data: SkillData, have: Skill[], notYet: Skill[]): Array<{skill: Skill; links: number}> {
    return notYet.map((skill) => ({skill, links: have.filter((h) => data.together(h.key, skill.key) > 0).length}))
        .sort((a, b) => b.links - a.links || b.skill.count - a.skill.count);
}

/**
 * The not-yet skill linked to the most of the user's skills: the one lime
 * marks, always the top row of the right side. A fact about the scan, never
 * framed as what to learn.
 */
export function mostConnected(data: SkillData, have: Skill[], notYet: Skill[]): {skill: Skill; links: number} | null {
    const top = byConnection(data, have, notYet)[0];
    return top && top.links > 0 ? top : null;
}

/**
 * The roles asking for a skill, most common first, at most three. Titles are
 * cut at their qualifier ("Software Engineer - Branching", "(Remote)") and
 * lose seniority words and level numbers ("Software Engineer II", "Engineer 3").
 */
export function topRoles(data: SkillData, key: string, limit = 3): string[] {
    const tidy = (t: string) => t.split(/\s[-–|]\s|[,(]/)[0]
        .replace(/\b(senior|sr\.?|junior|jr\.?|lead|staff|principal|mid|mid-level|new grad|graduate|ii|iii)\b/gi, "").replace(/\s+(i{1,3}|iv|[1-5])$/i, "").replace(/\s+/g, " ").trim();
    const counts = new Map<string, number>();
    for (const p of data.postings) if (p.skills.has(key)) {
        const t = tidy(p.title);
        if (t) counts.set(t, (counts.get(t) ?? 0) + 1);
    }
    return [...counts].sort((a, b) => b[1] - a[1]).slice(0, limit).map(([t]) => t);
}

/** "1 job", "16 jobs": every number names what it counts. */
export const jobsLabel = (n: number) => `${n} ${n === 1 ? "job" : "jobs"}`;

/** "1 job asks", "16 jobs ask". */
export const jobsAsk = (n: number) => `${jobsLabel(n)} ${n === 1 ? "asks" : "ask"}`;
