'use client'

import React from "react";
import Link from "next/link";

import {Button} from "@/components/ui/button";
import {COPY} from "./copy";

const S = COPY.sticky;
export type StickyContext = Parameters<typeof S.line>[0];

/**
 * The CV ask that follows the visitor once they engage: a bottom bar on a
 * phone, a pill on a desktop. Its line asks about what they just looked at
 * (the count, or an ad); the button never changes.
 */
export default function StickyCta({show, context, onCv}: {show: boolean; context: StickyContext; onCv: () => void}) {
    return (
        <div className={`sticky ${show ? "" : "off"}`} role={"complementary"} aria-label={S.cta} inert={!show}>
            <div className={"txt"}><span className={"st-t"}>{S.line(context)}</span><span className={"st-s"}>{S.small}</span></div>
            <Button className={"btn h-auto"} onClick={onCv}>{S.cta}</Button>
            <Button variant={"link"} className={"textlink st-signup h-auto"} nativeButton={false} render={<Link href={"/sign-in"} />}>{S.signUp}</Button>
        </div>
    );
}
