import React from "react";
import Link from "next/link";

import {COPY} from "./copy";

const L = COPY.lower;

/** Below the closing CV section: how we count, what a CV gets you, The Count, and the questions people ask first. */
export default function LowerSections() {
    return (
        <div className={"lower"}>
            <section className={"low"} id={"about"} aria-labelledby={"low-how"}>
                <div className={"chapter on"}><span className={"n"}>03</span><h2 id={"low-how"}>{L.how.chapter}</h2></div>
                <ol className={"steps"}>
                    {L.how.points.map((p, i) => <li key={p}><span className={"k"}>{String(i + 1).padStart(2, "0")}</span>{p}</li>)}
                </ol>
            </section>
            <section className={"low"} aria-labelledby={"low-get"}>
                <div className={"chapter on"}><span className={"n"}>04</span><h2 id={"low-get"}>{L.get.chapter}</h2></div>
                <div className={"gets"}>
                    {L.get.points.map((p) => <div className={"card get"} key={p.title}><b>{p.title}</b><span>{p.body}</span></div>)}
                </div>
            </section>
            <section className={"low"} aria-labelledby={"low-count"}>
                <div className={"chapter on"}><span className={"n"}>05</span><h2 id={"low-count"}>{L.theCount.chapter}</h2></div>
                <div className={"card count-tease"}>
                    <p className={"ct-t"}>{L.theCount.lines[0]}</p>
                    <p className={"ct-b"}>{L.theCount.lines[1]}</p>
                    <span className={"note"}>{L.theCount.lines[2]}</span>
                </div>
            </section>
            <section className={"low"} id={"faq"} aria-labelledby={"low-faq"}>
                <div className={"chapter on"}><span className={"n"}>06</span><h2 id={"low-faq"}>{L.faq.chapter}</h2></div>
                <dl className={"faq"}>
                    {L.faq.items.map((item) => (
                        <div key={item.q}>
                            <dt>{item.q}</dt>
                            <dd>{item.a}{"link" in item && item.link && <> <Link className={"textlink"} href={item.link.href}>{item.link.label}</Link>.</>}</dd>
                        </div>
                    ))}
                </dl>
            </section>
        </div>
    );
}
