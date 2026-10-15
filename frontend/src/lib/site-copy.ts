/*
 * The words of the site around the landing page: the header, /product and
 * /about. One place, so the header and the pages say the same thing.
 * Rules: CLAUDE.md section 2 (short plain sentences, "jobs", no telling anyone
 * what to do next). Privacy lines must stay true to the code (/your-cv).
 */

export const NAV = {
    product: "Product",
    market: "Market",
    about: "About",
    faq: "FAQ",
    signIn: "Sign in",
    dashboard: "Dashboard",
    withCv: "Compare your CV",
    menu: "Menu",
};

/** One section of a long explainer page (/method). */
export interface ExplainerSection {
    id: string;
    title: string;
    paragraphs: string[];
    quote?: string;
    /** A list that stands out from the text. */
    list?: {title: string; items: string[]};
}

/** One chapter of /product or /about: a picture on a coloured stage, then the words. */
export interface ProductChapter {
    /** The anchor. */
    id: string;
    /** Its name in the contents and on its tag. */
    name: string;
    /** A shorter name for the contents, when the tag's is long (/about). */
    chip?: string;
    /** The stage's colour: illustration, never data. */
    stage: "sky" | "lav" | "butter" | "mint" | "pink" | "peach";
    title: string;
    paragraphs: string[];
    quote?: string;
    caption?: string;
    /** A link after the caption. */
    link?: {label: string; href: string};
    /** A cropped screenshot (public/product/crop, example CV) and what it shows; the CV chapter is drawn instead. */
    shot?: {name: "market-demand" | "skills" | "opportunities" | "applications"; alt: string};
    /** The pen note on the stage, in Caveat. */
    pen?: string;
}

export const PRODUCT_PAGE = {
    kicker: "Product",
    title: "What Glassbox shows you",
    dek: "One PDF in. Four pages out, each one about where you stand.",
    toc: "On this page",
    chapters: [
        {
            id: "market-charts", name: "Market charts", stage: "sky", title: "The skills your jobs ask for",
            paragraphs: ["A scan reads your CV, finds the jobs that fit it, and counts what those jobs ask for. Four views: overview, demand, your skills, and what's not on your CV yet."],
            caption: "Demand, from an example scan of 58 jobs. Green is on the example CV. Hatched grey is not on it yet.",
            shot: {name: "market-demand", alt: "Demand: the 12 skills an example scan's 58 jobs ask for most, Python first at 26 of 58. The example CV's skills are green, the rest hatched grey."},
            pen: "green: on your CV",
        },
        {
            id: "your-skills", name: "Your skills", stage: "lav", title: "How your skills connect",
            paragraphs: ["Your skills sit on the left. Skills the same jobs ask for, not on your CV yet, sit on the right. A bridge joins two when jobs ask for both."],
            quote: "We show the link. What you do with it is yours.",
            caption: "Bridges for the example CV, counted from 58 jobs. Lime marks the one skill most connected to it. It is a count, not advice.",
            shot: {name: "skills", alt: "Bridges from the example CV's eight skills to eight it doesn't list. Go is lime: linked to 8 of its skills."},
            pen: "thicker bridge, more jobs ask for both",
        },
        {
            id: "opportunities", name: "Opportunities", stage: "butter", title: "Jobs that ask for what you have",
            paragraphs: ["Every day we read new jobs from public job boards and match them to your CV. Each one says why it is there, and what is not on your CV yet."],
            caption: "Two jobs for the example CV. Each shows how well it matches, the skills it has, and the ones not on the CV yet.",
            shot: {name: "opportunities", alt: "Two stretch jobs for the example CV, at 35% and 54% match, each with ticks for the skills it has and minuses for the ones not on it yet."},
            pen: "✓ on your CV · − not yet",
        },
        {
            id: "applications", name: "Applications", stage: "mint", title: "Every job you applied to, in one list",
            paragraphs: ["Save a job from Opportunities, paste a link, or type one in. Move each one along: applied, screening, interview, offer."],
            caption: "The tracker with six example applications. A spreadsheet of past ones imports in one go.",
            shot: {name: "applications", alt: "The tracker with six example applications, each with its company, date, source and status."},
            pen: "jobs from other sites too",
        },
        {
            // Privacy lines: true to the code today (CLAUDE.md, "Current truth"; /your-cv has them line by line).
            id: "your-cv", name: "Your CV and privacy", stage: "pink", title: "Your PDF is read, then deleted",
            paragraphs: [
                "One PDF is enough. A scan takes about a minute.",
                "We delete the PDF after reading it. Its text goes to Groq, a US company, to read the skills.",
                "Signed in, we keep only the skills and the values worked out from your latest CV. Never the file, your contact details or your history. Delete them any time.",
            ],
            caption: "The whole story, line by line:",
            link: {label: "What happens to your CV", href: "/your-cv"},
        },
    ] as ProductChapter[],
    /** The drawings' words: the hero's open box, and what happens to a CV. */
    drawn: {
        hero: ["one PDF in,", "four pages out"],
        cvLabel: "A CV goes into the box. Its text goes to Groq, a US company, to read the skills. The PDF is deleted after reading. Signed in, the skills are kept, not the file.",
        groq: "its text → Groq (US), to read the skills",
        kept: ["signed in, we keep", "the skills, not the file"],
        deleted: "the PDF: deleted after reading",
    },
    /** The live count, as a till receipt: each line names what it counts. */
    count: {
        title: "The weekly count",
        week: (date: string) => `week of ${date}`,
        jobs: (types: number) => `tech jobs this week, across ${types} job types`,
        /** /product only: joins the scan chapter above it (58 jobs) to this receipt (every job). */
        note: "Your dashboard counts the jobs that fit your CV. The weekly count on Market counts all of them.",
        line: (skill: string, n: string, of: string) => `${skill} is the skill backend jobs ask for most: ${n} of ${of} this week.`,
        links: [
            {href: "/market", label: "The week in tech jobs"},
            {href: "/method", label: "How Glassbox counts"},
        ],
    },
    closing: "There's more of you in these jobs than you think.",
    reading: "Reading your CV. A run takes about a minute.",
    cta: "Add your CV",
    signUp: "Sign up",
};

