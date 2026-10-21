import type {StoryInfo} from "@/lib/stories/story";

/*
 * "Do you need AI on your CV now?" (AI): every number the story shows, for
 * one week. The week's figures are the publication for the week of 19 October
 * 2026 (market_publications id 4), as read on 21 Oct: each job family's jobs
 * we could read and those naming LLMs from look.families.<family> (`readable`
 * and `skills.llm`, a job counted once whether the skill is required,
 * preferred or mentioned), the AI jobs' programming languages from
 * pages.ai.story.languages.per_job, and entry level against senior from
 * pages.entry-level-software.story.skills (llm). "script L26" is line 26 of the
 * story's script (docs/local/editorial-sprint/stories/ai-on-your-cv/script.md);
 * NOTES.md beside it has every number with its line. "LLMs" is the skill key
 * `llm`. A refresh edits this file only; ai-on-your-cv.test.ts then says which
 * sentences need reading again.
 */

/** One job family's building: its key in look.families, its sign's lines, the jobs we could read, and those naming LLMs. */
export interface Family {key: string; sign: string[]; jobs: number; llm: number}

/** A listing as posted that week: the skills as we read them from the ad; `lime` are the AI ones the story points at. */
export interface Listing {
    posted: string; title: string; employer: string; place: string; mode: "On site" | "Remote"; years: string;
    required: string[]; nice: string[]; lime: string[];
}

export const AIC = {
    /** The Monday of the week counted. */
    week: "2026-10-19",
    /**
     * The street, sorted from the loudest ask for LLMs to the quietest (script L26 to L44). Frontend (17 of 188, 9.04%)
     * sits just above QA (32 of 357, 8.96%); the script lists them the other way round, both as 9.0%.
     */
    families: [
        {key: "ai", sign: ["AI"], jobs: 800, llm: 494}, // look.families.ai; script L26
        {key: "machine_learning", sign: ["machine", "learning"], jobs: 455, llm: 207}, // L27
        {key: "data_science", sign: ["data", "science"], jobs: 269, llm: 74}, // L28
        {key: "solutions", sign: ["solutions"], jobs: 1319, llm: 298}, // L29
        {key: "data_engineering", sign: ["data", "engineering"], jobs: 322, llm: 71}, // L31
        {key: "full_stack", sign: ["full stack"], jobs: 364, llm: 76}, // L30
        {key: "security", sign: ["security"], jobs: 563, llm: 97}, // L32
        {key: "backend", sign: ["backend"], jobs: 413, llm: 67}, // L33
        {key: "software_engineering", sign: ["software", "engineering"], jobs: 3370, llm: 523}, // L34
        {key: "product", sign: ["product"], jobs: 1454, llm: 191}, // L35
        {key: "it_support", sign: ["IT support"], jobs: 553, llm: 60}, // L36
        {key: "data_analytics", sign: ["data", "analytics"], jobs: 199, llm: 20}, // L38
        {key: "design", sign: ["design"], jobs: 503, llm: 49}, // L37
        {key: "frontend", sign: ["frontend"], jobs: 188, llm: 17}, // L40
        {key: "qa", sign: ["QA"], jobs: 357, llm: 32}, // L39
        {key: "devops", sign: ["DevOps"], jobs: 743, llm: 56}, // L41
        {key: "mobile", sign: ["mobile"], jobs: 165, llm: 10}, // L42
        {key: "embedded", sign: ["embedded"], jobs: 366, llm: 5}, // L43
        {key: "game", sign: ["game"], jobs: 15, llm: 0}, // L44: too few for a share, shown as a count
    ] as Family[],
    /** AI jobs we could read, by how many programming languages the ad names: none, one, two, three or more (pages.ai.story.languages.per_job; script L48 to L49). */
    languages: [379, 196, 134, 91],
    /** Software jobs on the entry level page (its five software families) we could read, and those naming LLMs (pages.entry-level-software.story.skills llm; script L50 to L51). */
    levels: {entry: {jobs: 627, llm: 72}, senior: {jobs: 2796, llm: 485}},
    /** The opening ad (script L54 to L56, L74 to L76): a timber and building supplies company in Hessen (checked 21 Oct, script L55). */
    opening: {
        posted: "18 Oct 2026", title: "Werkstudent (w/m/d) Software Development", employer: "Holzland Becker", place: "Offenbach am Main, Hessen, Deutschland",
        mode: "On site", years: "Years not stated", required: ["LLMs", "PHP", "JavaScript", "Python"], nice: [], lime: ["LLMs"],
    } as Listing,
    /** The three listings pinned in the street (script L57 to L59): the AI door, the lamp post, the quiet door. */
    elastic: {
        posted: "14 Oct 2026", title: "Marketing AI Engineer", employer: "Elastic", place: "Bangalore, India", mode: "On site", years: "4 years",
        required: ["Elasticsearch", "observability", "webhooks", "LLMs", "workflow automation tools", "technical writing", "Google Workspace"],
        nice: ["JavaScript", "Python", "accessibility"], lime: ["LLMs"],
    } as Listing,
    airbnb: {
        posted: "18 Oct 2026", title: "Operations Engineer, BizTech", employer: "Airbnb", place: "Anywhere in the World", mode: "Remote", years: "3 years",
        required: ["incident response", "LLMs", "AI agents", "data quality", "Tableau", "observability", "root cause analysis", "Python", "Go", "JavaScript",
            "TypeScript", "Bash", "Elasticsearch", "SQL", "Airflow", "message queues", "Terraform", "CI/CD", "Jenkins", "GitHub Actions", "AWS", "GCP", "Jira",
            "Salesforce", "Workday", "identity and access management"],
        nice: [], lime: ["LLMs", "AI agents"],
    } as Listing,
    qualinx: {
        posted: "18 Oct 2026", title: "Senior Embedded Software Engineer", employer: "Qualinx", place: "Delft, Zuid-Holland, Netherlands", mode: "On site",
        years: "10 years", required: ["embedded systems", "C", "Python"], nice: [], lime: [],
    } as Listing,
};

