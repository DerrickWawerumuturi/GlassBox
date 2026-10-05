import {JobRadarAnalysis} from "@/types/jobradar";
import {skillKey, skillLabel} from "@/lib/market";

/*
 * What the four skills-page concepts read, all from the scan the user
 * already has: each posting's skills (job.skills) and its required skills
 * split by the CV (match.required). Nothing is fetched.
 *
 * "Within reach" = the CV covers at least half of a posting's required
 * skills (partial counts as covered). Postings that list no required skills
 * are left out of reach: there is nothing to measure. Half was chosen on a
 * real 58-posting scan: stricter lines made the path chase one-off postings
 * (a single Salesforce or Ruby ad) instead of skills many ask for.
 */

export const REACH = 0.5;

export type Posting = {title: string; company: string; skills: Set<string>; required: Set<string>};
export type Skill = {key: string; name: string; count: number; have: boolean};
export type Step = {skill: Skill; opens: number; reachAfter: number; opened: Posting[]};

export interface SkillData {
    total: number;
    /** Postings that list required skills, the base for reach. */
    measured: number;
    postings: Posting[];
    /** Every skill in the scan, most asked first. */
    skills: Skill[];
    byKey: Map<string, Skill>;
    mine: Set<string>;
    /** Postings that ask for both a and b. */
    together: (a: string, b: string) => number;
    reach: (have: Set<string>) => number;
    /** The postings within reach of a set of skills. */
    reached: (have: Set<string>) => Posting[];
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
        return {title: r.job.job.title ?? "Untitled role", company: r.job.job.company ?? "", skills, required};
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
    const measuredPostings = postings.filter((p) => p.required.size > 0);
    const reached = (have: Set<string>) => measuredPostings.filter((p) => {
        let got = 0;
        for (const k of p.required) if (have.has(k)) got++;
        return got / p.required.size >= REACH;
    });
    const reach = (have: Set<string>) => reached(have).length;

    return {
        total: postings.length, measured: measuredPostings.length, postings, skills,
        byKey: new Map(skills.map((s) => [s.key, s])), mine,
        together: (a, b) => pairs.get(a < b ? `${a}|${b}` : `${b}|${a}`) ?? 0,
        reach, reached,
    };
}

/**
 * The learning path: each step adds the skill that brings the most postings
 * within reach, given everything before it. Ties go to the more asked-for
 * skill. Greedy, so it is a good order, not a proven best one.
 */
export function staircase(data: SkillData, steps = 5): {start: number; steps: Step[]} {
    const have = new Set(data.mine);
    const start = data.reach(have);
    const candidates = data.skills.filter((s) => !s.have).slice(0, 40);
    const out: Step[] = [];
    let current = start;
    for (let n = 0; n < steps; n++) {
        let best: Step | null = null;
        for (const skill of candidates) {
            if (have.has(skill.key)) continue;
            have.add(skill.key);
            const after = data.reach(have);
            have.delete(skill.key);
            if (!best || after > best.reachAfter || (after === best.reachAfter && skill.count > best.skill.count)) {
                best = {skill, opens: after - current, reachAfter: after, opened: []};
            }
        }
        if (!best) break;
        const before = new Set(data.reached(have));
        have.add(best.skill.key);
        best.opened = data.reached(have).filter((p) => !before.has(p));
        current = best.reachAfter;
        out.push(best);
    }
    return {start, steps: out};
}

/** The user's skills a gap is most often asked alongside, strongest first. */
export function pairsWith(data: SkillData, key: string, limit = 3): Array<{skill: Skill; n: number}> {
    return data.skills.filter((s) => s.have)
        .map((skill) => ({skill, n: data.together(key, skill.key)}))
        .filter((x) => x.n > 0).sort((a, b) => b.n - a.n).slice(0, limit);
}
