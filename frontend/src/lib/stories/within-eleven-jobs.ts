import {inWords, type StoryInfo} from "@/lib/stories/story";

/*
 * "Within eleven jobs" (DevOps): every number the story shows, for one week.
 * "L7" is line 7 of the live DevOps page as read for that week
 * (docs/local/editorial-sprint/stories/data/devops.txt); other pages' lines
 * are named by file. A refresh edits this file only;
 * within-eleven-jobs.test.ts says which sentences need reading again.
 */

/** A skill the page counts: the readable jobs naming it, their share, and where the page gives them, its employers and senior share. */
export interface Counted {key: string; name: string; jobs: number; share: number; employers?: number; senior?: number}

/** A title the page lists (L167 to L252), quoted on a container door, with the years it asks for, or null. */
export interface Door {title: string; employer: string; years: number | null}

export const ELEVEN = {
    /** The Monday of the week counted: L7. */
    week: "2026-10-12",
    /** DevOps jobs counted, their employers, and those long enough to read: L7. */
    jobs: 571,
    employers: 298,
    readable: 567,
    /** Senior DevOps jobs, the comparison set of the languages table: L67. */
    seniorJobs: 369,
    /** The three skills at the top, and the readable jobs naming each: L7, L149; shares L81 to L84, L44. */
    top: [
        {key: "terraform", name: "Terraform / IaC", jobs: 248, share: 44},
        {key: "python", name: "Python", jobs: 246, share: 43, employers: 147},
        {key: "kubernetes", name: "Kubernetes", jobs: 237, share: 42},
    ] as Counted[],
    /** The seven languages the page charts, each named by jobs at 10 or more employers: L60 to L67. */
    languages: [
        {key: "python", name: "Python", jobs: 246, share: 43, employers: 147, senior: 49}, // L60
        {key: "go", name: "Go", jobs: 128, share: 23, employers: 81, senior: 25}, // L61
        {key: "bash", name: "Bash", jobs: 88, share: 16, employers: 76, senior: 16}, // L62
        {key: "typescript", name: "TypeScript", jobs: 70, share: 12, employers: 45, senior: 14}, // L63
        {key: "sql", name: "SQL", jobs: 51, share: 9, employers: 42, senior: 10}, // L64
        {key: "powershell", name: "PowerShell", jobs: 46, share: 8, employers: 39, senior: 6}, // L65
        {key: "java", name: "Java", jobs: 44, share: 8, employers: 37, senior: 9}, // L66
    ] as Counted[],
    /** Readable jobs naming at least one language, and two or more: L37. */
    named: {any: 361, twoOrMore: 264},
    /** Languages named more often in all DevOps jobs than in senior ones: L70. */
    leanAll: 1,
    /** The skills the page gives as shares only, by zone, with the readable jobs naming one in each zone: L74 to L105, L299 to L302. */
    zones: [
        {name: "DevOps and operations", jobs: 388, skills: [{name: "Terraform / IaC", share: 44}, {name: "Kubernetes", share: 42}, {name: "CI/CD", share: 38}]},
        {name: "Cloud", jobs: 260, skills: [{name: "AWS", share: 39}, {name: "Azure", share: 22}, {name: "Google Cloud", share: 19}]},
        {name: "Backend and systems", jobs: 155, skills: [{name: "Distributed systems", share: 16}, {name: "System design", share: 8}, {name: "REST APIs", share: 7}]},
        {name: "Developer tools", jobs: 132, skills: [{name: "Git", share: 19}, {name: "AI assistants (ChatGPT, Copilot)", share: 7}]},
    ],
    /** Levels, of the jobs counted: L33, L121, L123, L304. */
    levels: {senior: 370, junior: 38, mid: 47, unstated: 116},
    /** Internships, of the jobs counted: L140, L141, L306. */
    internships: {jobs: 13, share: 2},
    /** Jobs that state a number of years, those that don't, and the bands of those that do: L117, L303, L113 to L115. */
    years: {stated: 302, unstated: 269, bands: [
        {from: 0, to: 2, jobs: 24}, {from: 3, to: 4, jobs: 55}, {from: 5, to: 7, jobs: 155}, {from: 8, to: null, jobs: 68},
    ] as Array<{from: number; to: number | null; jobs: number}>},
    /** The place each job names: L136 to L138, L305. */
    places: {us: 227, elsewhere: 157, unknown: 187},
    /** Remote jobs, of the jobs counted: L143, L144. */
    remote: {jobs: 199, share: 35},
    /** The employer with the most jobs: L130. */
    largest: {name: "Cloudflare", jobs: 27},
    /** Titles the page lists: L167. The doors quote some of them (titles and employers only), in this order within a band. */
    listed: 30,
    doors: [
        {title: "Systems Engineer", employer: "GitStart", years: null}, // L169
        {title: "Infrastructure Engineer", employer: "Tailscale", years: null}, // L235
        {title: "Senior CX Platform Engineer", employer: "GitLab", years: null}, // L213
        {title: "Platform Engineering", employer: "Polar", years: null}, // L199
        {title: "Senior DevOps Engineer (AWS + CDK)", employer: "JTL-Software-GmbH", years: 5}, // L191 to L194
        {title: "Senior IT Infrastructure Engineer", employer: "Agilerobotsse", years: 5}, // L209 to L212
        {title: "Senior DevOps Engineer", employer: "Malwarebytes", years: 6}, // L215 to L218
        {title: "Senior DevOps Engineer", employer: "Dynamo AI", years: 5}, // L243 to L246
        {title: "Senior Systems Engineer II", employer: "Rocket Lab Corporation", years: 8}, // L179 to L182
        {title: "Lead Infrastructure Engineer III", employer: "Truckstop", years: 8}, // L201 to L204
        {title: "Linux Engineer", employer: "IO Tech Solutions Limited", years: 8}, // L219 to L222
        {title: "Build Reliability Engineer II", employer: "Varda Space Industries", years: 3}, // L183 to L186
        {title: "Weekend DevOps Engineer", employer: "Sporty Group", years: 3}, // L195 to L198
        {title: "DevOps Engineer", employer: "WalkMe", years: 4}, // L231 to L234
        {title: "DevOps Engineer", employer: "Swarmaero", years: 4}, // L247 to L250
    ] as Door[],
    /** Internships on the other four pages, for "the fewest of the five": each file's L17 and its internships line. */
    otherInternships: [
        {subject: "entry level software", jobs: 238, of: 561}, // entry-level-software.txt L17, L162
        {subject: "software engineering", jobs: 211, of: 2781}, // software-engineering.txt L17, L178
        {subject: "AI", jobs: 41, of: 569}, // ai.txt L17, L144
        {subject: "machine learning", jobs: 27, of: 351}, // machine-learning.txt L17, L173
    ],
};

