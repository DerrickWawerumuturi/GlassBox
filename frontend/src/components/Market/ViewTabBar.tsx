'use client'

import React, {useRef} from "react";

import {DialItem} from "@/components/Market/NeedleDial";

/*
 * The Market views on a phone (under 640px): a native-style tab bar on the
 * bottom edge. With four views the half-circle dial covered the charts.
 * Names only; a short orange bar marks the open view (orange acts, the
 * needle's role). Same tablist semantics and ids as the dial.
 */

export const TAB_BAR = 56;

export default function ViewTabBar({items, index, onSelect, controls}: {
    items: DialItem[]; index: number; onSelect: (i: number) => void; controls?: string;
}) {
    const list = useRef<HTMLDivElement>(null);
    const go = (i: number) => {
        const next = (i + items.length) % items.length;
        onSelect(next);
        list.current?.querySelectorAll<HTMLButtonElement>("[role=tab]")[next]?.focus();
    };
    return (
        <div ref={list} role={"tablist"} aria-orientation={"horizontal"} aria-label={"Market charts views"}
             className={"fixed inset-x-0 bottom-0 z-30 flex border-t border-border bg-card"}
             style={{paddingBottom: "env(safe-area-inset-bottom)"}}
             onKeyDown={(e) => {
                 if (e.key === "ArrowRight") go(index + 1);
                 else if (e.key === "ArrowLeft") go(index - 1);
                 else if (e.key === "Home") go(0);
                 else if (e.key === "End") go(items.length - 1);
                 else return;
                 e.preventDefault();
             }}>
            {items.map((item, i) => {
                const on = i === index;
                return (
                    <button key={item.id} type={"button"} role={"tab"} id={`tab-${item.id}`} aria-selected={on} aria-controls={controls}
                            tabIndex={on ? 0 : -1} onClick={() => onSelect(i)}
                            className={"relative flex min-w-0 flex-1 items-center justify-center px-1 text-[13px] outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-foreground/60 "
                                + (on ? "font-semibold text-foreground" : "text-muted-foreground")}
                            style={{height: TAB_BAR}}>
                        {on && <span aria-hidden className={"absolute top-0 h-[3px] w-6 rounded-b-full bg-primary"} />}
                        <span className={"truncate"}>{item.name}</span>
                    </button>
                );
            })}
        </div>
    );
}
