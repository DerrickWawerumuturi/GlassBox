'use client'

import React, {useState} from "react";
import {CheckIcon, CopyIcon} from "lucide-react";
import {toast} from "sonner";

import {Button} from "@/components/ui/button";
import {MarketPage, track} from "@/lib/analytics";
import {copyText, copyUrl} from "@/lib/market-page";

/**
 * A counted fact a reader can paste anywhere: the sentence, then the page's
 * address tagged utm_source=copy and pointing at the finding (`hash`), so the
 * sentence carries the count and the link carries the proof
 * (docs/decisions/market-pages.md). Only the page's name is sent to
 * analytics, never the sentence.
 */
export default function CopyFact({fact, page, path, hash, label = "Copy", done = "Copied with the link"}: {
    fact: string; page: MarketPage; path: string; hash?: string; label?: string; done?: string;
}) {
    const [copied, setCopied] = useState(false);
    const copy = async () => {
        try {
            await navigator.clipboard.writeText(copyText(fact, copyUrl(path, page, hash)));
        } catch {
            toast.error("That didn't copy. Select the sentence instead.");
            return;
        }
        track("fact_copied", {page});
        setCopied(true);
        toast.success(done);
        window.setTimeout(() => setCopied(false), 2000);
    };
    return (
        <Button variant={"outline"} size={"xs"} onClick={copy} aria-label={`${label}: ${fact}`}
                className={"h-fit shrink-0 font-mono text-[11px] uppercase tracking-[0.06em] text-muted-foreground"}>
            {copied ? <CheckIcon /> : <CopyIcon />}{label}
        </Button>
    );
}
