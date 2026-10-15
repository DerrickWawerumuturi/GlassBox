import type {StoryInfo} from "@/lib/stories/story";

/*
 * "Contents may vary" (AI): every number the story shows, for one week. "L7"
 * is line 7 of the live AI page as read for that week
 * (docs/local/editorial-sprint/stories/data/ai.txt); other pages' lines are
 * named by file. A refresh edits this file only; contents-may-vary.test.ts
 * says which sentences need reading again.
 */

/** A line on the label: a skill, the readable jobs naming it, and its share. `jobs` is null where the page gives the share only. */
export interface LabelLine {
    key: string;
    name: string;
    jobs: number | null;
    share: number;
}

/** A slip: a title and employer as the live page lists them (trimmed of (m/w/d) tags and city brackets), and the years the ad states. */
export interface Slip {title: string; employer: string; asks: string}

export const CONTENTS = {
    /** The Monday of the week counted: L7. */
    week: "2026-10-12",
    /** AI jobs counted, their employers, and those long enough to read: L7. */
    jobs: 569,
    employers: 269,
    readable: 567,
    /** Readable jobs naming LLMs: L7, L15. */
    llm: 343,
    /** Readable jobs naming at least one programming language, and two or more: L37. The rest name none. */
    languages: 294,
    twoOrMore: 165,
    /** The label, in the live page's order of shares: languages L60 to L66, the rest L80 to L107. */
    label: [
        {key: "llm", name: "LLMs", jobs: 343, share: 60}, // L7, L82
        {key: "python", name: "Python", jobs: 258, share: 46}, // L60
        {key: "ai agents", name: "AI agents", jobs: 220, share: 39}, // L84, L153
        {key: "machine learning", name: "Machine learning", jobs: null, share: 37}, // L86
        {key: "ai assistants", name: "AI assistants", jobs: null, share: 18}, // L89
        {key: "ci/cd", name: "CI/CD", jobs: null, share: 14}, // L96
        {key: "sql", name: "SQL", jobs: 76, share: 13}, // L61
        {key: "kubernetes", name: "Kubernetes", jobs: null, share: 12}, // L98
        {key: "etl", name: "ETL / data pipelines", jobs: null, share: 11}, // L103
        {key: "go", name: "Go", jobs: 47, share: 8}, // L62
        {key: "observability", name: "Observability", jobs: null, share: 8}, // L100
        {key: "c++", name: "C++", jobs: 35, share: 6}, // L63
        {key: "javascript", name: "JavaScript", jobs: 32, share: 6}, // L64
        {key: "git", name: "Git", jobs: null, share: 6}, // L91
        {key: "workflow automation tools", name: "Workflow automation", jobs: null, share: 6}, // L93
        {key: "data analysis", name: "Data analysis", jobs: null, share: 6}, // L105
        {key: "typescript", name: "TypeScript", jobs: 30, share: 5}, // L65
        {key: "data quality", name: "Data quality", jobs: null, share: 5}, // L107
        {key: "java", name: "Java", jobs: 25, share: 4}, // L66
    ] as LabelLine[],
    /** The pile: one piece per readable job, this many across. */
    across: 27,
    /** Titles the live page lists: L171. */
    listed: 30,
    /** Ten of them, on slips: L181 to L260. */
    slips: [
        {title: "AI Compiler Engineer", employer: "EnCharge AI", asks: "Asks 3 years"}, // L181 to L184
        {title: "Trainer für KI-Fachseminare", employer: "XDi - Experience Design Institut", asks: ""}, // L223 to L224
        {title: "Category Manager, Software, AI & Digital Platforms", employer: "Quantum-Systems GmbH", asks: "Asks 3 years"}, // L251 to L254
        {title: "Legal AI Engineer", employer: "Legartis", asks: ""}, // L239 to L240
        {title: "GEO & AI Search Consultant", employer: "Awin", asks: ""}, // L241 to L242
        {title: "AI Governance Engineer", employer: "Bright Vision Technologies", asks: "Asks 6 years"}, // L257 to L260
        {title: "Research Staff, Voice AI Foundations", employer: "Deepgram", asks: "No experience asked"}, // L215 to L218
        {title: "Head of AI & Data", employer: "Es Group", asks: ""}, // L187 to L188
        {title: "Master Trainer OpenAI", employer: "Nonplusultra", asks: "Asks 5 years"}, // L231 to L234
        {title: "Senior AI R&D Engineer, Model Training", employer: "Alephalpha", asks: ""}, // L243 to L244
    ] as Slip[],
    /** Levels of the jobs counted: L33, L124 to L128. */
    levels: {senior: 349, junior: 61, mid: 38, unstated: 121},
    /** Years asked: L111 to L120. `bands` are of the jobs that state a number; the most common ask is lime. */
    years: {stated: 289, unstated: 280, bands: [{label: "0 to 2 years", jobs: 36}, {label: "3 to 4", jobs: 50}, {label: "5 to 7", jobs: 120}, {label: "8 or more", jobs: 83}]},
    /** The place each job names: L140 to L142. */
    places: {us: 219, elsewhere: 215, unknown: 135},
    /** Remote and internships, of the jobs counted: L147 to L148, L144 to L145. */
    remote: {jobs: 229, share: 40},
    internships: {jobs: 41, share: 7},
    /** The employer with the most jobs: L134. */
    largest: {name: "OpenAI", jobs: 35},
    /**
     * The other four pages that week, for "the only page where elsewhere nearly matches the US" and
     * "the highest remote share": entry-level-software.txt L158, L159, L166; software-engineering.txt
     * L174, L175, L182; machine-learning.txt L169, L170, L177; devops.txt L136, L137, L144.
     */
    others: [
        {name: "entry level software", us: 314, elsewhere: 158, remote: 15},
        {name: "software engineering", us: 1384, elsewhere: 844, remote: 31},
        {name: "machine learning", us: 179, elsewhere: 113, remote: 37},
        {name: "DevOps", us: 227, elsewhere: 157, remote: 35},
    ],
};

/** Readable jobs that name no programming language: the label's warning line. */
export const NO_LANGUAGE = CONTENTS.readable - CONTENTS.languages;

/** The most common years band, lit in lime on the back of the box. */
export const commonBand = () => CONTENTS.years.bands.reduce((a, b) => (b.jobs > a.jobs ? b : a));

export const CONTENTS_MAY_VARY: StoryInfo = {
    slug: "contents-may-vary",
    page: "ai",
    week: CONTENTS.week,
    published: "2026-10-15",
    title: "Contents may vary",
    card: `${CONTENTS.llm} of the ${CONTENTS.readable} AI job ads we read name LLMs. ${NO_LANGUAGE} name no programming language at all.`,
    readable: CONTENTS.readable,
    // The CV ask counts the label's skills on a CV.
    ask: CONTENTS.label.map(({key, name}) => ({key, name})),
};
