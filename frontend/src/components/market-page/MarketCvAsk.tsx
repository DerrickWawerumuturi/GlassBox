'use client'

import React, {createContext, useContext} from "react";

import AskCard from "@/components/cv-ask/AskCard";
import CompareCv from "@/components/cv-ask/CompareCv";
import {useCvScan} from "@/components/cv-ask/useCvScan";
import {useHave} from "@/components/landing/useHave";
import {MarketPage, track} from "@/lib/analytics";
import {Ask, ASK} from "@/lib/cv-ask";

/*
 * A market page's CV ask (docs/decisions/cv-ask.md): one scan and one sheet
 * for the page. Before a scan, one "Compare your CV" button after the figures;
 * after it, the answer in its place and the figures marking the visitor's
 * skills. The click carries `where` (the page's name, or "years"), the scan
 * the market page's name.
 */

type MarketAsk = {ask: Ask; scanning: boolean; find: () => void};
const Ctx = createContext<MarketAsk | null>(null);

function useMarketAsk(): MarketAsk {
    const value = useContext(Ctx);
    if (!value) throw new Error("useMarketAsk must be used inside <MarketAskProvider>");
    return value;
}

export function MarketAskProvider({ask, page, where = page, children}: {ask: Ask; page: MarketPage; where?: MarketPage | "years"; children: React.ReactNode}) {
    const scan = useCvScan({from: page});
    const find = () => { track("cta_clicked", {where}); scan.open(ask); };
    return (
        <Ctx.Provider value={{ask, scanning: scan.scanning, find}}>
            {children}
            {scan.sheet}
        </Ctx.Provider>
    );
}

/** After the figures: the button before a scan, the answer after it. */
export default function MarketCvAsk() {
    const {ask, scanning, find} = useMarketAsk();
    if (useHave() === null) return <CompareCv onClick={find} scanning={scanning} className={"mt-20 items-start text-left sm:mt-28"} />;
    return <AskCard ask={ask} read done={{href: "/analysis/jobs", label: ASK.doneLink, note: ASK.doneNote}} />;
}