/** One drawn person is 5 jobs, rounded, on every screen: 5 embedded jobs are exactly one person. */
export const PER = 5;
export const drawn = (jobs: number) => Math.round(jobs / PER);
/** A whole per cent of `of`. */
export const pct = (n: number, of: number) => Math.round((100 * n) / of);
/** Under this many jobs a family shows its count only, no share (game, 15 jobs). */
export const MIN_SHARE = 30;
export const fam = (key: string) => AIC.families.find((f) => f.key === key)!;
/** The AI jobs we could read: the four language groups add up to them. */
export const AI_JOBS = AIC.languages.reduce((a, b) => a + b, 0);
/** "16": software engineering jobs naming LLMs, of every 100 (the guess). */
export const OURS = pct(fam("software_engineering").llm, fam("software_engineering").jobs);
/** "1,234". */
export const fmt = (n: number) => n.toLocaleString("en");
/** "494 of 800". */
export const countOf = (f: {llm: number; jobs: number}) => `${fmt(f.llm)} of ${fmt(f.jobs)}`;
/** "62% (494 of 800)": percent first, the count beside it. */
export const shareOf = (f: {llm: number; jobs: number}) => `${pct(f.llm, f.jobs)}% (${countOf(f)})`;

export const AI_ON_YOUR_CV: StoryInfo = {
    slug: "ai-on-your-cv",
    page: "ai",
    week: AIC.week,
    published: "2026-10-21",
    title: "Do you need AI on your CV now?",
    card: `In one week, ${pct(fam("ai").llm, fam("ai").jobs)}% of AI jobs named LLMs, against ${OURS}% of software engineering jobs and ${pct(fam("embedded").llm, fam("embedded").jobs)}% of embedded ones.`,
    readable: fam("ai").jobs,
    // The AI skills the story names (LLMs, AI agents) and their neighbours on the AI page, by vocabulary key (backend/src/matching/skills.txt).
    ask: [
        {key: "llm", name: "LLMs"}, {key: "ai agents", name: "AI agents"}, {key: "rag", name: "RAG"},
        {key: "machine learning", name: "Machine learning"}, {key: "ai assistants", name: "AI assistants"}, {key: "mlops", name: "MLOps"},
    ],
};
