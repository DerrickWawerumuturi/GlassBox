import {findingImage, shareImage, SHARE_SIZE} from "@/components/market-page/ShareImage";
import {fmt, weekDate} from "@/lib/market-page";
import {marketForPage} from "@/lib/market-pages";
import {TOPIC, unstatedShare, yearsCounts, yearsHeadline} from "@/lib/years-answer";

/*
 * The years page's share preview, the market pages' pattern
 * (app/market/[page]/opengraph-image.tsx): its answer, the count behind it,
 * and the share of early career titles that state no number lit in lime.
 */

export const alt = "How many years of experience entry level software jobs ask for, from Glassbox's weekly count";
export const size = SHARE_SIZE;
export const contentType = "image/png";
export const revalidate = 300;

// The address as the image prints it: the full one wraps under the wordmark.
const SHOWN = "/market/…/years-of-experience";

export function generateStaticParams() {
    return [{page: "entry-level-software"}];
}

export default async function OgImage() {
    const c = yearsCounts(await marketForPage("entry-level-software"));
    if (!c) return shareImage({kicker: "ENTRY LEVEL SOFTWARE JOBS", big: "Counted", line: TOPIC, path: SHOWN});
    const total = c.titled.stated + c.titled.unstated;
    return findingImage({
        kicker: `ENTRY LEVEL SOFTWARE JOBS · WEEK OF ${weekDate(c.page).toUpperCase()}`, title: yearsHeadline(c),
        line: `${fmt(c.titled.unstated)} of the ${fmt(total)} with an early career title state no number of years.`,
        lit: unstatedShare(c), path: SHOWN,
    });
}
