'use client'

import React, {useEffect, useState} from "react";

import NeedleDial, {DialItem} from "@/components/Market/NeedleDial";

/*
 * Where the Market charts dial sits (decisions/market-navigation.md).
 * Desktop: a column on the left, one window tall and sticky, so the dial
 * stays at the middle of the left edge while the charts scroll. Phone: a
 * half circle on the bottom edge, in thumb reach; the page leaves room for
 * it (PHONE_BAND). The sidebar collapses on this page to pay for the column
 * (Sidebar.tsx, AUTO_COLLAPSE).
 */

export const DIAL_COLUMN = 260;
export const PHONE_BAND = 170;
const PHONE_MAX = 767;
const DIAL_H = 320;

/** null until the window has been measured, so nothing jumps on the first paint. */
export function usePhone(): boolean | null {
    const [phone, setPhone] = useState<boolean | null>(null);
    useEffect(() => {
        const q = window.matchMedia(`(max-width: ${PHONE_MAX}px)`);
        const read = () => setPhone(q.matches);
        read();
        q.addEventListener("change", read);
        return () => q.removeEventListener("change", read);
    }, []);
    return phone;
}

export default function ViewDial({items, index, onSelect, phone, controls}: {
    items: DialItem[]; index: number; onSelect: (i: number) => void; phone: boolean; controls?: string;
}) {
    const [width, setWidth] = useState(0);
    useEffect(() => {
        const read = () => setWidth(window.innerWidth);
        read();
        window.addEventListener("resize", read);
        return () => window.removeEventListener("resize", read);
    }, []);

    if (phone) {
        if (!width) return null;
        return (
            <div className={"fixed inset-x-0 bottom-0 z-30 border-t border-border bg-background"}>
                <NeedleDial items={items} phone index={index} onSelect={onSelect} w={width} h={PHONE_BAND} controls={controls} />
            </div>
        );
    }
    // The title bar above is 49px; the column fills the rest of the window and centres the dial in it.
    return (
        <div className={"sticky top-0 flex h-[calc(100vh-49px)] shrink-0 items-center self-start"} style={{width: DIAL_COLUMN}}>
            <NeedleDial items={items} phone={false} index={index} onSelect={onSelect} radius={124} w={DIAL_COLUMN} h={DIAL_H} controls={controls} />
        </div>
    );
}
