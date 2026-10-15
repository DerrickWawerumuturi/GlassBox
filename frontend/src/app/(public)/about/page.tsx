import React from "react";

import {hankenGrotesk} from "@/app/fonts/hanken-grotesk";
import CountSteps from "@/components/about/CountSteps";
import {DRAWINGS, HATCH_DEFS, heroAbout, VALUE_ICONS} from "@/components/about/drawings";
import Ledger from "@/components/about/Ledger";
import a from "@/components/about/about.module.css";
import Chapter from "@/components/product/Chapter";
import CountCard from "@/components/product/CountCard";
import CvClose from "@/components/product/CvClose";
import s from "@/components/product/product.module.css";
import {lookForPage} from "@/lib/landing/look-server";
import {aboutLines, countReceipt} from "@/lib/product-count";
import {ABOUT_PAGE as A} from "@/lib/site-copy";
import {publicPage} from "@/lib/seo";

export const metadata = publicPage("/about", {
    title: "About",
    description: "Why Glassbox exists: job ads list everything, so we count what this week's jobs really ask for.",
});

// Static, with this week's count on the receipt; the weekly publication rebuilds it (lib/revalidate.ts).
export const revalidate = false;

/**
 * Why Glassbox exists, in the editorial look of /product (founder, 15 Oct
 * 2026): the drawn hero, six chips, then one chapter per part on a coloured
 * stage, the counting steps with this week's receipt, what is kept on two
 * sheets, the values and the CV ask.
 */
export default async function AboutPage() {
    const receipt = countReceipt(await lookForPage(), aboutLines);
    const [why, count, ...rest] = A.chapters;
    return (
        <main className={`${hankenGrotesk.variable} ${s.page} ${a.page}`}>
            <div dangerouslySetInnerHTML={{__html: HATCH_DEFS}} />
            <section className={`${s.hero} ${s.wrap}`}>
                <div>
                    <p className={s.kick}>{A.kicker}</p>
                    <h1>{A.title}</h1>
                    <p className={s.dek}>{A.dek}</p>
                </div>
                <div className={`${s.pic} ${a.heroPic}`} role={"img"} aria-label={A.drawn.hero.label} dangerouslySetInnerHTML={{__html: heroAbout()}} />
            </section>
            <nav className={`${s.chips} ${s.wrap}`} aria-label={A.toc}>
                {A.chapters.map((c, i) => (
                    <a key={c.id} className={s.chip} href={`#${c.id}`} style={{"--c": `var(--${c.stage})`} as React.CSSProperties}><i>{i + 1}</i>{c.chip ?? c.name}</a>
                ))}
            </nav>
            <Chapter c={why} n={1} flip={false} drawing={DRAWINGS[why.id]} />
            <CountSteps c={count} n={2} />
            <CountCard receipt={receipt} links={A.count.links} />
            {rest.map((c, i) => (
                <React.Fragment key={c.id}>
                    {/* The picture chapters alternate sides; the counting steps between them run full width. */}
                    <Chapter c={c} n={i + 3} flip={i % 2 === 0} drawing={DRAWINGS[c.id]} />
                    {c.id === "your-data" && <Ledger />}
                </React.Fragment>
            ))}
            <section className={`${a.values} ${s.wrap}`} aria-labelledby={"hold"}>
                <h2 id={"hold"}>{A.valuesTitle}</h2>
                <ul className={a.vals}>
                    {A.values.map((v, i) => (
                        <li key={v.title} className={a.val}>
                            <span className={a.valPic} aria-hidden dangerouslySetInnerHTML={{__html: VALUE_ICONS[i]}} />
                            <span className={a.valTitle}>{v.title}</span>
                            <span className={a.valBody}>{v.body}</span>
                        </li>
                    ))}
                </ul>
            </section>
            <CvClose where={"about"} />
        </main>
    );
}
