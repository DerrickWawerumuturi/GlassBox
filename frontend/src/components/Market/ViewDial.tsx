'use client'

import React, {useEffect, useState} from "react";

import NeedleDial, {DialItem} from "@/components/Market/NeedleDial";
import ViewTabBar, {TAB_BAR} from "@/components/Market/ViewTabBar";

/*
 * Where the Market charts dial sits (decisions/market-navigation.md).
 * Desktop: a column on the left, one window tall and sticky, so the dial
 * stays at the middle of the left edge while the charts scroll. Small
 * tablet (640-767px): a half circle on the bottom edge, in thumb reach.
 * Phone (under 640px): a bottom tab bar (ViewTabBar), since the half circle
 * covered the charts. The page leaves room for either (bottomRoom). The
 * sidebar collapses on this page to pay for the column (Sidebar.tsx,
 * AUTO_COLLAPSE).
 */

export const DIAL_COLUMN = 260;
export const PHONE_BAND = 170;
const PHONE_MAX = 767;
const DIAL_H = 320;

const TABS_MAX = 639;

export type DialMode = "column" | "half" | "tabs";

export function modeFor(width: number): DialMode {
    return width <= TABS_MAX ? "tabs" : width <= PHONE_MAX ? "half" : "column";
}

/** null until the window has been measured, so nothing jumps on the first paint. */
export function useDialMode(): DialMode | null {
    const [mode, setMode] = useState<DialMode | null>(null);
    useEffect(() => {
        const half = window.matchMedia(`(max-width: ${PHONE_MAX}px)`);
        const tabs = window.matchMedia(`(max-width: ${TABS_MAX}px)`);
        const read = () => setMode(modeFor(window.innerWidth));
        read();
        half.addEventListener("change", read);
        tabs.addEventListener("change", read);
        return () => { half.removeEventListener("change", read); tabs.removeEventListener("change", read); };
    }, []);
    return mode;
}

/** Bottom padding the page needs so nothing hides behind the dial or the tab bar. */
export function bottomRoom(mode: DialMode): string | undefined {
    if (mode === "tabs") return `calc(${TAB_BAR + 24}px + env(safe-area-inset-bottom))`;
    if (mode === "half") return `${PHONE_BAND + 24}px`;
    return undefined;
}

export default function ViewDial({items, index, onSelect, mode, controls}: {
    items: DialItem[]; index: number; onSelect: (i: number) => void; mode: DialMode; controls?: string;
}) {
    const [width, setWidth] = useState(0);
    useEffect(() => {
        const read = () => setWidth(window.innerWidth);
        read();
        window.addEventListener("resize", read);
        return () => window.removeEventListener("resize", read);
    }, []);

    if (mode === "tabs") return <ViewTabBar items={items} index={index} onSelect={onSelect} controls={controls} />;
    if (mode === "half") {
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
