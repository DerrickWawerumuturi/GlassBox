import type {Metadata} from "next";
import {notFound, redirect} from "next/navigation";

import MarketArticle from "@/components/market-page/MarketArticle";
import {marketForWeek, type PageWeeks, weeksForPage} from "@/lib/landing/look-server";
import {longDate} from "@/lib/market-page";
import {isMarketName, isWeek, MARKET_NAMES, MARKET_PAGES, type MarketBody, type MarketName, marketPath, weekPath} from "@/lib/market-pages";
import {pageDescription, pageTitle} from "@/lib/market-story";
import {publicPage} from "@/lib/seo";

/*
 * A past week of a market page (GitHub issue #16; docs/decisions/market-pages.md,
 * "Past weeks"): the same template with that week's published count, dated at
 * the top. Built at deploy for every past week; a week that turns past after
 * the deploy renders on its first visit and is then kept. No timer: the Monday
 * refresh drops the /market layout and with it these pages, so their lists
 * show the new week (lib/revalidate.ts). A render reads the weeks list, a few
 * hundred bytes, and this page's body from that week's row, nothing else.
 * A name or week that can't be one is a 404 before any read; the live week
 * goes to the live page. Not `dynamicParams = false`, as ../../page.tsx says.
 */

export const revalidate = false;

export async function generateStaticParams() {
    const weeks = await Promise.all(MARKET_NAMES.map((page) => weeksForPage(page)));
    return MARKET_NAMES.flatMap((page, i) => weeks[i].past.map(({week}) => ({page, week})));
}

type Props = {params: Promise<{page: string; week: string}>};

type Past = {name: MarketName; week: string; weeks: PageWeeks; page: MarketBody};

/** The past week asked for, the live page's address for the live week, or null for no page. */
async function pastWeek(params: Props["params"]): Promise<Past | {live: string} | null> {
    const {page: name, week} = await params;
    if (!isMarketName(name) || !isWeek(week)) return null;
    const weeks = await weeksForPage(name);
    if (weeks.live?.week === week) return {live: marketPath(name)};
    if (!weeks.past.some((w) => w.week === week)) return null;
    const page = await marketForWeek(name, week);
    return page ? {name, week, weeks, page} : null;
}

export async function generateMetadata({params}: Props): Promise<Metadata> {
    const past = await pastWeek(params);
    if (!past || "live" in past) return {};
    const info = MARKET_PAGES[past.name];
    const title = `${pageTitle(info, past.page)} in the week of ${longDate(past.week)}`, description = pageDescription(info, past.page);
    // The site's share image: the page's own draws the live week's finding.
    return publicPage(weekPath(past.name, past.week), {title, description, share: {title, description}, article: true});
}

export default async function PastWeekPage({params}: Props) {
    const past = await pastWeek(params);
    if (past && "live" in past) redirect(past.live);
    if (!past) notFound();
    // The other pages' counts are this week's, so a past week's rail links them without numbers.
    return <MarketArticle info={MARKET_PAGES[past.name]} page={past.page} others={{}} weeks={past.weeks} showing={past.week} />;
}
