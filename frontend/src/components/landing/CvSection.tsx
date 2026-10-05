'use client'

import React from "react";
import Link from "next/link";
import {ArchiveIcon, FileUpIcon, ScanTextIcon, Trash2Icon} from "lucide-react";

import {Button} from "@/components/ui/button";
import {LookFamily, normSkill} from "@/lib/landing/look";
import {COPY} from "./copy";

const V = COPY.cv;
const ICONS = [ScanTextIcon, ArchiveIcon, Trash2Icon];

export interface PreviewAsk {key: string; name: string; n: number}

/** The closing CV section: the ask, what we keep, and the current ad's asks marked once a CV is in. */
export default function CvSection({asks, data, have, scanning, onCv}: {
    asks: PreviewAsk[]; data: LookFamily; have: Set<string> | null; scanning: boolean; onCv: () => void;
}) {
    // What's on the CV comes first, then the rest, which reads "not yet".
    const mine = (a: PreviewAsk) => Boolean(have?.has(normSkill(a.key)));
    const list = [...asks.slice(0, 8)].sort((a, b) => Number(mine(b)) - Number(mine(a)));
    const haveN = list.filter(mine).length;
    return (
        <section className={"cvhero"} id={"cv"} aria-labelledby={"cv-h"}>
            <div>
                <div className={"kick"}>{V.kicker}</div>
                <h2 id={"cv-h"}>{V.title}</h2>
                <p className={"line"}>{scanning ? V.reading : have ? V.done : V.line}</p>
                {have ? (
                    <div className={"acts"}><Button className={"btn lg h-auto"} nativeButton={false} render={<Link href={"/analysis"} />}>{V.seeResults}</Button></div>
                ) : (
                    <>
                        <p className={"lead"}>{V.lead}</p>
                        <div className={"acts"}>
                            <Button className={"btn lg h-auto"} onClick={onCv} disabled={scanning}><FileUpIcon className={"size-4"} /> {V.cta}</Button>
                            <Button variant={"outline"} className={"ghost lg h-auto"} nativeButton={false} render={<Link href={"/sign-in"} />}>{V.signUp}</Button>
                        </div>
                    </>
                )}
                <div className={"trustrow"}>
                    {V.trust.map((t, i) => {
                        const Icon = ICONS[i];
                        return <div key={t.title}><span className={"ico"}><Icon className={"size-4"} /></span><b>{t.title}</b><span>{t.body}</span></div>;
                    })}
                </div>
            </div>
            <div className={"preview"}>
                <div className={"card"}>
                    <div className={"tagline"}><span className={"kick"}>{V.previewKick}</span><span className={"kick"}>{have ? V.fromScan : V.waiting}</span></div>
                    <div className={"pills"}>
                        {list.map((a) => (
                            <span key={a.key} className={`pill ${have ? (mine(a) ? "have" : "gap") : ""}`}>
                                <span className={"nm"}>{a.name}</span><span className={"ct"}>in <b>{a.n}</b></span>
                                <span className={"meter"}><i style={{width: `${Math.max(4, (a.n / Math.max(1, data.readable)) * 100)}%`}} /></span>
                            </span>
                        ))}
                    </div>
                    {have && list.length > 0 && <p className={"say"}>{V.previewHave(haveN, list.length)}</p>}
                </div>
            </div>
        </section>
    );
}
