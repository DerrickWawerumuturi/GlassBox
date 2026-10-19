import type {StoryInfo} from "@/lib/stories/story";

/*
 * "Is entry level dead?" (entry level software): every number the story
 * shows, for one week. The week's figures are the entry level page of the
 * publication for the week of 19 October 2026 (market_publications id 4,
 * pages.entry-level-software), as read on 19 Oct
 * (docs/local/editorial-research/data-inventory.md, "Entry level software
 * page, week of 19 Oct"); the two earlier weeks are the same page in the
 * publications for 5 and 12 October (ids 1 and 3). "script L26" is line 26 of
 * the story's script (docs/local/editorial-sprint/stories/entry-level-dead/script.md).
 * A refresh edits this file only; is-entry-level-dead.test.ts then says which
 * sentences need reading again.
 */

/** One week of the entry level page: software jobs counted, and the entry level ones among them. */
export interface Week {
    /** The Monday of the week. */
    week: string;
    /** Software jobs counted: the five software families (experience.software.stated + unstated). */
    jobs: number;
    /** Entry level software jobs, by the page's rule (`jobs`). */
    entry: number;
}

export const ELD = {
    /** The Monday of the week counted. */
    week: "2026-10-19",
    /** Software jobs counted: experience.software, 2,409 that state years + 2,127 that don't. script L26. */
    jobs: 4536,
    /** Entry level software jobs (`jobs`), those whose ads we could read (`readable`), their employers (`employers`). script L27, L29. */
    entry: 629,
    readable: 627,
    employers: 250,
    /** Senior, lead or principal software jobs (`senior.jobs`). script L33. */
    senior: 2816,
    /** Internships among the entry level jobs (`internships`). script L30. */
    internships: 274,
    /** Software jobs with an early career title (experience.titled): those that state a number of years, and those that don't. script L35. */
    titled: {stated: 29, unstated: 339},
    /** Median required skills per readable ad, entry level and senior. script L37. */
    medianSkills: {entry: 4, senior: 6},
    /** The company boards read that week, and how many were added because they post graduate and intern jobs. script L71, L86. */
    boards: 255,
    gradBoards: 80,
    /** The three weeks counted so far (script L26 to L28): 5 and 12 October are publications 1 and 3. */
    weeks: [
        {week: "2026-10-05", jobs: 3274, entry: 532},
        {week: "2026-10-12", jobs: 3595, entry: 561},
        {week: "2026-10-19", jobs: 4536, entry: 629},
    ] as Week[],
    /** The two empty slots after them, the Mondays still to count. */
    next: ["2026-10-26", "2026-11-02"],
    /** The opening ad: title and employer as posted that week (`titles`). script L42. */
    ad: {title: "Junior Software Engineer", employer: "Prima"},
    /** Four internship titles and employers, as posted (`titles`). script L44 to L45. */
    internTitles: [
        {title: "Software Engineer Intern - Ads", employer: "Mirakl Labs"},
        {title: "Werkstudent (w/m/d) Software Development", employer: "Holzland Becker"},
        {title: "Ground Software Engineering Intern (Summer 2027)", employer: "Muon Space"},
        {title: "Backend Engineer - Internship (6 months)", employer: "Qonto"},
    ],
    /** The aside: an early career title that states years. script L46. */
    aside: {title: "Senior Back-End Engineer Intern", employer: "Flowai", years: 2},
    /** Outside facts, each checked at its address on 19 Oct 2026 (script L59 to L63, L79 to L82). */
    stanford: {
        pct: 19, url: "https://digitaleconomy.stanford.edu/publication/canaries-in-the-coal-mine/",
        cite: "Brynjolfsson, Chandar and Chen, Canaries in the Coal Mine?, Stanford Digital Economy Lab, revised 12 August 2026.",
    },
    indeed: {pct: 71, url: "https://hiringlab.indeed.com/2026/07/08/ai-and-job-postings-from-destruction-to-creation/", cite: "Indeed Hiring Lab, 8 July 2026."},
};

/** Software jobs that are neither entry level nor senior: mid level, or no level stated. script L33. */
export const MID = ELD.jobs - ELD.entry - ELD.senior;
/** Entry level jobs that are not internships: for everyone who has already finished. */
export const FINISHED = ELD.entry - ELD.internships;
/** Jobs with an early career title. */
export const TITLED = ELD.titled.stated + ELD.titled.unstated;
/** "14 of every 100": entry level software jobs per 100 software jobs, rounded. */
export const PER_100 = Math.round((100 * ELD.entry) / ELD.jobs);
/** "about 1 in 7". */
export const ONE_IN = Math.round(ELD.jobs / ELD.entry);
/** A week's entry level share to one decimal ("13.9"), as a number. */
export const share = (w: Week) => Math.round((1000 * w.entry) / w.jobs) / 10;
/** Jobs as drawn people: one drawn person is `per` jobs, rounded. */
export const drawn = (jobs: number, per: number) => Math.round(jobs / per);
/** One drawn person is 10 jobs on a wide screen and 25 on a phone (the stage is the same 640 units at 358 px). */
export const PER = {wide: 10, phone: 25} as const;

export const IS_ENTRY_LEVEL_DEAD: StoryInfo = {
    slug: "is-entry-level-dead",
    page: "entry-level-software",
    week: ELD.week,
    published: "2026-10-19",
    title: "Is entry level dead?",
    card: `${ELD.entry} of the ${ELD.jobs.toLocaleString("en")} software jobs in one week were entry level, about 1 in ${ONE_IN}. ${ELD.internships} of them were internships.`,
    readable: ELD.readable,
    // The story names no skills (only a median count of them), so its CV ask compares a CV with the latest jobs (StoryCvAsk).
    ask: [],
};
