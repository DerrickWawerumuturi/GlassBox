'use client'

import React from "react";
import {useRouter} from "next/navigation";

import CompareCv from "@/components/cv-ask/CompareCv";
import {useCvScan} from "@/components/cv-ask/useCvScan";
import {track} from "@/lib/analytics";
import {CV_QUESTION} from "@/lib/stories/story";
import {cvPicture} from "./covers";
import s from "./hub.module.css";

/**
 * The hub's CV card: the question and "Compare your CV" (the peek button
 * family), which opens the CV sheet and scan; the results then open on
 * /analysis, as from the header. The click is cta_clicked, where "market".
 */
export default function HubCv() {
    const router = useRouter();
    const scan = useCvScan({onDone: () => router.push("/analysis")});
    return (
        <li className={`${s.card} ${s.cvcard}`} data-kind={"cv"}>
            <div className={s.cvpic} dangerouslySetInnerHTML={{__html: cvPicture()}} />
            <h2 className={s.cvq}>{CV_QUESTION}</h2>
            <CompareCv onClick={() => { track("cta_clicked", {where: "market"}); scan.open(); }} scanning={scan.scanning} />
            <p className={s.fine}>Your file is deleted after it&apos;s read.</p>
            {scan.sheet}
        </li>
    );
}
