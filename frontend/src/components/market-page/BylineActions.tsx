'use client'

import React from "react";
import {LinkIcon, QuoteIcon, Share2Icon} from "lucide-react";
import {toast} from "sonner";

import {Button} from "@/components/ui/button";

/*
 * The byline's three round buttons: share (the phone's own share sheet where
 * there is one, else the link is copied), copy the link, and copy a citation
 * with the counted date. Nothing is tracked: they are not in the analytics plan.
 */

async function copy(text: string, done: string) {
    try {
        await navigator.clipboard.writeText(text);
        toast.success(done);
    } catch {
        toast.error("That didn't copy.");
    }
}

export default function BylineActions({url, title, cite}: {url: string; title: string; cite: string}) {
    const share = async () => {
        if (typeof navigator.share === "function") {
            try { await navigator.share({title, url}); } catch { /* closed by the reader */ }
            return;
        }
        await copy(url, "Link copied");
    };
    const round = "rounded-full text-foreground";
    return (
        <div className={"flex gap-2"}>
            <Button variant={"outline"} size={"icon-lg"} className={round} aria-label={"Share"} title={"Share"} onClick={share}><Share2Icon /></Button>
            <Button variant={"outline"} size={"icon-lg"} className={round} aria-label={"Copy link"} title={"Copy link"}
                    onClick={() => copy(url, "Link copied")}><LinkIcon /></Button>
            <Button variant={"outline"} size={"icon-lg"} className={round} aria-label={"Cite this page"} title={"Cite this page"}
                    onClick={() => copy(cite, "Citation copied")}><QuoteIcon /></Button>
        </div>
    );
}
