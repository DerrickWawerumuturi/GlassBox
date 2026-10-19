'use client'

import React, {useState, useSyncExternalStore} from "react";
import {LinkIcon, SendIcon} from "lucide-react";

import {Button} from "@/components/ui/button";
import type {CtaPlace} from "@/lib/analytics";
import {copyHandoff, HANDOFF, shareHandoff} from "@/lib/cv-handoff";
import {cn} from "@/lib/utils";
import "./handoff.css";

const noSubscribe = () => () => {};
// The server can't know; most phones can share, so the first paint shows the button and a phone without it hides it.
const canShare = () => typeof navigator.share === "function";

/**
 * Beside the CV button, on a phone or tablet only (handoff.css: a coarse
 * pointer and a small screen, so it is right from the first paint): one line,
 * "Copy link" and, where the phone has a share sheet, "Send to yourself". Both
 * take this page's link with utm_medium=phone-handoff (lib/cv-handoff.ts) and
 * count cv_handoff with `where`. The CV button still works for a CV on the phone.
 */
export default function PhoneHandoff({where, className}: {where: CtaPlace; className?: string}) {
    const share = useSyncExternalStore(noSubscribe, canShare, () => true);
    const [said, setSaid] = useState("");
    const copy = async () => setSaid(await copyHandoff(where) ? HANDOFF.copied : HANDOFF.failed);
    return (
        <div className={cn("cv-handoff", className)}>
            <p className={"cv-handoff-line"}>{HANDOFF.line}</p>
            <div className={"cv-handoff-acts"}>
                <Button variant={"link"} className={"cv-handoff-act"} onClick={copy}><LinkIcon aria-hidden />{HANDOFF.copy}</Button>
                {share && <Button variant={"link"} className={"cv-handoff-act"} onClick={() => shareHandoff(where)}><SendIcon aria-hidden />{HANDOFF.share}</Button>}
            </div>
            <span className={"cv-handoff-said"} role={"status"} aria-live={"polite"}>{said}</span>
        </div>
    );
}
