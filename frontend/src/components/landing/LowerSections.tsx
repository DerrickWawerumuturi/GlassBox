import React from "react";
import Link from "next/link";

import {Accordion, AccordionContent, AccordionItem, AccordionTrigger} from "@/components/ui/accordion";
import {COPY} from "./copy";

const L = COPY.lower;

/**
 * Below the closing CV section: how we count, what a CV gets you, The Count,
 * and the questions people ask first. No chapter numbers here: those belong to
 * the story above (the count, the glass).
 */
export default function LowerSections() {
    return (
        <div className={"lower"}>
            <section className={"low"} id={"how-we-count"} aria-labelledby={"low-how"}>
                <div className={"chapter on"}><h2 id={"low-how"}>{L.how.chapter}</h2></div>
                <ul className={"steps"}>
                    {L.how.points.map((p) => <li key={p}>{p}</li>)}
                </ul>
            </section>
            <section className={"low"} aria-labelledby={"low-get"}>
                <div className={"chapter on"}><h2 id={"low-get"}>{L.get.chapter}</h2></div>
                <div className={"gets"}>
                    {L.get.points.map((p) => <div className={"card get"} key={p.title}><b>{p.title}</b><span>{p.body}</span></div>)}
                </div>
            </section>
            <section className={"low"} aria-labelledby={"low-count"}>
                <div className={"chapter on"}><h2 id={"low-count"}>{L.theCount.chapter}</h2></div>
                <div className={"card count-tease"}>
                    <p className={"ct-t"}>{L.theCount.lines[0]}</p>
                    <p className={"ct-b"}>{L.theCount.lines[1]}</p>
                </div>
            </section>
            <section className={"low"} id={"faq"} aria-labelledby={"low-faq"}>
                <div className={"chapter on"}><h2 id={"low-faq"}>{L.faq.chapter}</h2></div>
                <Accordion className={"faq"}>
                    {L.faq.items.map((item) => (
                        <AccordionItem key={item.q} value={item.q} className={"faq-item"}>
                            <AccordionTrigger className={"faq-q"}>{item.q}</AccordionTrigger>
                            <AccordionContent className={"faq-a"}>
                                {item.a}
                                {"link" in item && item.link && <> <Link href={item.link.href}>{item.link.label}</Link>.</>}
                            </AccordionContent>
                        </AccordionItem>
                    ))}
                </Accordion>
            </section>
        </div>
    );
}
