'use client'

import React, {useState} from "react";
import {toast} from "sonner";

import FileUpload from "@/components/ui/FileUpload";
import {Dialog, DialogContent} from "@/components/ui/dialog";
import Analyze, {ProcessCv} from "@/lib/api";
import {scanEvents} from "@/lib/analytics";
import {useAnalysis} from "@/lib/analysis-store";
import {useCv} from "@/lib/cv-store";

/*
 * Adding a CV from the landing page (and /product): the same scan the dashboard
 * runs. On the landing page the visitor stays and the page lights up with what
 * their scan found; elsewhere `onDone` takes them to the results.
 * Started by the upload button only, never by closing the dialog.
 */
export function useCvScan({onDone}: {onDone?: () => void} = {}) {
    const {status, setStatus, save} = useAnalysis();
    const {saveCv} = useCv();
    const [open, setOpen] = useState(false);
    const [file, setFile] = useState<File | null>(null);

    const run = async (upload: File) => {
        setOpen(false);
        setStatus("analyzing");
        const events = scanEvents("upload");
        try {
            const analysis = Analyze(upload);
            ProcessCv(upload).then(saveCv).catch((e) => console.error("CV breakdown error:", e));
            const result = await analysis;
            save(result, upload.name);
            events.finished(result.market?.jobs_analyzed ?? 0);
            onDone?.();
        } catch (e) {
            events.failed();
            setStatus("error");
            toast.error(e instanceof Error ? e.message : "We couldn't read that CV. Try again.");
        }
    };

    const dialog = (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogContent>
                <FileUpload Cv={file} setHandleCv={setFile} onUploadComplete={run} />
            </DialogContent>
        </Dialog>
    );
    return {open: () => setOpen(true), scanning: status === "analyzing", dialog};
}
