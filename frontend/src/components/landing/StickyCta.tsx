'use client'

import React from "react";
import Link from "next/link";

import {Button} from "@/components/ui/button";
import {stickyLine, StickyContext} from "@/lib/cv-ask";
import {COPY} from "./copy";

const S = COPY.sticky;

/**
 * The landing page's sticky ask: a bottom bar on a phone, a pill on a
 * desktop. One slim line, a question about what the visitor just looked at
 * ("? of the 10 skills backend jobs ask for most are on your CV"), and
 * "Find out". LookAround decides when it shows (one ask at a time).
 */
export default function StickyCta({show, context, onFind}: {show: boolean; context: StickyContext; onFind: () => void}) {
    const [lead, rest] = stickyLine(context);
    return (
        <div className={`sticky ${show ? "" : "off"}`} role={"complementary"} aria-label={S.cta} inert={!show}>
            <div className={"txt"}><span className={"st-t"}><b className={"font-heading"}>{lead}</b> {rest}</span><span className={"st-s"}>{S.small}</span></div>
            <Button className={"btn h-auto"} onClick={onFind}>{S.cta}</Button>
            <Button variant={"link"} className={"textlink st-signup h-auto"} nativeButton={false} render={<Link href={"/sign-in"} />}>{S.signUp}</Button>
        </div>
    );
}
