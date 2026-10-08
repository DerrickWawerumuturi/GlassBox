import type {ExplainerSection} from "@/lib/site-copy";

/*
 * /method: how Glassbox counts, in short sentences. Every line is checked
 * against the code it describes (named beside it), and must change when that
 * code does. Rules: CLAUDE.md section 2.
 */

/** The job sites the daily read takes jobs from (sources.py AGGREGATORS and KENYAN_BOARDS). Arbeitnow asks for a link back. */
export const JOB_SITES: Array<{name: string; href?: string}> = [
    {name: "RemoteOK"}, {name: "Remotive"}, {name: "Arbeitnow", href: "https://www.arbeitnow.com"}, {name: "Jobicy"},
    {name: "Himalayas"}, {name: "We Work Remotely"},
    {name: "Six Kenyan job feeds: MyJobMag, Corporate Staffing, Career Point Kenya, Jobweb Kenya, Summit Recruitment and Jobs in Kenya"},
];

export const METHOD_PAGE = {
    kicker: "Method",
    title: "How Glassbox counts",
    description: "Where our jobs come from, how each one is counted once, how skills, levels and years are read, and what we can't see.",
    dek: "Every market number on this site comes from one weekly count of live jobs. This is how it's made, and what it leaves out.",
    toc: "On this page",
    jump: "Jump to",
    sections: [
        {
            // backend/src/jobpool/sources.py, companies.txt, .github/workflows/job-pool.yml
            id: "sources", title: "Where the jobs come from",
            paragraphs: [
                "Every six hours we read public job boards.",
                "Many jobs come from employers' own boards: 255 boards on Greenhouse, Ashby, Lever and Workable. We chose that list by hand.",
                "The rest come from job sites and their feeds, listed below.",
                "Jobs found during someone's own CV scan, and links people paste in, are never counted. They are one person's search, not the market.",
            ],
        },
        {
            // companies.txt; docs/local/first-pages-decision.html (dataset vs market)
            id: "skew", title: "Which way the list leans",
            paragraphs: [
                "The hand picked list leans toward US employers, AI companies and fast growing tech firms. Many of their jobs are senior.",
                "So our count reads more senior than the wider job market. When we checked in October 2026, about 2 in 100 of our tech jobs that state years asked for a year or less. Of US tech jobs that state years, Indeed counted 18 in 100 in 2025.",
                "Big employers that post on their own career sites, or on Workday, aren't in the count yet.",
            ],
        },
        {
            // snapshot.counted, opportunities.duplicate_key, sources.POOL_WINDOWS and FULL_BOARDS, source_repository
            id: "once", title: "One job, counted once",
            paragraphs: [
                "A job counts while it is live. An employer's board lists every open job, so a job closes when two full reads of its board in a row don't list it. A read that fails, or brings back less than half the usual jobs, closes nothing.",
                "Job sites and feeds list only their newest jobs, so a job missing from one says nothing. Their jobs count until 30 days after we last saw them. Nothing posted more than 90 days ago counts.",
                "The same title at the same employer counts once, however many boards or cities list it. Two separate openings with the same title at one employer also count once.",
            ],
        },
        {
            // matching/requirements.py (_skills, THIN_BELOW), matching/skills.txt
            id: "skills", title: "How skills are read",
            paragraphs: [
                "Skills in jobs are read by fixed rules, not by a language model. We keep a list of 250 skills, each with the ways jobs spell it, and look for them in the job's text as whole words.",
                "A skill under a heading like Requirements counts as required. Under a heading like Nice to have, or softened with words like ideally or a plus, it counts as optional. A skill in the job title counts as required.",
                "The employer's own name is never counted as a skill.",
                "A job under 800 characters is too short to read. It counts as a job, but not toward skills.",
                "Your CV is read another way: a language model reads the skills on it. What happens to your CV explains where it goes.",
            ],
        },
        {
            // matching/roles.py (classify_family, classify_seniority), requirements._experience
            id: "levels", title: "How job types, levels and years are read",
            paragraphs: [
                "The job type, like backend or data science, comes from the title. For AI and machine learning titles, the text decides whether the work is training models or building apps.",
                "The level comes from the title first: words like intern, graduate, junior, senior, staff or principal. Then the board's own level, if it gives one. Then wording senior jobs use, like \"proven track record\". Then the years the job asks for.",
                "Years are the highest figure a job requires. A range counts from its lower end. \"Ideally 5 years\" is optional, not required. \"No experience required\" counts as zero.",
                "When a rule changes, every job is read again with the new rule.",
            ],
        },
        {
            // backend/src/jobpool/market_pages.py (is_entry_level, SOFTWARE, MIN_READABLE)
            id: "entry-level", title: "Entry level, on the entry level page",
            paragraphs: [
                "A job counts as entry level if its level reads as intern, entry level or junior. Or if its title says intern, graduate, new grad, entry level, early career or junior. Or if it requires 2 years of experience or less and its level isn't senior.",
                "Software means five job types: software engineering, backend, frontend, full stack and mobile.",
                "A page shows shares only when at least 100 of its jobs are long enough to read. Below that, a share describes a few employers more than the market.",
            ],
        },
        {
            // job-pool.yml (every 6 hours), publish.py (GATES), market_look (serves the latest publication)
            id: "refresh", title: "How fresh it is",
            paragraphs: [
                "Jobs are read every six hours. The market count is published once a week, on Monday, from the jobs read that day.",
                "Before it goes up, a new week is checked. Enough jobs, read in the last day. Sources that answered. No jump from last week too large to trust. If a check fails, last week's count stays up and we try again six hours later.",
                "Every count says the week it was taken. Your CV scan and Opportunities use the jobs read most recently, not the weekly count.",
            ],
        },
        {
            id: "blind", title: "What we can't see",
            paragraphs: [
                "Jobs on boards we don't read, and jobs never posted in public.",
                "Skills a job names in words that aren't on our list.",
                "Whether a job is filled, how many people apply, or who gets hired.",
            ],
        },
    ] as ExplainerSection[],
    sitesTitle: "The job sites we read",
    backTitle: "Back to the count",
    back: [
        {href: "/", label: "This week's count"},
        {href: "/market", label: "What this week's tech jobs ask for"},
        {href: "/market/entry-level-software", label: "What entry level software jobs ask for"},
        {href: "/your-cv", label: "What happens to your CV"},
    ],
};
