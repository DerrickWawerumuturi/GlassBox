import type {Metadata} from "next";
import {notFound} from "next/navigation";

import MarketArticle from "@/components/market-page/MarketArticle";
import {allMarkets, marketForPage, weeksForPage} from "@/lib/landing/look-server";
import {isMarketName, MARKET_NAMES, MARKET_PAGES, marketPath} from "@/lib/market-pages";
import {pageDescription, pageTitle} from "@/lib/market-story";
import {publicPage} from "@/lib/seo";

/*
 * The five market pages, one template (docs/decisions/market-pages.md).
 * Static, built at deploy and rebuilt only by the weekly publication, like the
 * landing page: a failed read during a revalidation keeps the last good page
 * (look-server.ts). Any other name is a 404 from notFound(), before any read. Not `dynamicParams = false`: with it, Next 16.3 answers 404 for these
 * very pages once /api/revalidate has dropped them (measured, GitHub issue #4).
 */

export const revalidate = false;

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
    // The past weeks list (GitHub issue #16) is read with the count: a new week shows after the Monday refresh.
    const [page, others, weeks] = await Promise.all([marketForPage(name), allMarkets(), weeksForPage(name)]);
    return <MarketArticle info={MARKET_PAGES[name]} page={page} others={others} weeks={weeks} />;
}
