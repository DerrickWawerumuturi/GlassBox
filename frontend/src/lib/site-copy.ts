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
    how: "How we count",
    about: "About",
    faq: "FAQ",
    signIn: "Sign in",
    menu: "Menu",
};

export const PRODUCT_PAGE = {
    title: "What Glassbox shows you",
    lede: "Today's jobs, counted. Then where you stand, once your CV is in.",
    shot: "Screenshot coming",
    closing: "There's more of you in these jobs than you think.",
    lead: "Free. One PDF. No account needed.",
    reading: "Reading your CV. A run takes about a minute.",
    cta: "Add your CV",
    signUp: "Sign up",
};

export const ABOUT_PAGE = {
    title: "Why Glassbox",
    paragraphs: [
        {title: "Job ads list everything", body: "A job ad can name twenty skills. Read one after another, they look like a wall. It's hard to tell which asks are common and which are rare."},
        {title: "Counted, not guessed", body: "We read new jobs from public job boards every day and count what they ask for. Every number says how many jobs it comes from, and when."},
        {title: "We show, you decide", body: "We show where you stand against today's jobs. We don't tell you what to learn or where to apply. That part is yours."},
        {title: "On your side, with your data", body: "Your CV is read for its skills, then the file is deleted. Signed in, we keep the skills, not the file. Delete them any time."},
    ],
    valuesTitle: "What we hold to",
    values: [
        {title: "Show the evidence", body: "Every number says what it counts and when."},
        {title: "Strengths first", body: "What you have comes before what's not on your CV yet."},
        {title: "Less but better", body: "A few clear counts, not a wall of charts."},
        {title: "On your side", body: "Your data is yours. Delete it any time."},
    ],
};
