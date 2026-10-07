import {MARKET_NAMES, MARKET_PAGES, isMarketName, marketForPage, marketPath} from "@/lib/market-pages";
import {shareImage, SHARE_SIZE} from "@/components/market-page/ShareImage";
import {fmt, longDate, pct} from "@/lib/market-page";
import {skillName} from "@/lib/market-story";

/*
 * Each market page's share preview: its headline finding, its count and its
 * date, so a pasted link carries the number (docs/decisions/market-pages.md).
 * Rebuilt with the page; a failed fetch during a revalidation keeps the last
 * image, like the page itself (look-server.ts).
 */

export const alt = "A finding from Glassbox's count of today's tech jobs";
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
    if (!page) return shareImage({kicker: `${subject} JOBS`, big: "Counted", line: `What are ${info.subject} jobs actually asking for?`, path: marketPath(name)});
    const kicker = `${subject} JOBS · COUNTED ${longDate(page.taken_at).toUpperCase()}`;
    const head = page.story.headline ? page.story.skills.find((s) => s.key === page.story.headline) : undefined;
    if (!head) return shareImage({kicker, big: fmt(page.jobs), line: `${info.subject} jobs, at ${fmt(page.employers)} employers.`, path: marketPath(name)});
    return shareImage({
        kicker, big: `${fmt(head.any)} of ${fmt(page.readable)}`,
        line: `${info.subject} jobs name ${skillName({info, page}, head.key)}. That's ${pct(head.any, page.readable)}%.`, path: marketPath(name),
    });
}
