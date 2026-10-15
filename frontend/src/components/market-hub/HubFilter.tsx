'use client'

import React, {useState} from "react";

import type {HubKind} from "@/lib/market-hub";
import s from "./hub.module.css";

/*
 * The hub's filters: sticker chips with drawn icons. The cards are server
 * rendered; a filter only says which kind shows (`data-show`), and the CSS
 * hides the rest. Without script the chips are hidden and every card shows.
 */

const ICON: Record<HubKind | "all", string> = {
    all: '<rect x="3" y="3" width="6" height="6" rx="1"/><rect x="11" y="3" width="6" height="6" rx="1"/><rect x="3" y="11" width="6" height="6" rx="1"/><rect x="11" y="11" width="6" height="6" rx="1"/>',
    essay: '<path d="M10 2l2.2 5.2 5.6.4-4.3 3.6 1.4 5.5L10 13.8 5.1 16.7l1.4-5.5L2.2 7.6l5.6-.4z" stroke-linejoin="round"/>',
    count: '<path d="M4 4v12M7.5 4v12M11 4v12M14.5 4v12M2 13L17 6" stroke-linecap="round"/>',
    years: '<path d="M7 3h6l3 3v11H4V6z" stroke-linejoin="round"/><circle cx="10" cy="6.5" r="1.2"/><path d="M7 11h6"/>',
    method: '<circle cx="8.5" cy="8.5" r="5"/><path d="M12.2 12.2L17 17" stroke-linecap="round" stroke-width="2.2"/>',
};

export default function HubFilter({filters, children}: {filters: Array<[HubKind | "all", string]>; children: React.ReactNode}) {
    const [show, setShow] = useState<HubKind | "all">("all");
    return (
        <>
            <div className={s.chips} role={"group"} aria-label={"Show"}>
                {filters.map(([k, label]) => (
                    <button key={k} type={"button"} className={s.chip} aria-pressed={show === k} onClick={() => setShow(k)}>
                        <svg viewBox={"0 0 20 20"} aria-hidden fill={"none"} stroke={"currentColor"} strokeWidth={1.6} dangerouslySetInnerHTML={{__html: ICON[k]}} />
                        <span>{label}</span>
                    </button>
                ))}
            </div>
            <div className={s.filtered} data-show={show}>{children}</div>
        </>
    );
}
