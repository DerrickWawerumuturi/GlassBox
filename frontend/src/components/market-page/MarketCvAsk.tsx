'use client'

import React, {createContext, useContext} from "react";

import AskCard from "@/components/cv-ask/AskCard";
import CompareCv from "@/components/cv-ask/CompareCv";
import {useCvScan} from "@/components/cv-ask/useCvScan";
import {useHave} from "@/components/landing/useHave";
import {CtaPlace, MarketPage, track} from "@/lib/analytics";
import {Ask, ASK} from "@/lib/cv-ask";

/*
 * A market page's CV ask (docs/decisions/cv-ask.md): one scan and one sheet
 * for the page. Before a scan, one "Compare your CV" button after the figures;
 * after it, the answer in its place and the figures marking the visitor's
 * skills. The click carries `where` (the page's name, "years", or a story's
 * place, "story_pick_a_side"), the scan the market page's name.
 */

type MarketAsk = {ask: Ask; scanning: boolean; find: () => void; where: CtaPlace};
const Ctx = createContext<MarketAsk | null>(null);

function useMarketAsk(): MarketAsk {
    const value = useContext(Ctx);
    if (!value) throw new Error("useMarketAsk must be used inside <MarketAskProvider>");
    return value;
}

export function MarketAskProvider({ask, page, where = page, children}: {ask: Ask; page: MarketPage; where?: CtaPlace; children: React.ReactNode}) {
    const scan = useCvScan({from: page});
    const find = () => { track("cta_clicked", {where}); scan.open(ask); };
    return (
        <Ctx.Provider value={{ask, scanning: scan.scanning, find, where}}>
            {children}
            {scan.sheet}
        </Ctx.Provider>
    );
}

/**
 * After the figures: the button before a scan, the answer after it. A story
 * (components/stories) places the button in its own ending (`className`) and
 * has no charts that mark the visitor's skills, so no `note` about them.
 * `lead`: the question beside the button, on a market page and the years page
 * (founder's yes, 15 Oct 2026; a story asks its own question).
 */
export default function MarketCvAsk({className = "mt-20 items-start text-left sm:mt-28", note = ASK.doneNote, lead = false}: {
    className?: string; note?: string | null; lead?: boolean;
}) {
    const {ask, scanning, find, where} = useMarketAsk();
    if (useHave() === null) {
        if (!lead) return <CompareCv onClick={find} scanning={scanning} where={where} className={className} />;
        return (
            <div className={"mt-20 sm:mt-28"}>
                <p className={"m-0 mb-4 max-w-[600px] font-read text-[18px] leading-[1.5] sm:text-[19px]"}>{ASK.lead(ask)}</p>
                <CompareCv onClick={find} scanning={scanning} where={where} className={"items-start text-left"} />
            </div>
        );
    }
    return <AskCard ask={ask} read done={{href: "/analysis/jobs", label: ASK.doneLink, note}} />;
}
