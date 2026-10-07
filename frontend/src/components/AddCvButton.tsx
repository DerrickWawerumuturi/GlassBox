'use client'

import React from "react";
import {useRouter} from "next/navigation";
import {ArrowRightIcon} from "lucide-react";

import {Button} from "@/components/ui/button";
import {useCvScan} from "@/components/landing/useCvScan";
import {MarketPage, track} from "@/lib/analytics";

/**
 * "Add your CV" away from the landing page: the same upload dialog and scan
 * (useCvScan), then the results. `reading` shows beside it while the scan runs.
 * On a market page (`page`) the visitor stays: the page lights up with what
 * the scan found, and the click and the scan carry the page's name.
 */
export default function AddCvButton({label, reading, page}: {label: string; reading: string; page?: MarketPage}) {
    const router = useRouter();
    const scan = useCvScan({onDone: page ? undefined : () => router.push("/analysis"), from: page});
    return (
        <>
            <Button onClick={() => { track("cta_clicked", {where: page ?? "product"}); scan.open(); }} disabled={scan.scanning}>
                {label} <ArrowRightIcon className={"size-3.5"} />
            </Button>
            {scan.scanning && <span className={"font-mono text-[12px] text-muted-foreground"} role={"status"}>{reading}</span>}
            {scan.dialog}
        </>
    );
}
