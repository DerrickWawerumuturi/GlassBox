import type {StoryInfo} from "@/lib/stories/story";

/*
 * "The lobby is the biggest floor" (software engineering): every number the
 * story shows, for one week. "L7" is line 7 of the live software engineering
 * page as read for that week
 * (docs/local/editorial-sprint/stories/data/software-engineering.txt).
 * A refresh edits this file only; the-lobby.test.ts says which sentences need
 * reading again.
 */

/** A door plate: a title and its employer as the page lists them, and the years it asks, if it states any. */
export type Plate = {title: string; employer: string; asks?: string};

/** A floor of the lift: one band of years the live page publishes, bottom up. The lobby is the jobs that state none. */
export interface Floor {
    /** The label on the button and the indicator: "L", "0–2", … "8+". */
    k: string;
    /** What the button reads aloud. */
    aria: string;
    jobs: number;
    /** "state no number of years", "ask for 5 to 7 years". */
    says: string;
    /** What the count is out of: "of the 2,781 jobs", "of the 1,574 jobs that state a number". */
    of: string;
    /** The floor's own line under the doors, after the count. */
    note: string;
    doors: Plate[];
}

const fmt = (n: number) => n.toLocaleString("en");

export const LOBBY = {
    /** The Monday of the week counted: L7. */
    week: "2026-10-12",
    /** Software engineering jobs counted, their employers, and those long enough to read: L7. */
    jobs: 2781,
    employers: 660,
    readable: 2757,
    /** Jobs that state a number of years, and those that don't: L154. */
    years: {stated: 1574, unstated: 1207},
    /** The bands the live page publishes, of the jobs that state a number: L149 to L152, L344. */
    bands: {"0–2": 200, "3–4": 283, "5–7": 644, "8+": 447},
    /** The level each title reads as: L158 to L162, L345. */
    levels: {senior: 1728, junior: 424, mid: 240, unstated: 389},
    /** The directory's wings: jobs naming a skill in each group, of the readable ones (L114, L121, L128, L135). */
    wings: [["DevOps and operations", 1370], ["Backend and systems", 1174], ["AI and machine learning", 901], ["Cloud", 715]] as Array<[string, number]>,
    /** The directory by name: readable jobs naming each (L60 to L64, L98, L99), most first. */
    named: [["Python", 1092], ["Distributed systems", 694], ["AWS", 622], ["Go", 621], ["TypeScript", 557], ["C++", 533], ["Java", 482]] as Array<[string, number]>,
    /** Readable jobs naming at least one language, and two or more: L37. */
    languages: {any: 1942, twoOrMore: 1421},
    /** The place each job names: L174 to L176, L346. */
    places: {us: 1384, elsewhere: 844, unknown: 553},
    /** Remote jobs and internships, of the jobs counted, with the page's shares: L178 to L182. */
    remote: {jobs: 861, share: 31},
    internships: {jobs: 211, share: 8},
    /** The employer with the most jobs: L168. */
    largest: {name: "Rocket Lab Corporation", jobs: 74},
    /** The titles the page lists, of the jobs counted: L205. */
    listed: 30,
};

const OF_STATED = `of the ${fmt(LOBBY.years.stated)} jobs that state a number`;

/**
 * The five floors, bottom up, as a building is. Door plates quote titles and
 * employers from the 30 the page lists (L207 to L292), gender notes like
 * (m/w/d) left off; "asks" is the years the page shows beside a title.
 */
