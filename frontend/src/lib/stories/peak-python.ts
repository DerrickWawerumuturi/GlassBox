import type {MarketName} from "@/lib/market-pages";
import type {StoryInfo} from "@/lib/stories/story";

/*
 * "Peak Python" (machine learning): every number the story shows, for one
 * week. "L7" is line 7 of the live machine learning page as read for that
 * week (docs/local/editorial-sprint/stories/data/machine-learning.txt); other
 * pages' lines are named by file. A refresh edits this file only;
 * peak-python.test.ts says which sentences need reading again.
 */

/** The ridges the page groups its skills into, left to right. "more" is the all jobs against senior chart (L90 to L95). */
export type Ridge = "lang" | "ai" | "data" | "devops" | "cloud" | "more";

/** One peak: a skill the page charts, as tall as its share of the readable jobs. */
export interface Peak {
    /** The skill's vocabulary key: what the CV ask looks for on a CV. */
    key: string;
    name: string;
    /** The name mid sentence, where it differs: "statistics". */
    inline?: string;
    ridge: Ridge;
    /** Share of the readable jobs naming it, out of 100. */
    share: number;
    /** Readable jobs naming it; null where the page gives the share only. */
    jobs: number | null;
    /** Employers whose jobs name it; null where the page doesn't say. */
    employers: number | null;
    /** The same skill in the senior machine learning jobs, where the page compares it; `jobs` null for a share only. */
    senior: {share: number; jobs: number | null} | null;
}

/** Python on one of the five pages we count: its row of that page's languages table. */
export interface PythonOn {
    page: MarketName;
    /** The page's name on the plate, one line each. */
    lines: string[];
    jobs: number;
    of: number;
    share: number;
}

