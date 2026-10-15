import {COPY, FAMILY_LABEL} from "@/components/landing/copy";
import {lookJobs, type Look, type LookFamily as Backend} from "@/lib/landing/look";
import {weekDate, weekStart} from "@/lib/market-page";
import {ABOUT_PAGE, PRODUCT_PAGE} from "@/lib/site-copy";

/*
 * The count card, "The count", on /product and /about, from this week's
 * published count (lookForPage: the database, never the API). Each line names
 * what it counts. No count (dev without a publication) is no numbers: the
 * card keeps only its links.
 */

export interface CountReceipt {
    /** The Monday the count was published for, for <time>. */
    week: string;
    /** "week of 12 October 2026". */
    when: string;
    /** Every job counted this week, over every job type. */
    total: string;
    /** What the big number counts. */
    jobs: string;
    /** A page's facts from the backend jobs, each naming what it counts. */
    lines: string[];
}

const C = PRODUCT_PAGE.count;

/** The skill backend jobs name most, and in how many. */
function topSkill(backend: Backend): [string, number] | null {
    const [key, n] = Object.entries(backend.skills).sort((a, b) => b[1] - a[1])[0] ?? [];
    return key ? [key, n] : null;
}

/** /product: the skill backend jobs ask for most, of how many. */
function productLines(look: Look, backend: Backend): string[] | null {
    const top = topSkill(backend);
    return top && [C.line(look.skills[top[0]] ?? top[0], top[1].toLocaleString("en"), backend.readable.toLocaleString("en"))];
}

/** /about: how many backend jobs are junior roles, and the skill they name most. */
export function aboutLines(look: Look, backend: Backend): string[] | null {
    const top = topSkill(backend);
    return top && [
        COPY.count.say(backend.seniority.junior, backend.jobs.toLocaleString("en"), FAMILY_LABEL.backend, "junior"),
        ABOUT_PAGE.count.named(look.skills[top[0]] ?? top[0], top[1].toLocaleString("en"), backend.readable.toLocaleString("en")),
    ];
}

export function countReceipt(look: Look | null, pick: (look: Look, backend: Backend) => string[] | null = productLines): CountReceipt | null {
    const backend = look?.families.backend;
    if (!look || !backend) return null;
    const lines = pick(look, backend);
    if (!lines) return null;
    return {
        week: weekStart(look),
        when: C.week(weekDate(look)),
        total: lookJobs(look).toLocaleString("en"),
        jobs: C.jobs(Object.keys(look.families).length),
        lines,
    };
}
