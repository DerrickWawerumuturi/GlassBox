'use client'

import React from "react";
import {useRouter} from "next/navigation";

import {PeekGlyph} from "@/components/brand/Peek";
import {Button} from "@/components/ui/button";
import {useCvScan} from "@/components/cv-ask/useCvScan";
import {track} from "@/lib/analytics";

/**
 * "Add your CV" on /product: the CV sheet and the scan (useCvScan), then the
 * results on /analysis. `reading` shows beside it while the scan runs.
 */
export default function AddCvButton({label, reading}: {label: string; reading: string}) {
    const router = useRouter();
    const scan = useCvScan({onDone: () => router.push("/analysis")});
    return (
        <>
            <Button className={"peek peek-button"} onClick={() => { track("cta_clicked", {where: "product"}); scan.open(); }} disabled={scan.scanning}>
                <PeekGlyph />{label}
            </Button>
            {scan.scanning && <span className={"font-mono text-[12px] text-muted-foreground"} role={"status"}>{reading}</span>}
            {scan.sheet}
        </>
    );
}