export const PEAK = {
    /** The Monday of the week counted: L7, L10. */
    week: "2026-10-12",
    /** Machine learning jobs counted, all long enough to read, and their employers: L7. */
    jobs: 351,
    readable: 351,
    employers: 174,
    /** Senior machine learning jobs, the far range's denominator: L58, L69. */
    senior: 194,
    /** The nineteen peaks, left to right along the range. */
    peaks: [
        {key: "python", name: "Python", ridge: "lang", share: 63, jobs: 220, employers: 128, senior: {share: 64, jobs: null}}, // L54
        {key: "c++", name: "C++", ridge: "lang", share: 15, jobs: 54, employers: 32, senior: {share: 13, jobs: null}}, // L55
        {key: "sql", name: "SQL", ridge: "lang", share: 12, jobs: 41, employers: 31, senior: {share: 11, jobs: null}}, // L56
        {key: "go", name: "Go", ridge: "lang", share: 6, jobs: 20, employers: 14, senior: {share: 8, jobs: null}}, // L57
        {key: "machine learning", name: "Machine learning", ridge: "ai", share: 92, jobs: null, employers: null, senior: null}, // L111
        {key: "llm", name: "LLMs", ridge: "ai", share: 45, jobs: 158, employers: null, senior: null}, // L113, L182
        {key: "pytorch", name: "PyTorch", ridge: "ai", share: 43, jobs: 150, employers: 99, senior: {share: 38, jobs: 74}}, // L91, L99, L115
        {key: "etl", name: "ETL / data pipelines", ridge: "data", share: 21, jobs: null, employers: null, senior: null}, // L118
        {key: "statistics", name: "Statistics", inline: "statistics", ridge: "data", share: 21, jobs: null, employers: null, senior: null}, // L120
        {key: "spark", name: "Apache Spark", ridge: "data", share: 12, jobs: null, employers: null, senior: null}, // L122
        {key: "kubernetes", name: "Kubernetes", ridge: "devops", share: 13, jobs: null, employers: null, senior: null}, // L125
        {key: "ci/cd", name: "CI/CD", ridge: "devops", share: 11, jobs: null, employers: null, senior: null}, // L127
        {key: "observability", name: "Observability", inline: "observability", ridge: "devops", share: 10, jobs: null, employers: null, senior: null}, // L129
        {key: "aws", name: "AWS", ridge: "cloud", share: 18, jobs: 63, employers: null, senior: {share: 23, jobs: 45}}, // L94, L132
        {key: "gcp", name: "Google Cloud", ridge: "cloud", share: 12, jobs: null, employers: null, senior: null}, // L134
        {key: "azure", name: "Azure", ridge: "cloud", share: 7, jobs: null, employers: null, senior: null}, // L136
        {key: "mlops", name: "MLOps", ridge: "more", share: 24, jobs: 84, employers: null, senior: {share: 29, jobs: 57}}, // L93
        {key: "reinforcement learning", name: "Reinforcement learning", ridge: "more", share: 17, jobs: 58, employers: null, senior: {share: 12, jobs: 24}}, // L92
        {key: "feature engineering", name: "Feature engineering", ridge: "more", share: 8, jobs: 28, employers: null, senior: {share: 13, jobs: 25}}, // L95
    ] as Peak[],
    /** The ridges, their names, and the readable jobs naming a skill in each: L103, L109, L116, L123, L130. */
    ridges: [
        {key: "lang", name: "Languages", jobs: null}, {key: "ai", name: "AI", jobs: 343}, {key: "data", name: "Data", jobs: 172},
        {key: "devops", name: "DevOps", jobs: 102}, {key: "cloud", name: "Cloud", jobs: 73}, {key: "more", name: "More skills", jobs: null},
    ] as Array<{key: Ridge; name: string; jobs: number | null}>,
    /** Readable jobs naming at least one language, and two or more: L37. */
    languages: {any: 232, twoOrMore: 115},
    /**
     * Python on the five pages we count, each from its languages table: machine-learning.txt L54;
     * entry-level-software.txt, ai.txt, devops.txt and software-engineering.txt, each L60.
     */
    python: [
        {page: "machine-learning", lines: ["Machine", "learning"], jobs: 220, of: 351, share: 63},
        {page: "entry-level-software", lines: ["Entry level", "software"], jobs: 276, of: 559, share: 49},
        {page: "ai", lines: ["AI"], jobs: 258, of: 567, share: 46},
        {page: "devops", lines: ["DevOps"], jobs: 246, of: 567, share: 43},
        {page: "software-engineering", lines: ["Software", "engineering"], jobs: 1092, of: 2757, share: 40},
    ] as PythonOn[],
    /** The years jobs ask for, of those that state a number, and those that don't: L144 to L149. */
    years: {
        bands: [{label: "0 to 2", jobs: 32}, {label: "3 to 4", jobs: 37}, {label: "5 to 7", jobs: 75}, {label: "8 or more", jobs: 32}],
        unstated: 175,
    },
    /** Levels, of the jobs counted: L153 to L157. */
    levels: {senior: 194, junior: 50, mid: 27, unstated: 80},
    /** The place each job names: L169 to L171. */
    places: {us: 179, elsewhere: 113, unknown: 59},
    /** Remote jobs and internships, of the jobs counted: L173 to L177. */
    remote: {jobs: 130, share: 37},
    internships: {jobs: 27, share: 8},
    /** The employer with the most jobs: L163. */
    largest: {name: "Reddit", jobs: 15},
    /** Five of the 30 titles the page lists, titles and employers only, with the years each asks: L206 to L275. */
    plates: [
        {title: "Research Scientist - 3D Reconstruction (SfM & SLAM)", employer: "Spaitial", years: null}, // L206, L207
        {title: "Staff Machine Learning Engineer, Ads Foundational Representations", employer: "Reddit", years: 7}, // L234 to L237
        {title: "Research Engineer - Eval Platform", employer: "Mistral.ai", years: 4}, // L272 to L275
        {title: "Machine Learning Engineer - Voice AI & Generative Music (Part-time)", employer: "MWDN", years: 3}, // L244 to L247
        {title: "Credit Model Validation Manager (Machine Learning & NPV Models)", employer: "Monzo", years: null}, // L238, L239
    ] as Array<{title: string; employer: string; years: number | null}>,
};

/** A peak by its key. */
export const peak = (key: string): Peak => {
    const p = PEAK.peaks.find((d) => d.key === key);
    if (!p) throw new Error(`No peak for ${key}`);
    return p;
};

export const PEAK_PYTHON: StoryInfo = {
    slug: "peak-python",
    page: "machine-learning",
    week: PEAK.week,
    published: "2026-10-15",
    title: "Peak Python",
    card: `${peak("python").jobs} of the ${PEAK.readable} machine learning jobs we read name Python: ${peak("python").share}%, the highest Python share of the five pages.`,
    readable: PEAK.readable,
    ask: PEAK.peaks.map(({key, name}) => ({key, name})),
};
