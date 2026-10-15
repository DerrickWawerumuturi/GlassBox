import React from "react";
import Link from "next/link";

import type {CountReceipt} from "@/lib/product-count";
import {PRODUCT_PAGE} from "@/lib/site-copy";
import s from "./product.module.css";

const C = PRODUCT_PAGE.count;

/**
 * "The weekly count": the published count as a till receipt, on /product
 * after Market charts and on /about after the counting steps. Each line names
 * what it counts. Without a count, only its links. The note under the header
 * says which jobs it counts, where a scan's own count sits just above it.
 */
export default function CountCard({receipt, links = C.links, note}: {receipt: CountReceipt | null; links?: Array<{href: string; label: string}>; note?: string}) {
    return (
        <aside className={`${s.wrap} ${s.receiptRow}`} aria-label={C.title}>
            <div className={s.receipt}>
                <p className={s.rhead}>{C.title}{receipt && <time dateTime={receipt.week}>{receipt.when}</time>}</p>
                {note && <p className={s.rnote}>{note}</p>}
                {receipt && (
                    <>
                        <p className={s.rbig}>{receipt.total} <small>{receipt.jobs}</small></p>
                        {receipt.lines.map((l) => <p key={l} className={s.rline}>{l}</p>)}
                    </>
                )}
                <p className={s.rlinks}>{links.map((l) => <Link key={l.href} href={l.href}>{l.label}</Link>)}</p>
            </div>
        </aside>
    );
}
