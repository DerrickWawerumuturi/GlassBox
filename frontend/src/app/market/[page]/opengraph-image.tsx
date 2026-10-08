import {MARKET_NAMES, MARKET_PAGES, isMarketName, marketForPage, marketPath} from "@/lib/market-pages";
import {findingImage, shareImage, SHARE_SIZE} from "@/components/market-page/ShareImage";
import {fmt, weekDate} from "@/lib/market-page";
import {findingCount, findingShare, headline, topic} from "@/lib/market-story";

/*
 * Each market page's share preview: its finding headline (the H1), the count
 * behind it and the finding's share as squares, so a pasted link carries the
 * finding (docs/decisions/market-pages.md).
 * Rebuilt with the page; a failed fetch during a revalidation keeps the last
 * image, like the page itself (look-server.ts).
 */

export const alt = "A finding from Glassbox's count of this week's tech jobs";
export const size = SHARE_SIZE;
export const contentType = "image/png";
export const revalidate = 300;

export function generateStaticParams() {
    return MARKET_NAMES.map((page) => ({page}));
}

export default async function OgImage({params}: {params: Promise<{page: string}>}) {
    const {page: raw} = await params;
    const name = isMarketName(raw) ? raw : MARKET_NAMES[0];
    const info = MARKET_PAGES[name], page = await marketForPage(name);
    const subject = info.subject.toUpperCase();
    if (!page) return shareImage({kicker: `${subject} JOBS`, big: "Counted", line: topic({info}), path: marketPath(name)});
    const kicker = `${subject} JOBS · WEEK OF ${weekDate(page).toUpperCase()}`;
    const c = {info, page}, title = headline(c), lit = findingShare(c), line = findingCount(c, `${info.subject} jobs`);
    if (!title || lit === null || !line) return shareImage({kicker, big: fmt(page.jobs), line: `${info.subject} jobs, at ${fmt(page.employers)} employers.`, path: marketPath(name)});
    return findingImage({kicker, title, line, lit, path: marketPath(name)});
}