/** The gap between first and third, in jobs: the story's title. */
export const gap = () => ELEVEN.top[0].jobs - ELEVEN.top[2].jobs;

export const WITHIN_ELEVEN_JOBS: StoryInfo = {
    slug: "within-eleven-jobs",
    page: "devops",
    week: ELEVEN.week,
    published: "2026-10-15",
    title: `Within ${inWords(gap())} jobs`,
    card: `${ELEVEN.top[0].name}, ${ELEVEN.top[1].name} and ${ELEVEN.top[2].name} are named in ${ELEVEN.top[0].jobs}, ${ELEVEN.top[1].jobs} and ${ELEVEN.top[2].jobs} of the ${ELEVEN.readable} DevOps job ads we read.`,
    readable: ELEVEN.readable,
    ask: [
        {key: "terraform", name: "Terraform / IaC"}, {key: "python", name: "Python"}, {key: "kubernetes", name: "Kubernetes"},
        {key: "go", name: "Go"}, {key: "bash", name: "Bash"}, {key: "typescript", name: "TypeScript"}, {key: "sql", name: "SQL"},
        {key: "powershell", name: "PowerShell"}, {key: "java", name: "Java"}, {key: "aws", name: "AWS"}, {key: "ci/cd", name: "CI/CD"},
        {key: "azure", name: "Azure"}, {key: "gcp", name: "Google Cloud"}, {key: "distributed systems", name: "Distributed systems"},
        {key: "system design", name: "System design"}, {key: "rest api", name: "REST APIs"}, {key: "git", name: "Git"},
        {key: "ai assistants", name: "AI assistants (ChatGPT, Copilot)"},
    ],
};
