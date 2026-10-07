'use client'

import React, {createContext, useContext} from "react";

import AskCard from "@/components/cv-ask/AskCard";
import {useCvScan} from "@/components/cv-ask/useCvScan";
import {MarketPage, track} from "@/lib/analytics";
import {Ask, ASK} from "@/lib/cv-ask";

/*
 * A market page's CV ask (docs/decisions/cv-ask.md): one scan and one sheet
 * for the page, shared by the ask card after the figures and the sticky line
 * in the title bar. The visitor stays: the card answers and the figures mark
 * their skills. The click and the scan carry the page's name.
 */

type MarketAsk = {ask: Ask; page: MarketPage; scanning: boolean; sheetOpen: boolean; find: (where: "card" | "sticky") => void};
const Ctx = createContext<MarketAsk | null>(null);

export function useMarketAsk(): MarketAsk {
    const value = useContext(Ctx);
    if (!value) throw new Error("useMarketAsk must be used inside <MarketAskProvider>");
    return value;
}

export function MarketAskProvider({ask, page, children}: {ask: Ask; page: MarketPage; children: React.ReactNode}) {
    const scan = useCvScan({from: page});
    const find = (where: "card" | "sticky") => { track("cta_clicked", {where: page, ask: where}); scan.open(ask); };
    return (
        <Ctx.Provider value={{ask, page, scanning: scan.scanning, sheetOpen: scan.isOpen, find}}>
            {children}
            {scan.sheet}
        </Ctx.Provider>
    );
}

/** The ask card, at the end of the figures: "How many of these are on your CV?" */
export default function MarketCvAsk() {
    const {ask, scanning, find} = useMarketAsk();
    return <AskCard ask={ask} scanning={scanning} onFind={() => find("card")} read
                    done={{href: "/analysis/jobs", label: ASK.doneLink, note: ASK.doneNote}} />;
}