export const FLOORS: Floor[] = [
    {k: "L", aria: `Lobby, no number of years stated, ${fmt(LOBBY.years.unstated)} jobs`, jobs: LOBBY.years.unstated,
        says: "state no number of years", of: `of the ${fmt(LOBBY.jobs)} jobs`,
        note: "The lobby, and the biggest floor. Stating no number isn’t asking for none.",
        doors: [ // L215, L231 to L234, L247, L281, L239
            {title: "Software Engineer", employer: "Raysono"}, {title: "Developer (Graduate)", employer: "Native Design", asks: "entry level by its title"},
            {title: "Engineering Manager, Build", employer: "gitlab"}, {title: "Lead Software Engineer", employer: "Skdse"},
            {title: "Image Processing Engineer", employer: "Aftershoot"},
        ]},
    {k: "0–2", aria: `0 to 2 years, ${fmt(LOBBY.bands["0–2"])} jobs`, jobs: LOBBY.bands["0–2"], says: "ask for 0 to 2 years", of: OF_STATED,
        // Read from L207 to L292: the 12 titles that state a number ask 5, 8, 8, 5, 5, 12, 5, 5, 8, 3, 4 and 10 years.
        note: `The shortest corridor. None of the ${LOBBY.listed} titles the weekly page lists states 0 to 2 years, so there’s no plate to read here. The one graduate title, Developer (Graduate) at Native Design, states no number and lives in the lobby.`,
        doors: []},
    {k: "3–4", aria: `3 to 4 years, ${fmt(LOBBY.bands["3–4"])} jobs`, jobs: LOBBY.bands["3–4"], says: "ask for 3 to 4 years", of: OF_STATED, note: "",
        doors: [ // L269 to L272, L283 to L286
            {title: "Engineering Manager, Alma Wallet", employer: "Alma31", asks: "asks 3 years"},
            {title: "Payload Flight Software Engineer", employer: "Constellrgmbh", asks: "asks 4 years"},
        ]},
    {k: "5–7", aria: `5 to 7 years, ${fmt(LOBBY.bands["5–7"])} jobs`, jobs: LOBBY.bands["5–7"], says: "ask for 5 to 7 years", of: OF_STATED,
        note: "The most common ask among the jobs that state one.",
        doors: [ // L227 to L230, L243 to L246, L257 to L260, L261 to L264 ("- Personio" is the job board's, left off)
            {title: "Senior Mission Software Engineer", employer: "Varda Space Industries", asks: "asks 5 years"},
            {title: "Telemetry Engineer", employer: "Bright Vision Technologies", asks: "asks 5 years"},
            {title: "SAP FIORI Developer", employer: "Pontoonglobal", asks: "asks 5 years"},
            {title: "Senior IC PDK Development Engineer", employer: "Quantum Motion Technologies", asks: "asks 5 years"},
        ]},
    {k: "8+", aria: `8 years or more, ${fmt(LOBBY.bands["8+"])} jobs`, jobs: LOBBY.bands["8+"], says: "ask for 8 years or more", of: OF_STATED,
        note: `The top floor. ${LOBBY.largest.name} has the most jobs in the building, ${LOBBY.largest.jobs} of the ${fmt(LOBBY.jobs)}.`,
        doors: [ // L211 to L214, L217 to L220, L265 to L268, L287 to L290, L249 to L252
            {title: "Senior Software Engineer", employer: "Appliedai", asks: "asks 8 years"},
            {title: "Staff Software Engineer (1-year contract)", employer: "Cority", asks: "asks 8 years"},
            {title: "Engineering Manager, Cloud Platform & Operations", employer: "Sonarsource", asks: "asks 8 years"},
            {title: "Senior Project Engineer", employer: "Menhir Photonics", asks: "asks 10 years"},
            {title: "Principal Algorithm Engineer (EO/IR Image Analysis)", employer: "Rocket Lab Corporation", asks: "asks 12 years"},
        ]},
];

/** A band in words after "for": "5 to 7", "8 or more". */
export const bandWords = (f: Pick<Floor, "says">) => f.says.replace(/^ask for /, "").replace(" years or more", " or more").replace(/ years$/, "");

/** The most common band among the jobs that state a number. */
export const commonest = () => FLOORS.slice(1).reduce((a, b) => (b.jobs > a.jobs ? b : a));

export const THE_LOBBY: StoryInfo = {
    slug: "the-lobby",
    page: "software-engineering",
    week: LOBBY.week,
    published: "2026-10-15",
    title: "The lobby is the biggest floor",
    card: `${fmt(LOBBY.years.unstated)} of the ${fmt(LOBBY.jobs)} software engineering jobs state no number of years.`,
    readable: LOBBY.readable,
    ask: [
        {key: "python", name: "Python"}, {key: "distributed systems", name: "Distributed systems"}, {key: "aws", name: "AWS"},
        {key: "go", name: "Go"}, {key: "typescript", name: "TypeScript"}, {key: "c++", name: "C++"}, {key: "java", name: "Java"},
    ],
};
