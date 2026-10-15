import React from "react";
import Link from "next/link";

import {PRODUCT_PAGE, type ProductChapter} from "@/lib/site-copy";
import {cvFlow} from "./drawings";
import Shot from "./Shot";
import s from "./product.module.css";

/** Anchors /product used to have, by the chapter that now holds them: old links still land. */
export const OLD_ANCHORS: Record<string, string> = {"market-charts": "market"};

/** A drawn picture as SVG, and what it shows for a screen reader. `phone`: its own layout up to 640px. */
export interface Drawing {
    svg: string;
    phone?: string;
    label: string;
}

const CV_DRAWING: Drawing = {svg: cvFlow(), label: PRODUCT_PAGE.drawn.cvLabel};

/**
 * One chapter of /product or /about: the picture on its coloured stage (a
 * cropped screenshot with a pen note, or a drawing: the CV's by default),
 * then the numbered tag, the heading, the words and an italic caption.
 * Every other one is flipped. `person`: someone from the cast, set into
 * the words just before paragraph `at`, beside the sentence they add to.
 */
export default function Chapter({c, n, flip = n % 2 === 0, drawing = CV_DRAWING, person}: {
    c: ProductChapter; n: number; flip?: boolean; drawing?: Drawing; person?: {at: number; node: React.ReactNode};
}) {
    const old = OLD_ANCHORS[c.id];
    return (
        <section id={c.id} className={`${s.ch} ${s.wrap} ${flip ? s.flip : ""}`} style={{"--stage": `var(--${c.stage})`} as React.CSSProperties}>
            {old && <span id={old} className={s.anchor} aria-hidden />}
            {c.shot ? (
                <figure className={s.stage}>
                    <Shot name={c.shot.name} alt={c.shot.alt} />
                    {c.pen && <p className={s.pen} data-at={c.id}>{c.pen}</p>}
                </figure>
            ) : (
                <figure className={`${s.stage} ${s.drawn}`}>
                    {drawing.phone ? (
                        <div className={s.pic} role={"img"} aria-label={drawing.label}>
                            <div className={s.wide} dangerouslySetInnerHTML={{__html: drawing.svg}} />
                            <div className={s.narrow} dangerouslySetInnerHTML={{__html: drawing.phone}} />
                        </div>
                    ) : (
                        <div className={s.pic} role={"img"} aria-label={drawing.label} dangerouslySetInnerHTML={{__html: drawing.svg}} />
                    )}
                </figure>
            )}
            <div className={s.words}>
                <p className={s.tag}><b>{String(n).padStart(2, "0")}</b> {c.name}</p>
                <h2>{c.title}</h2>
                {c.paragraphs.map((p, i) => (
                    <React.Fragment key={p}>{person?.at === i && person.node}<p className={s.text}>{p}</p></React.Fragment>
                ))}
                {c.quote && <blockquote>{c.quote}</blockquote>}
                {c.caption && <p className={s.cap}>{c.caption}{c.link && <> <Link href={c.link.href}>{c.link.label}</Link>.</>}</p>}
            </div>
        </section>
    );
}
