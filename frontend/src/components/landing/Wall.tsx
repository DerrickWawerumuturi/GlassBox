'use client'

import React, {useEffect, useState} from "react";

import {Level, LookFamily, pickWall} from "@/lib/landing/look";
import {COPY, FAMILY_LABEL} from "./copy";

const W = COPY.wall;
const fmt = (n: number) => n.toLocaleString("en");
const LEVEL_WORD: Record<Level, string> = {junior: "junior", mid: "mid level", senior: "senior"};

/** The jobs behind the count: titles and companies only, the ones at this level lit. */
export default function Wall({family, data, level, reduce}: {family: string; data: LookFamily; level: Level; reduce: boolean}) {
    const {list, nLit} = pickWall(family, data, level);
    const [lit, setLit] = useState(false);
    // Draw dimmed, then light the level on the next frame so the change is seen.
    useEffect(() => {
        setLit(false);
        const raf = requestAnimationFrame(() => requestAnimationFrame(() => setLit(true)));
        return () => cancelAnimationFrame(raf);
    }, [family, level]);
    const total = data.seniority[level], label = FAMILY_LABEL[family] ?? family, word = LEVEL_WORD[level];
    const rest = data.jobs - list.length;

    return (
        <div className={"card wallcard"}>
            <div className={"wall-hd"}>
                <h3 className={"wall-t"}>{W.title}</h3>
                <span className={"note"} style={{fontSize: 20}}>{W.note}</span>
            </div>
            <p className={"wall-sub"}>{nLit === total ? W.allLit(fmt(total), word, label) : W.someLit(nLit, fmt(total), word, label)}</p>
            <div className={"wall"}>
                {list.map(([title, company, l], i) => (
                    <span key={`${title}-${company}-${i}`} className={`jt ${lit && l === level ? "lit" : ""}`}
                          style={{transitionDelay: reduce ? "0ms" : `${i * 22}ms`}}>
                        {title}<small>{company}</small>
                    </span>
                ))}
            </div>
            <p className={"more"}>{W.more(fmt(rest), label)}</p>
            <div className={"wall-foot"}>{W.foot}</div>
        </div>
    );
}
