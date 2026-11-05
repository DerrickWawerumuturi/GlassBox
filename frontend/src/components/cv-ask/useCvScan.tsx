'use client'

import React, {useCallback, useEffect, useReducer, useRef, useState, useTransition} from "react";
import {usePathname, useRouter} from "next/navigation";

import CvSheet from "@/components/cv-ask/CvSheet";
import Analyze, {AnalyzeReuse, ProcessCv, createScanRequestId, wakeApi} from "@/lib/api";
import {scanEvents, track, type ScanSource} from "@/lib/analytics";
import {useAnalysis} from "@/lib/analysis-store";
import {Ask, failReason, IDLE, runUpload, scanStep} from "@/lib/cv-ask";
import {useCv} from "@/lib/cv-store";
import {reuseError, useLatestCV} from "@/lib/latest-cv";

/*
 * A scan started from a public page (the landing page, a market page,
 * /product, the header, /analysis): the CV sheet and the same scan the
 * dashboard runs. With an ask (the page's skills) the answer lands in the
 * sheet, "9 of 15", and the page lights up; without one, `onDone` takes the
 * visitor to their results. `from` names a market page or explicitly allowed
 * article CTA, for scan attribution.
 */
export function useCvScan({onDone, from}: {onDone?: () => void; from?: ScanSource} = {}) {
    const router = useRouter();
    const pathname = usePathname();
    const [pending, startTransition] = useTransition();
    const [handoff, setHandoff] = useState<"idle" | "opening" | "error">("idle");
    const navigating = useRef(false);
    const {status, setStatus, save} = useAnalysis();
    const {saveCv} = useCv();
    const [open, setOpen] = useState(false);
    // The header carries this sheet on every page: the kept CV is read when it opens, not on load.
    const {latest, signedIn, forget} = useLatestCV(open);
    const [ask, setAsk] = useState<Ask | null>(null);
    const [state, dispatch] = useReducer(scanStep, IDLE);
    const lastFile = useRef<File | null>(null);

    useEffect(() => {
        if (handoff !== "opening") return;
        if (pathname === "/analysis") {
            setOpen(false);
            navigating.current = false;
            setHandoff("idle");
        } else if (!pending) {
            // The transition settled without reaching the destination; keep the result recoverable.
            navigating.current = false;
            setHandoff("error");
        }
    }, [handoff, pathname, pending]);

    const see = () => {
        if (navigating.current) return;
        if (pathname === "/analysis") { setOpen(false); return; }
        navigating.current = true;
        setHandoff("opening");
        startTransition(() => {
            try { router.push("/analysis"); }
            catch {
                navigating.current = false;
                setHandoff("error");
            }
        });
    };

    const finish = useCallback((withAsk: boolean) => {
        // Without a question to answer here, the results are on /analysis.
        if (!withAsk) { setOpen(false); dispatch({type: "reset"}); onDone?.(); }
    }, [onDone]);

    const upload = (file: File) => {
        lastFile.current = file;
        let events: ReturnType<typeof scanEvents> | null = null;
        void runUpload(file, {
            analyze: Analyze, parse: ProcessCv, dispatch,
            onStart: () => { setStatus("analyzing"); events = scanEvents("upload", from); },
            onParsed: saveCv,
            onResult: (result) => { save(result, file.name); events?.finished(result.market?.jobs_analyzed ?? 0); finish(Boolean(ask)); },
            onFailed: (_message, reason) => { events?.failed(reason); setStatus("error"); },
            onRefused: (reason) => track("file_refused", {reason}),
        });
    };

    // A rescan from the skills kept from the last CV: no upload, no CV read.
    const reuse = async () => {
        dispatch({type: "start", kind: "reuse", file: latest?.file_name ?? null});
        setStatus("analyzing");
        const events = scanEvents("reuse", from);
        try {
            const result = await AnalyzeReuse(createScanRequestId());
            save(result, latest?.file_name ?? "Your last CV");
            events.finished(result.market?.jobs_analyzed ?? 0);
            dispatch({type: "done"});
            finish(Boolean(ask));
        } catch (e) {
            console.error("Rescan error:", e);
            events.failed(failReason(e));
            setStatus("error");
            forget();
            dispatch({type: "failed", error: reuseError(e)});
        }
    };

    const show = (next: Ask | null = null) => {
        if (navigating.current) { setOpen(true); return; }
        setHandoff("idle");
        // Choosing a file takes a few seconds: time a sleeping API can use to wake.
        wakeApi();
        // A finished or failed scan starts over; one still reading stays on its steps.
        if (state.phase !== "reading") { dispatch({type: "reset"}); setAsk(next && next.skills.length ? next : null); }
        setOpen(true);
    };

    const sheet = (
        <CvSheet open={open} onOpenChange={(next) => { if (!navigating.current) setOpen(next); }} ask={ask} state={state} latest={latest} signedIn={signedIn}
                 onFile={upload} onRetry={() => { if (lastFile.current) upload(lastFile.current); }}
                 onReuse={() => void reuse()} onSee={see} opening={handoff === "opening"} navigationError={handoff === "error"} />
    );
    return {open: show, isOpen: open, scanning: status === "analyzing", sheet};
}
