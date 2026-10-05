'use client'

import React from "react";
import {FileTextIcon, UploadIcon} from "lucide-react";

import {LatestCV} from "@/lib/api";
import {readOnLabel, skillsLabel} from "@/lib/latest-cv";
import {Dialog, DialogContent, DialogDescription, DialogTitle} from "@/components/ui/dialog";

/**
 * The new-scan pop-up for a signed-in user with a kept CV: scan again from
 * it (no upload, no wait for the CV to be read) or upload a new one. Orange
 * only on the primary choice.
 */
export default function ReuseCvDialog({latest, open, onReuse, onUpload}: {
    latest: LatestCV; open: boolean; onReuse: () => void; onUpload: () => void;
}) {
    return (
        <Dialog open={open} onOpenChange={(next) => { if (!next) onUpload(); }}>
            <DialogContent className={"gap-5 sm:max-w-md"}>
                <div>
                    <DialogTitle className={"text-h3 font-bold"}>Scan again</DialogTitle>
                    <DialogDescription className={"mt-1 text-small text-muted-foreground"}>
                        Use the CV we read last time, or upload a new one.
                    </DialogDescription>
                </div>
                <div className={"flex items-center gap-3 rounded-lg border border-border bg-background/40 px-3 py-2.5"}>
                    <FileTextIcon aria-hidden className={"size-5 shrink-0 text-muted-foreground"} />
                    <div className={"min-w-0"}>
                        <p className={"truncate text-small font-medium"}>{latest.file_name ?? "Your last CV"}</p>
                        <p className={"text-label text-muted-foreground"}>
                            {readOnLabel(latest.parsed_at)} · {skillsLabel(latest.skills.length)}
                        </p>
                    </div>
                </div>
                <div className={"flex flex-col gap-2 sm:flex-row-reverse"}>
                    <button type={"button"} onClick={onReuse} autoFocus
                            className={"flex-1 cursor-pointer rounded-md bg-primary px-4 py-2.5 text-small font-semibold text-primary-foreground transition-opacity hover:opacity-90"}>
                        Use your last CV
                    </button>
                    <button type={"button"} onClick={onUpload}
                            className={"flex flex-1 cursor-pointer items-center justify-center gap-1.5 rounded-md border border-border px-4 py-2.5 text-small font-medium text-foreground transition-colors hover:bg-foreground/5"}>
                        <UploadIcon aria-hidden className={"size-4"} /> Upload a new one
                    </button>
                </div>
            </DialogContent>
        </Dialog>
    );
}
