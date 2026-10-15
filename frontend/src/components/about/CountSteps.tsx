import React from "react";
import Link from "next/link";

import p from "@/components/product/product.module.css";
import {ABOUT_PAGE, type ProductChapter} from "@/lib/site-copy";
import {STATIONS} from "./drawings";
import s from "./about.module.css";

const A = ABOUT_PAGE;

/**
 * /about's second chapter, wide: the words, then the four counting steps as
 * drawn cards on one stage, and a caption that names where the numbers come
 * from. The page puts this week's receipt after it.
 */
export default function CountSteps({c, n}: {c: ProductChapter; n: number}) {
    return (
        <section id={c.id} className={`${p.wrap} ${s.count}`} style={{"--stage": `var(--${c.stage})`} as React.CSSProperties}>
            <div className={s.wide}>
                <p className={p.tag}><b>{String(n).padStart(2, "0")}</b> {c.name}</p>
                <h2>{c.title}</h2>
                {c.paragraphs.map((t) => <p key={t} className={p.text}>{t}</p>)}
            </div>
            <ol className={s.line}>
                {A.steps.map((step, i) => (
                    <li key={step.title} className={s.step}>
                        <div className={s.stepPic} aria-hidden dangerouslySetInnerHTML={{__html: STATIONS[i]}} />
                        <p className={s.stepName}><b>{i + 1}</b>{step.title}</p>
                        <p className={s.stepBody}>{step.body}</p>
                        <p className={s.stepPen}>{step.pen}</p>
                    </li>
                ))}
            </ol>
            <p className={`${p.cap} ${s.lineCap}`}>
                {A.stepsCaption.before} <Link href={A.stepsCaption.link.href}>{A.stepsCaption.link.label}</Link> {A.stepsCaption.after}
            </p>
        </section>
    );
}
