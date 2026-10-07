import type {Metadata} from "next";
import {notFound} from "next/navigation";

import MarketArticle from "@/components/market-page/MarketArticle";
import {allMarkets, isMarketName, MARKET_NAMES, MARKET_PAGES, marketForPage, marketPath} from "@/lib/market-pages";
import {pageDescription, pageTitle} from "@/lib/market-story";
import {publicPage} from "@/lib/seo";

/*
 * The five market pages, one template (docs/decisions/market-pages.md).
 * Static, rebuilt at most every 5 minutes (ISR), like the landing page: a
 * failed fetch during a revalidation keeps the last good page (look-server.ts).
 * Any other name is a 404.
 */

export const revalidate = 300;
export const dynamicParams = false;

export function generateStaticParams() {
    return MARKET_NAMES.map((page) => ({page}));
}

type Props = {params: Promise<{page: string}>};

export async function generateMetadata({params}: Props): Promise<Metadata> {
    const {page: name} = await params;
    if (!isMarketName(name)) return {};
    const info = MARKET_PAGES[name], page = await marketForPage(name);
    const title = pageTitle(info, page), description = pageDescription(info, page);
    // The share image is the page's own (opengraph-image.tsx): its headline finding.
    return publicPage(marketPath(name), {title, description, share: {title, description}, ownImage: true, article: true});
}

export default async function MarketPage({params}: Props) {
    const {page: name} = await params;
    if (!isMarketName(name)) notFound();
    const [page, others] = await Promise.all([marketForPage(name), allMarkets()]);
    return <MarketArticle info={MARKET_PAGES[name]} page={page} others={others} />;
}
