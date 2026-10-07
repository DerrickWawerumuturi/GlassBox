'use client'

import React from "react";
import Link from "next/link";
import {ArchiveIcon, ArrowRightIcon, ScanTextIcon, Trash2Icon} from "lucide-react";

import {Button} from "@/components/ui/button";
import {LookFamily, normSkill} from "@/lib/landing/look";
import {COPY} from "./copy";

const V = COPY.cv;
const ICONS = [ScanTextIcon, ArchiveIcon, Trash2Icon];

export interface PreviewAsk {key: string; name: string; n: number}

/** The closing CV section: the ask ("Find out"), what we keep, and the current ad's asks marked once a CV is in. */
export default function CvSection({asks, data, have, scanning, onCv}: {
    asks: PreviewAsk[]; data: LookFamily; have: Set<string> | null; scanning: boolean; onCv: () => void;
}) {
    // Before a CV: a labelled example of the payoff. The two or three asks most
    // jobs name are shown as "on your CV", the rest "not on your CV yet". After a
    // scan: the visitor's own skills only, never the example.
    const top = [...asks.slice(0, 8)].sort((a, b) => b.n - a.n);
    const example = new Set(top.slice(0, top.length > 4 ? 3 : Math.max(1, top.length - 2)).map((a) => a.key));
    const mine = (a: PreviewAsk) => (have ? have.has(normSkill(a.key)) : example.has(a.key));
    const list = [...asks.slice(0, 8)].sort((a, b) => Number(mine(b)) - Number(mine(a)));
    const haveN = list.filter(mine).length;
    return (
        <section className={"cvhero"} id={"cv"} data-cv-ask aria-labelledby={"cv-h"}>
            <div className={"cv-copy"}>
                <h2 id={"cv-h"}>{V.title}</h2>
                <p className={"line"}>{scanning ? V.reading : have ? V.done : V.line}</p>
                <div className={"acts"}>
                    {have ? (
                        <Button className={"btn"} nativeButton={false} render={<Link href={"/analysis"} />}>{V.seeResults} <ArrowRightIcon className={"size-3.5"} /></Button>
                    ) : (
                        <>
                            <Button className={"btn"} onClick={onCv} disabled={scanning}>{V.cta} <ArrowRightIcon className={"size-3.5"} /></Button>
                            <Button variant={"link"} className={"textlink"} nativeButton={false} render={<Link href={"/sign-in"} />}>{V.signUp}</Button>
                        </>
                    )}
                </div>
                {!have && <p className={"lead"}>{V.lead}</p>}
                <ul className={"trustrow"}>
                    {V.trust.map((t, i) => {
                        const Icon = ICONS[i];
                        return <li key={t.title}><Icon className={"ic"} aria-hidden />{t.body}</li>;
                    })}
                </ul>
            </div>
            <div className={`preview ${have ? "" : "example"}`}>
                <div className={"card"}>
                    <div className={"tagline"}><span className={"kick"}>{V.previewKick}</span><span className={"kick"}>{have ? V.fromScan : V.example}</span></div>
                    <div className={"pills"}>
                        {list.map((a) => (
                            <span key={a.key} className={`pill ${mine(a) ? "have" : "gap"}`}>
                                <span className={"nm"}>{a.name}</span><span className={"ct"}>in <b>{a.n}</b></span>
                                <span className={"meter"}><i style={{width: `${Math.max(4, (a.n / Math.max(1, data.readable)) * 100)}%`}} /></span>
                            </span>
                        ))}
                    </div>
                    {list.length > 0 && <p className={"say"}>{have ? V.previewHave(haveN, list.length) : V.exampleHave(haveN, list.length)}</p>}
                    <div className={"legend"}>
                        <span><i className={"l-have"} />{V.legendHave}</span><span><i className={"l-gap"} />{V.legendGap}</span>
                    </div>
                </div>
            </div>
        </section>
    );
}