/** The product's four pages, in order: the landing's "What you get" links each to its chapter. */
export const FEATURES = PRODUCT_PAGE.chapters.slice(0, 4);

/*
 * /about in the editorial look (founder, 15 Oct 2026), after the approved
 * prototype (docs/local/editorial-sprint/about-page). The same chapters and
 * words as before, drawn. Privacy lines checked against the code on 15 Oct:
 * backend src/matching/kept_cv.py, main.py (/analyze, the deletes) and
 * src/database/repositories/user_repository.py. /your-cv has them line by line.
 */
export const ABOUT_PAGE = {
    kicker: "About",
    title: "Why Glassbox",
    dek: "Job ads list everything. We count what this week's jobs really ask for, and show you where you stand.",
    toc: "On this page",
    chapters: [
        {
            id: "why", name: "Why job ads overwhelm", chip: "Job ads", stage: "butter", title: "Twenty skills, one ad",
            paragraphs: [
                "A job ad can name twenty skills. Read a few in a row and they look like a wall.",
                "Some of those asks are common. Some appear in only a handful of jobs. One ad on its own can't tell you which is which.",
                "So people guess. Some apply for everything. Some apply for nothing. Both are tiring.",
            ],
            caption: "Drawn, not a real ad. Every brick is the same size, because one ad gives no way to weigh them.",
        },
        {
            id: "what-we-count", name: "What we count, and how", chip: "What we count", stage: "sky", title: "From the boards to the Monday count",
            paragraphs: ["We read mostly tech jobs in the US and Europe, for now. Each one goes through the same four steps."],
        },
        {
            id: "we-show", name: "We show, you decide", stage: "lav", title: "A map with no arrows",
            paragraphs: [
                "We show where you stand against today's jobs. We don't tell you what to learn, where to apply or what to do next.",
                "What's on your CV comes first. What isn't says \"not on your CV yet\". Not a verdict, a count.",
            ],
            quote: "A low number is not a bad sign. It counts overlap with today's jobs, not you.",
            caption: "Green is on your CV. Hatched grey is not on it yet. The pin is the count; the route is yours.",
        },
        {
            id: "your-data", name: "On your side, with your data", chip: "Your data", stage: "pink", title: "Your PDF is read, then deleted",
            paragraphs: [
                "We never store your PDF. We read its text, then delete the file straight away.",
                "To read it, we send that text to Groq, an AI service from a US company. It picks out your skills, roles and experience.",
                "Not signed in, we keep nothing about you on our servers. Your results stay in your own browser.",
            ],
        },
        {
            id: "not", name: "What Glassbox is not", chip: "What it isn't", stage: "mint", title: "Three things it isn't",
            paragraphs: [
                "It is not a job board. We don't post jobs; each one links to its source.",
                "It is not a recruiter. Nobody sees your CV to hire you.",
                "It is not a coach. It counts; the choices stay yours.",
            ],
        },
        {
            id: "next", name: "What's next", stage: "peach", title: "The Count, still sealed",
            paragraphs: [
                "We're working on The Count: one number a month from the jobs we read, with the data, so you can check it.",
                "It isn't out yet. When it is, it will be on this site.",
            ],
        },
    ] as ProductChapter[],
    /** The four counting steps, as /method describes them (its numbers: backend companies.txt and skills.txt). */
    steps: [
        {title: "Read", body: "Every six hours we read public job boards: 255 employers' own boards, plus job sites and their feeds.", pen: "every six hours"},
        {title: "Once", body: "A job listed on two boards counts once.", pen: "one job, one count"},
        {title: "Match", body: "Skills are matched against a fixed list of real skill names. A phrase like \"custom backend\" is not a skill, so it never counts.", pen: "not a skill, not counted"},
        {title: "Publish", body: "The weekly count goes up every Monday. Every number on the site says how many jobs it comes from, and the date.", pen: "a new count every Monday"},
    ],
    stepsCaption: {before: "Each step as", link: {label: "How Glassbox counts", href: "/method"},
        after: "describes it. The 255 employer boards and the list of 250 skill names are its numbers."},
    /** The live count on its receipt: each line names what it counts. */
    count: {
        named: (skill: string, n: string, of: string) => `${skill} is named in ${n} of the ${of} backend jobs we read.`,
        links: [{href: "/market", label: "The week in tech jobs"}],
    },
    /** What is kept, signed in, on two sheets. True to the code today; /your-cv says it line by line. */
    ledger: {
        label: "What we keep when you are signed in",
        kept: "Signed in, we keep",
        groups: [
            {title: "What matching needs, from your latest CV", items: ["your skills", "the roles you aim for", "your level", "years of experience",
                "education level", "location and languages", "industries and keywords it names", "work type and pay, if stated"]},
            {title: "And, to know the same CV again", items: ["the file name", "the date we read it", "a fingerprint of the text"]},
            {title: "And what you do here", items: ["your latest scan results", "the applications you track"]},
        ],
        note: "a new CV replaces the old one",
        never: "Never kept from your CV",
        neverItems: ["the file", "its text", "your name", "contact details", "links", "your summary", "the companies, dates and schools"],
        foot: "In your profile you can delete all your data at once. Deleting your account removes everything.",
    },
    /** The drawings' words: pen notes, labels and what each picture says for a screen reader. */
    drawn: {
        hero: {label: "One job ad with twenty skills goes into the box. Out comes a count of which skills many jobs ask for, and which only a few do.",
            ad: "REQUIREMENTS", counted: "MANY JOBS, COUNTED", pen: ["one ad: twenty asks,", "all the same size", "many jobs, counted:", "which asks are common"]},
        why: {label: "A wall of twenty skill bricks, as one job ad can list them, all the same size. Nothing on the wall says which are common.",
            pen: ["which of these are common?", "one ad can't say"]},
        steps: {sameJob: "SAME JOB", names: "250 NAMES", monday: "MONDAY", mon: "Mon", count: "THE COUNT", day: "24H"},
        "we-show": {label: "A map of skills. Green islands are on your CV, hatched grey ones are not on it yet. A pin says you are here. No route is drawn.",
            here: "you are here", pen: "no route drawn. that part is yours."},
        not: {label: "Three stamps, each crossed out: job board, recruiter, coach.", notA: "NOT A",
            stamps: [["Job board", "links to its source"], ["Recruiter", "nobody sees it to hire you"], ["Coach", "it counts; you choose"]]},
        next: {label: "A sealed envelope marked The Count, one number a month, with the data. Its number is still hatched grey: not out yet.",
            count: "THE COUNT", lines: ["one number a month,", "with the data"], pen: "not out yet"},
    },
    valuesTitle: "What we hold to",
    values: [
        {title: "Show the evidence", body: "Every number says what it counts and when."},
        {title: "Strengths first", body: "What you have comes before what's not on your CV yet."},
        {title: "Less but better", body: "A few clear counts, not a wall of charts."},
        {title: "On your side", body: "Your data is yours. Delete it any time."},
    ],
};
