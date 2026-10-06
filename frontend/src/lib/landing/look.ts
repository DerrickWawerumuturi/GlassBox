import {API_BASE_URL} from "@/lib/api";
import {skillKey} from "@/lib/market";

/*
 * Today's count for the landing page: GET /market/look (docs/decisions/
 * market-look.md), and the pure helpers the page draws it with. Ported from
 * the "Look around first" prototype (docs/local/look-around-prototype.html).
 */

export type Level = "junior" | "mid" | "senior";
export const LEVELS: Level[] = ["junior", "mid", "senior"];
export type Bucket = Level | "unstated";

export interface LookAd {
    lvl: Level;
    title: string;
    company: string;
    location: string;
    remote: boolean;
    posted: string | null;
    url: string;
    years: number | null;
    req: string[];
    pref: string[];
}

export interface LookFamily {
    jobs: number;
    readable: number;
    seniority: Record<Bucket, number>;
    skills: Record<string, number>;
    titles: Array<[string, string, Level]>;
    ads: LookAd[];
}

export interface Look {
    taken_at: string;
    profiler_version: string;
    families: Record<string, LookFamily>;
    skills: Record<string, string>;
}

/** The order the count steps through, when those families have jobs. */
export const CYCLE = ["backend", "qa", "machine_learning", "frontend", "full_stack", "data_engineering", "devops",
    "mobile", "design", "software_engineering"];

/** The families the count card offers: the cycle order, then any others with jobs. */
export function familyOrder(look: Look): string[] {
    const present = Object.keys(look.families).filter((f) => look.families[f].jobs > 0);
    return [...CYCLE.filter((f) => present.includes(f)), ...present.filter((f) => !CYCLE.includes(f))];
}

/**
 * Today's count. Right after the API starts it is still being built: the API
 * answers 503 with Retry-After, and we ask again (the page keeps its loading
 * state) for up to about a minute.
 */
export async function getLook(signal?: AbortSignal, wait = (ms: number) => new Promise((r) => setTimeout(r, ms))): Promise<Look> {
    for (let attempt = 0; ; attempt++) {
        const response = await fetch(`${API_BASE_URL}/market/look`, {signal});
        if (response.ok) return response.json();
        const retry = Number(response.headers.get("Retry-After"));
        if (response.status !== 503 || !retry || attempt >= 5) throw new Error(`market look failed: ${response.status}`);
        await wait(Math.min(retry, 15) * 1000);
        if (signal?.aborted) throw new DOMException("aborted", "AbortError");
    }
}

// ------------------------------------------------------------ squares

/** A small seeded random source, so the same family always draws the same grid. */
export function rng(seed: string): () => number {
    let h = 2166136261;
    for (const c of seed) h = Math.imul(h ^ c.charCodeAt(0), 16777619);
    return () => {
        h += 0x6D2B79F5;
        let t = h;
        t = Math.imul(t ^ (t >>> 15), t | 1);
        t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
}

export function shuffle<T>(items: T[], seed: string): T[] {
    const out = [...items], next = rng(seed);
    for (let i = out.length - 1; i > 0; i--) {
        const j = Math.floor(next() * (i + 1));
        [out[i], out[j]] = [out[j], out[i]];
    }
    return out;
}

const BUCKETS: Bucket[] = ["junior", "mid", "senior", "unstated"];

/**
 * Splits `n` squares across the levels in proportion, every level with jobs
 * keeping at least one square (largest remainders get the rest).
 */
export function apportion(seniority: Record<Bucket, number>, n: number): Record<Bucket, number> {
    const total = BUCKETS.reduce((s, k) => s + seniority[k], 0) || 1;
    const raw = BUCKETS.map((k) => (seniority[k] / total) * n);
    const base = raw.map(Math.floor);
    BUCKETS.forEach((k, i) => { if (seniority[k] > 0 && base[i] === 0) base[i] = 1; });
    let left = n - base.reduce((a, b) => a + b, 0);
    const order = raw.map((x, i) => [x - Math.floor(x), i] as const).sort((a, b) => b[0] - a[0]);
    for (let j = 0; left > 0; j = (j + 1) % BUCKETS.length) { base[order[j][1]]++; left--; }
    while (left < 0) { const i = base.indexOf(Math.max(...base)); base[i]--; left++; }
    return Object.fromEntries(BUCKETS.map((k, i) => [k, base[i]])) as Record<Bucket, number>;
}

/** One square per job, or per 10 jobs above 240, each tagged with its level, in a seeded order. */
export function squaresFor(family: string, data: LookFamily): {perSquare: number; levels: Bucket[]} {
    const perSquare = data.jobs > 240 ? 10 : 1;
    const n = Math.ceil(data.jobs / perSquare);
    const per = perSquare === 1 ? data.seniority : apportion(data.seniority, n);
    const levels: Bucket[] = [];
    for (const k of BUCKETS) for (let i = 0; i < per[k]; i++) levels.push(k);
    while (levels.length < n) levels.push("unstated");
    levels.length = n;
    return {perSquare, levels: shuffle(levels, family)};
}

// ------------------------------------------------------------ wall

export const WALL_CAP = 14;

/** Up to 8 titles at the level (lit) and the rest from other levels (dimmed), mixed. */
export function pickWall(family: string, data: LookFamily, level: Level) {
    const lit = data.titles.filter((t) => t[2] === level);
    const dim = data.titles.filter((t) => t[2] !== level);
    const nLit = Math.min(lit.length, 8);
    const chosen = [...lit.slice(0, nLit), ...shuffle(dim, family).slice(0, WALL_CAP - nLit)];
    return {list: shuffle(chosen, family + level), nLit};
}

// ------------------------------------------------------------ the user's skills

/** One spelling for comparing skill keys with the names a scan returns ("Node.js" and "node.js"). */
export const normSkill = (s: string) => skillKey(s).replace(/[\s.\-_/]+/g, "");

export function haveSet(skills: Iterable<string>): Set<string> {
    return new Set([...skills].filter(Boolean).map(normSkill));
}

/** How many of a family's 10 most asked skills are on the CV. */
export function topTenHave(data: LookFamily, have: Set<string>): number {
    return Object.entries(data.skills).sort((a, b) => b[1] - a[1]).slice(0, 10)
        .filter(([k]) => have.has(normSkill(k))).length;
}

export function adFor(data: LookFamily, level: Level): LookAd | undefined {
    return data.ads.find((a) => a.lvl === level) ?? data.ads[0];
}

/** "5%", or "under 1%" when the share rounds to nothing. */
export function sharePct(n: number, total: number): string {
    const pct = total ? (n / total) * 100 : 0;
    return pct > 0 && pct < 1 ? "under 1%" : `${Math.round(pct)}%`;
}

export interface AdAsk {key: string; name: string; kind: "req" | "opt"}

/** The asks of an ad with today's counts, required first, then most named. */
export function askRows(asks: AdAsk[], data: LookFamily) {
    return asks.map((a) => ({...a, n: data.skills[a.key] ?? 0}))
        .sort((a, b) => Number(a.kind === "opt") - Number(b.kind === "opt") || b.n - a.n);
}

/** The required ask fewest of today's jobs name: the one lime on the ad before a CV is in. */
export function rarest<T extends {kind: string; n: number}>(rows: T[]): T | null {
    const req = rows.filter((r) => r.kind !== "opt");
    const pool = req.length ? req : rows;
    return pool.length > 1 ? pool.reduce((a, b) => (b.n < a.n ? b : a)) : null;
}
