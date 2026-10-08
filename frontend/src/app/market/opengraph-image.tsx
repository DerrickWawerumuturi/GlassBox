import {allMarkets} from "@/lib/market-pages";
import {shareImage, SHARE_SIZE} from "@/components/market-page/ShareImage";
import {fmt, weekDate} from "@/lib/market-page";

/* The hub's share preview: how many jobs the five pages count, and the week. */

export const alt = "What this week's tech jobs ask for, counted by Glassbox";
export const size = SHARE_SIZE;
export const contentType = "image/png";
export const revalidate = 300;

export default async function OgImage() {
    const pages = Object.values(await allMarkets()).filter((p) => p !== null);
    const roles = pages.filter((p) => p.families.length === 1);
    const jobs = roles.reduce((n, p) => n + p.jobs, 0);
    const kicker = pages[0] ? `MARKET · WEEK OF ${weekDate(pages[0]).toUpperCase()}` : "MARKET";
    return shareImage({kicker, big: jobs ? fmt(jobs) : "Counted", line: "software engineering, AI, machine learning and DevOps jobs, counted.", path: "/market"});
}
