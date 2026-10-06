/*
 * Every word on the landing page, in one place. The founder's picks from the
 * copy deck (docs/local/copy-deck.html, 5 Oct 2026), all ten slots.
 *
 * Voice: a calm friend who has done the research. Lead with a counted fact
 * and name what every number counts. Short plain sentences, full stops not
 * dashes, no hyphenated compounds. "Jobs", never "postings". "Not on your CV
 * yet", never "missing". State facts and ask questions; never tell anyone
 * what to learn or do next. Buttons are one to three words; the context sits
 * outside the button as a lead line.
 */

import type {Level} from "@/lib/landing/look";

/** The three trust lines: fixed text, used everywhere a CV is asked for. */
export const TRUST = ["We read your CV for the skills.", "We keep the skills, not the file.", "Delete them any time."] as const;

const LEVEL_PLURAL: Record<Level, string> = {junior: "are junior roles", mid: "are mid level", senior: "are senior or above"};
const LEVEL_ONE: Record<Level, string> = {junior: "is a junior role", mid: "is mid level", senior: "is senior or above"};

export const COPY = {
    meta: {
        title: "What skills do jobs ask for? Counted today",
        description: "We read thousands of tech jobs every day and count the skills they ask for. Look around free. Add your CV to see which you already have.",
        ogTitle: "Glassbox · The list is shorter than it looks",
        ogDescription: "Job ads seem to ask for everything. We count what today's tech jobs really ask for, and show which skills you already have.",
    },
    hero: {
        eyebrow: (total: string | null) => (total ? `${total} jobs open today` : "Jobs open today"),
        title: "The list is shorter than it looks.",
        lede: "Job ads list everything. We count what today's jobs really ask for, and show you where you stand.",
    },
    hiring: {
        title: "Who they're hiring.",
        line: "Every square is one job open today. Pick a job type.",
    },
    count: {
        chapter: "Today's count",
        kicker: (date: string) => `Today's count · ${date}`,
        howWeCount: "Each square is one job open today. Junior counts intern, entry and junior. Senior counts senior, staff, lead and principal. A job listed on two boards counts once.",
        levels: ["Junior", "Mid level", "Senior +"],
        more: "More",
        moreCount: (n: number) => `${n} more job types`,
        say: (n: number, of: string, family: string, level: Level) => n === 0
            ? `None of the ${of} ${family} jobs open today ${LEVEL_PLURAL[level]}.`
            : `${n.toLocaleString("en")} of the ${of} ${family} jobs open today ${n === 1 ? LEVEL_ONE[level] : LEVEL_PLURAL[level]}.`,
        share: (pct: string, family: string) => `${pct} of ${family} jobs`,
        legendOne: (perSquare: number) => (perSquare === 1 ? "one job at this level" : `${perSquare} jobs at this level`),
        legendOther: "other levels",
        legendUnstated: "level not stated",
        unstated: (n: string) => `${n} don't say`,
        next: (what: string) => `Next: ${what}`,
        paused: "Paused while you look.",
        pausedAd: "Paused while your ad is showing.",
        stopped: "Stopped. Press play to move on.",
        reduced: "Nothing changes on its own here. Pick a job type and a level.",
        yourCv: (have: number, family: string) => `Your CV has ${have} of the 10 skills ${family} jobs ask for most.`,
        unavailable: "Today's count is not available right now. Try again in a minute.",
    },
    wall: {
        chapter: "The jobs behind the count",
        title: "The jobs behind the count",
        note: "lit = in today's count",
        allLit: (n: string, level: string, family: string) => `All ${n} ${level} ${family} jobs open today, lit.`,
        someLit: (lit: number, n: string, level: string, family: string) => `Here are some of them. ${lit} of the ${n} ${level} ${family} jobs open today, lit. The rest, dimmed.`,
        more: (rest: string, family: string) => `And ${rest} more ${family} jobs open today.`,
        foot: "Titles and companies only. We don't copy the ads.",
    },
    glass: {
        chapter: "Hold a job ad to the glass.",
        lede: "Paste any job ad. See which of its asks are common, and which are rare.",
        paste: "Paste a job ad",
        emptyClipboard: "Your clipboard is empty. Copy a job ad first.",
        pressToPaste: (keys: string) => `Press ${keys} to paste`,
        reading: "Reading the ad…",
        readingLink: "Reading the link…",
        linkFailed: "That link can't be read. Copy the ad text and paste it instead.",
        tooMany: "That's a lot of ads for one hour. Try again soon.",
        oneOfToday: (level: string, family: string) => `one of today's ${level} ${family} jobs`,
        yourAd: "your ad · read on our server, not kept",
        asksFor: "Asks for",
        optional: "Optional",
        yearsAsked: (y: number) => `${y}+ years asked`,
        yearsNotStated: "years not stated",
        posted: "posted",
        dateNotStated: "date not stated",
        placeNotStated: "place not stated",
        viewOriginal: "View original ad",
        back: "Back to today's ads",
        asksKick: (n: number) => (n ? `This ad asks for ${n} skill${n === 1 ? "" : "s"}` : "No skills read yet"),
        howMany: "How many of today's",
        nameEach: "jobs name each",
        readToday: (n: string) => `${n} read today`,
        required: "required",
        optionalKey: "optional",
        onCv: "on your CV",
        notYet: "not on your CV yet",
        rarest: (name: string, n: number, m: string, family: string) => `${name}: in ${n} of ${m} ${family} jobs today`,
        rarestNote: "the rarest ask in this ad",
        haveOf: (have: number, n: number) => `${have} of the ${n} asks in this ad are on your CV.`,
        haveNote: "from your scan",
        none: "We couldn't find skills we know in this text. Try pasting the whole ad.",
    },
    sticky: {
        line: (context: {kind: "default"} | {kind: "count"; n: number} | {kind: "ad"; n: number}) =>
            context.kind === "count" ? `Where would you sit among these ${context.n.toLocaleString("en")}?`
                : context.kind === "ad" ? `${context.n} asks in this ad. Which are yours?` : "See where you stand.",
        small: "We keep the skills, not the file.",
        cta: "Add your CV",
        signUp: "Sign up",
    },
    cv: {
        title: "There's more of you in these jobs than you think.",
        line: "Add your CV. We mark every skill today's jobs ask for that you already have.",
        lead: "Free. One PDF. No account needed.",
        cta: "Add your CV",
        signUp: "Sign up",
        trust: [{title: "Read", body: TRUST[0]}, {title: "Kept", body: TRUST[1]}, {title: "Delete", body: TRUST[2]}],
        previewKick: "This ad, with your CV",
        example: "example",
        fromScan: "from your scan",
        exampleHave: (have: number, n: number) => `In this example, ${have} of the ${n} asks are on the CV.`,
        legendHave: "on your CV",
        legendGap: "not on your CV yet",
        previewHave: (have: number, n: number) => `${have} of the ${n} asks in this ad are on your CV.`,
        reading: "Reading your CV. A run takes about a minute.",
        done: "Your CV is in. What's on it is marked on this page.",
        seeResults: "See your results",
    },
    lower: {
        how: {
            chapter: "How we count",
            points: [
                "New jobs from public job boards, every day.",
                "A job listed twice counts once.",
                "Real skill names only. Every number shows its count and date.",
            ],
        },
        get: {
            chapter: "What you get with your CV",
            points: [
                {title: "Market", body: "What today's jobs ask for most, yours marked first."},
                {title: "Your skills", body: "How your skills connect to what jobs ask for."},
                {title: "Opportunities", body: "Jobs that ask for what you have, and why."},
                {title: "Applications", body: "Every job you applied to, in one list."},
            ],
        },
        theCount: {
            chapter: "The Count",
            lines: ["One number a month, from every job we read.", "With the data, so you can check it."],
        },
        faq: {
            chapter: "Questions",
            items: [
                {q: "What happens to my CV?", a: `${TRUST.join(" ")} To read it, its text goes to Groq, a US service.`, link: {href: "/your-cv", label: "What happens to your CV"}},
                {q: "Do I need an account?", a: "No. Look around and check your CV without one. Sign up to keep your results and track applications across devices."},
                {q: "Is a low number a bad sign?", a: "No. It counts overlap with today's jobs. It's not a verdict on you."},
                {q: "Where do the jobs come from?", a: "Public job boards, read every day. Mostly tech jobs in the US and Europe for now."},
                {q: "Does it cost anything?", a: "No."},
            ],
        },
    },
    footer: {
        line: "We show. You decide.",
        sub: "Counted from public job boards, every day. Mostly tech jobs in the US and Europe.",
    },
} as const;

/** Job type names, as the page writes them. */
export const FAMILY_LABEL: Record<string, string> = {
    backend: "backend", frontend: "frontend", full_stack: "full stack", qa: "QA", machine_learning: "machine learning",
    data_engineering: "data engineering", devops: "DevOps", mobile: "mobile", design: "design",
    software_engineering: "software engineering", data_science: "data science", data_analytics: "data analytics",
    security: "security", ai: "AI", embedded: "embedded", game: "game", it_support: "IT support", solutions: "solutions",
    product: "product",
};
