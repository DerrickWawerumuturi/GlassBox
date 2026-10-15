import React from "react";

import {hankenGrotesk} from "@/app/fonts/hanken-grotesk";
import kofi from "@/components/people/art/kofi-figure";
import Person from "@/components/people/Person";
import Chapter from "@/components/product/Chapter";
import CountCard from "@/components/product/CountCard";
import CvClose from "@/components/product/CvClose";
import {heroBox} from "@/components/product/drawings";
import s from "@/components/product/product.module.css";
import {lookForPage} from "@/lib/landing/look-server";
import {countReceipt} from "@/lib/product-count";
import {PRODUCT_PAGE as P} from "@/lib/site-copy";
import {publicPage} from "@/lib/seo";

export const metadata = publicPage("/product", {
    title: "Product",
    description: "One PDF in. Four pages out, each one about where you stand.",
});

// Static, with this week's count for "The count"; rebuilt like the home page (lib/revalidate.ts).
export const revalidate = false;

// Kofi, phone in hand, walking beside the line about moving each job along (the words sit left of the stage there).
const KOFI = {at: 0, node: <Person art={kofi} side={"left"} width={62} />};

/**
 * What Glassbox shows, in the editorial look of the stories (founder, 15 Oct
 * 2026): the open box in the hero, five chips, then one chapter per part on a
 * coloured stage with the real screenshots (example CV), the live count after
 * the first, and the CV ask. Kofi walks beside "Move each one along".
 */
export default async function ProductPage() {
    const receipt = countReceipt(await lookForPage());
    const [first, ...rest] = P.chapters;
    return (
        <main className={`${hankenGrotesk.variable} ${s.page}`}>
            <section className={`${s.hero} ${s.wrap}`}>
                <div>
                    <p className={s.kick}>{P.kicker}</p>
                    <h1>{P.title}</h1>
                    <p className={s.dek}>{P.dek}</p>
                </div>
                <div className={s.pic} aria-hidden dangerouslySetInnerHTML={{__html: heroBox()}} />
            </section>
            <nav className={`${s.chips} ${s.wrap}`} aria-label={P.toc}>
                {P.chapters.map((c, i) => (
                    <a key={c.id} className={s.chip} href={`#${c.id}`} style={{"--c": `var(--${c.stage})`} as React.CSSProperties}><i>{i + 1}</i>{c.name}</a>
                ))}
            </nav>
            <Chapter c={first} n={1} />
            <CountCard receipt={receipt} note={P.count.note} />
            {rest.map((c, i) => <Chapter key={c.id} c={c} n={i + 2} person={c.id === "applications" ? KOFI : undefined} />)}
            <CvClose where={"product"} />
        </main>
    );
}
