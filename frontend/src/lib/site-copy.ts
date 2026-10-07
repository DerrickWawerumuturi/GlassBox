/*
 * The words of the site around the landing page: the header's Product menu,
 * /product and /about. One place, so the menu and the pages say the same thing.
 * Rules: CLAUDE.md section 2 (short plain sentences, "jobs", no telling anyone
 * what to do next). Privacy lines must stay true to the code (/your-cv).
 */

export interface Feature {
    /** The /product anchor. */
    id: string;
    title: string;
    /** One line, for the header menu. */
    nav: string;
    /** Two short sentences, for /product. */
    body: string;
}

export const FEATURES: Feature[] = [
    {
        id: "market", title: "Market", nav: "What today's jobs ask for most, counted.",
        body: "What today's jobs ask for most, counted from every job we read. The skills on your CV are marked first.",
    },
    {
        id: "your-skills", title: "Your skills", nav: "How the skills on your CV connect.",
        body: "Your skills, and the skills jobs ask for alongside them. Each link says how many jobs ask for both.",
    },
    {
        id: "opportunities", title: "Opportunities", nav: "Jobs that ask for what you have.",
        body: "Jobs from today's count that ask for what you have. Each one says why it's there, and what's not on your CV yet.",
    },
    {
        id: "applications", title: "Applications", nav: "Every job you applied to, in one list.",
        body: "Every job you applied to, with its status and date. Jobs from other sites too.",
    },
];

export const NAV = {
    product: "Product",
    how: "How it works",
    about: "About",
    faq: "FAQ",
    signIn: "Sign in",
    dashboard: "Dashboard",
    withCv: "See it with your CV",
    menu: "Menu",
};

/** One section of a long explainer page (/product, /about). */
export interface ExplainerSection {
    id: string;
    title: string;
    paragraphs: string[];
    /** A screenshot (public/product) and what it shows. */
    shot?: {name: "overview" | "market" | "market-demand" | "skills" | "opportunities" | "applications" | "upload"; caption: string};
    quote?: string;
    /** A list that stands out from the text. */
    list?: {title: string; items: string[]};
}

export const PRODUCT_PAGE = {
    kicker: "Product",
    title: "What Glassbox shows you",
    dek: "Today's jobs, counted. Then where you stand, once your CV is in. Five parts, one page each.",
    toc: "On this page",
    jump: "Jump to",
    numbers: "By the numbers",
    /** Beside the Market section: one counted question in full, and how the count is made. */
    marketLinks: [
        {href: "/market/entry-level-software", label: "What entry level software jobs ask for"},
        {href: "/method", label: "How Glassbox counts"},
    ],
    numberLines: (total: string, types: number, skill: string, n: string, of: string, date: string) => [
        `${total} jobs open today, across ${types} job types.`,
        `${skill} is the skill backend jobs ask for most: ${n} of ${of} today.`,
        `Counted on ${date}.`,
    ],
    sections: [
        {
            id: "market", title: "Market",
            paragraphs: [
                "A scan reads your CV, then counts what the jobs it finds ask for.",
                "Market charts shows that count four ways: an overview, demand, your skills, and the skills not on your CV yet.",
                "Green is on your CV. Grey hatching is not yet. Every chart says how many jobs it counts.",
            ],
            shot: {name: "market-demand", caption: "Demand: what the jobs in an example scan ask for, the CV's skills in green."},
        },
        {
            id: "your-skills", title: "Your skills",
            paragraphs: [
                "Your skills sit on the left. The skills these jobs ask for that your CV doesn't list sit on the right.",
                "A bridge joins two skills when jobs ask for both. The thicker it is, the more jobs do.",
                "Lime marks the one skill most connected to yours. It is a count, not advice.",
            ],
            shot: {name: "skills", caption: "Bridges for the example CV: from what it has to what the same jobs ask for."},
            quote: "We show the link. What you do with it is yours.",
        },
        {
            id: "opportunities", title: "Opportunities",
            paragraphs: [
                "Every day we read new jobs from public job boards. Opportunities matches them to your CV.",
                "Each job gets a match and a tier: strong, good, stretch or out of reach.",
                "Each one says why. The skills it asks for that you have get a tick. The ones not on your CV yet get a minus.",
            ],
            shot: {name: "opportunities", caption: "Stretch roles for the example CV, each with the skills it asks for."},
        },
        {
            id: "applications", title: "Applications",
            paragraphs: [
                "Every job you applied to, in one list. Save a job from Opportunities, paste a link, or type one in.",
                "Move each one along: applied, screening, interview, offer. Set the date you applied on a calendar.",
                "Jobs from other sites belong here too. A spreadsheet of past applications imports in one go.",
            ],
            shot: {name: "applications", caption: "The tracker with six example applications."},
        },
        {
            id: "your-cv", title: "Your CV and privacy",
            paragraphs: [
                "One PDF is enough. A scan takes about a minute.",
                "We never store your PDF. We read its text, then delete the file straight away.",
                "To read it, the text goes to Groq, an AI service from a US company. It picks out your skills, roles and experience.",
                "Not signed in, we keep nothing about you on our servers. Signed in, we keep only what matching needs from your latest CV, never the file. Delete it any time.",
            ],
            shot: {name: "upload", caption: "Adding a CV: one PDF, read and then deleted."},
        },
    ] as ExplainerSection[],
    shot: "Screenshot coming",
    closing: "There's more of you in these jobs than you think.",
    lead: "Free. One PDF. No account needed.",
    reading: "Reading your CV. A run takes about a minute.",
    cta: "Add your CV",
    signUp: "Sign up",
};

