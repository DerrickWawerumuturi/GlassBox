import type {Metadata} from "next";
import {notFound} from "next/navigation";

import YearsArticle from "@/components/market-page/YearsArticle";
import {fmt} from "@/lib/market-page";
import {YEARS_PATH} from "@/lib/market-names";
import {marketForPage} from "@/lib/market-pages";
import {publicPage} from "@/lib/seo";
import {TOPIC, yearsAnswer, yearsCounts, yearsHeadline} from "@/lib/years-answer";

/*
 * How many years of experience entry level software jobs ask for, from the
 * entry level page's weekly count (docs/decisions/market-pages.md, "Years of
 * experience"). Under /market/[page], so it is served for that one page only;
 * every other name is a 404 from notFound(). Static and rebuilt like the market
 * pages (ISR), and like them without `dynamicParams = false` (see ../page.tsx).
 */

export const revalidate = 86400;

const PAGE = "entry-level-software";

// Built for the entry level page only, so it is static like the market pages, not rendered on every visit.
export function generateStaticParams() {
    return [{page: PAGE}];
}

type Props = {params: Promise<{page: string}>};

export async function generateMetadata({params}: Props): Promise<Metadata> {
    if ((await params).page !== PAGE) return {};
    const c = yearsCounts(await marketForPage(PAGE));
    const title = c ? `${TOPIC}, counted from ${fmt(c.titled.stated + c.titled.unstated)} jobs` : TOPIC;
    const description = c ? yearsAnswer(c) : "The years of experience entry level software jobs ask for, counted from live jobs every week.";
    return publicPage(YEARS_PATH, {title, description, share: {title: c ? yearsHeadline(c) : TOPIC, description}, ownImage: true, article: true});
}

export default async function YearsPage({params}: Props) {
    if ((await params).page !== PAGE) notFound();
    return <YearsArticle c={yearsCounts(await marketForPage(PAGE))} />;
}
