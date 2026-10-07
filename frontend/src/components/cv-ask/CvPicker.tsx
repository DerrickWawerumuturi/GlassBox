'use client'

import React, {useRef, useState} from "react";
import {FileUpIcon} from "lucide-react";

import {Button} from "@/components/ui/button";
import {ASK} from "@/lib/cv-ask";
import {cn} from "@/lib/utils";

const S = ASK.sheet;

/**
 * Choosing the CV: one big button on a phone (phones can't drag), a drop zone
 * with a button on a wider screen. Choosing or dropping a file is the whole
 * step: `onFile` starts the scan, there is no separate upload button. The
 * file input is hidden; the visible controls are the shadcn buttons.
 */
export default function CvPicker({onFile, disabled, secondary}: {onFile: (file: File) => void; disabled?: boolean; secondary?: boolean}) {
    const input = useRef<HTMLInputElement>(null);
    const [over, setOver] = useState(false);
    const choose = () => input.current?.click();
    const take = (file: File | undefined) => { if (file && !disabled) onFile(file); };
    return (
        <>
            <input ref={input} type={"file"} accept={"application/pdf,.pdf"} className={"sr-only"} tabIndex={-1} aria-hidden
                   onChange={(e) => { take(e.target.files?.[0]); e.target.value = ""; }} />
            <Button className={"h-auto w-full rounded-full py-3.5 text-[16px] sm:hidden"} variant={secondary ? "outline" : "default"}
                    onClick={choose} disabled={disabled}>
                {S.choosePhone}
            </Button>
            <div data-over={over || undefined}
                 onDragOver={(e) => { e.preventDefault(); setOver(true); }} onDragLeave={() => setOver(false)}
                 onDrop={(e) => { e.preventDefault(); setOver(false); take(e.dataTransfer.files?.[0]); }}
                 className={cn("hidden flex-col items-center rounded-[14px] border-[1.5px] border-dashed border-chart-gap bg-background px-6 py-5 text-center transition-colors sm:flex",
                     "data-over:border-primary data-over:bg-primary/5")}>
                <FileUpIcon aria-hidden className={"size-7 text-muted-foreground"} strokeWidth={1.6} />
                <b className={"mt-1.5 font-heading text-[16px] font-semibold"}>{S.drop}</b>
                <span className={"text-[14px] text-muted-foreground"}>{S.or}</span>
                <Button className={"mt-2.5 rounded-full px-[18px]"} variant={secondary ? "outline" : "default"} onClick={choose} disabled={disabled}>
                    {S.chooseDesk}
                </Button>
            </div>
        </>
    );
}
