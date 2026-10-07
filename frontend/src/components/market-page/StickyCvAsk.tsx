'use client'

import {useAskInView} from "@/components/cv-ask/StickyAsk";
import {useHave} from "@/components/landing/useHave";
import {useMarketAsk} from "@/components/market-page/MarketCvAsk";
import {stickyShows, StickyContext} from "@/lib/cv-ask";

/**
 * The market page's sticky line, "? of 15 skills here on your CV": shown once
 * the lead visual has scrolled away (`past`), and only while nothing else
 * asks. The title bar draws it (TitleBar.tsx): in the bar on a wider screen,
 * at the foot of a phone's.
 */
export function useMarketSticky(past: boolean): {show: boolean; context: StickyContext; onFind: () => void} {
    const {ask, scanning, sheetOpen, find} = useMarketAsk();
    const askInView = useAskInView();
    const answered = useHave() !== null;
    return {
        show: stickyShows({past, askInView, sheetOpen, scanning, answered}),
        context: {kind: "page", n: ask.skills.length},
        onFind: () => find("sticky"),
    };
}