export const ABOUT_PAGE = {
    kicker: "About",
    title: "Why Glassbox",
    dek: "Job ads list everything. We count what today's jobs really ask for, and show you where you stand.",
    toc: "On this page",
    jump: "Jump to",
    sections: [
        {
            id: "why", title: "Why job ads overwhelm",
            paragraphs: [
                "A job ad can name twenty skills. Read a few in a row and they look like a wall.",
                "Some of those asks are common. Some appear in only a handful of jobs. One ad on its own can't tell you which is which.",
                "So people guess. Some apply for everything. Some apply for nothing. Both are tiring.",
            ],
        },
        {
            id: "what-we-count", title: "What we count, and how",
            paragraphs: [
                "Every day we read new jobs from public job boards. Mostly tech jobs in the US and Europe, for now.",
                "A job listed on two boards counts once.",
                "We match skills against a fixed list of real skill names. A phrase like \"custom backend\" is not a skill, so it never counts.",
                "Every number on the site says how many jobs it comes from, and the date.",
            ],
        },
        {
            id: "we-show", title: "We show, you decide",
            paragraphs: [
                "We show where you stand against today's jobs. We don't tell you what to learn, where to apply or what to do next.",
                "What's on your CV comes first. What isn't says \"not on your CV yet\". Not a verdict, a count.",
            ],
            quote: "A low number is not a bad sign. It counts overlap with today's jobs, not you.",
        },
        {
            id: "your-data", title: "On your side, with your data",
            paragraphs: [
                "We never store your PDF. We read its text, then delete the file straight away.",
                "To read it, we send that text to Groq, an AI service from a US company. It picks out your skills, roles and experience.",
                "If you are not signed in, we keep nothing about you on our servers. Your results stay in your own browser.",
                "If you are signed in, we keep only what matching needs from your latest CV: your skills, the roles you aim for, your level, years of experience, education level, location and languages. Never the file or its text, never your name, contact details, links or summary.",
                "We also keep the file name, the date we read it, and a fingerprint of the text so we know the same CV again. A new CV replaces the old one.",
                "In your profile you can delete the skills we kept, or all your data at once. Deleting your account removes everything.",
            ],
        },
        {
            id: "not", title: "What Glassbox is not",
            paragraphs: [
                "It is not a job board. We don't post jobs; each one links to its source.",
                "It is not a recruiter. Nobody sees your CV to hire you.",
                "It is not a coach. It counts; the choices stay yours.",
            ],
        },
        {
            id: "next", title: "What's next",
            paragraphs: [
                "We're working on The Count: one number a month from the jobs we read, with the data, so you can check it.",
                "It isn't out yet. When it is, it will be on this site.",
            ],
        },
    ] as ExplainerSection[],
    numbersTitle: "Two numbers as we write them, counted today",
    valuesTitle: "What we hold to",
    values: [
        {title: "Show the evidence", body: "Every number says what it counts and when."},
        {title: "Strengths first", body: "What you have comes before what's not on your CV yet."},
        {title: "Less but better", body: "A few clear counts, not a wall of charts."},
        {title: "On your side", body: "Your data is yours. Delete it any time."},
    ],
};
