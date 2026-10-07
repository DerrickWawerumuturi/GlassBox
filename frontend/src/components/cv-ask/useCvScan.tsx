'use client'

import React, {useCallback, useReducer, useState} from "react";

import CvSheet from "@/components/cv-ask/CvSheet";
import Analyze, {AnalyzeReuse, ProcessCv} from "@/lib/api";
import {MarketPage, scanEvents} from "@/lib/analytics";
import {useAnalysis} from "@/lib/analysis-store";
import {Ask, IDLE, runUpload, scanStep} from "@/lib/cv-ask";
import {useCv} from "@/lib/cv-store";
import {reuseError, useLatestCV} from "@/lib/latest-cv";

/*
 * A scan started from a public page (the landing page, a market page,
 * /product, the header, /analysis): the CV sheet and the same scan the
 * dashboard runs. With an ask (the page's skills) the answer lands in the
 * sheet, "9 of 15", and the page lights up; without one, `onDone` takes the
 * visitor to their results. `from` names the market page, for its analytics.
 */
export function useCvScan({onDone, from}: {onDone?: () => void; from?: MarketPage} = {}) {
    const {status, setStatus, save} = useAnalysis();
    const {saveCv} = useCv();
    const {latest, signedIn, forget} = useLatestCV();
    const [open, setOpen] = useState(false);
    const [ask, setAsk] = useState<Ask | null>(null);
    const [state, dispatch] = useReducer(scanStep, IDLE);

    const finish = useCallback((withAsk: boolean) => {
        // Without a question to answer here, the results are on /analysis.
        if (!withAsk) { setOpen(false); dispatch({type: "reset"}); onDone?.(); }
    }, [onDone]);

    const upload = (file: File) => {
        let events: ReturnType<typeof scanEvents> | null = null;
        void runUpload(file, {
            analyze: Analyze, parse: ProcessCv, dispatch,
            onStart: () => { setStatus("analyzing"); events = scanEvents("upload", from); },
            onParsed: saveCv,
            onResult: (result) => { save(result, file.name); events?.finished(result.market?.jobs_analyzed ?? 0); finish(Boolean(ask)); },
            onFailed: () => { events?.failed(); setStatus("error"); },
        });
    };

    // A rescan from the skills kept from the last CV: no upload, no CV read.
    const reuse = async () => {
        dispatch({type: "start", kind: "reuse", file: latest?.file_name ?? null});
        setStatus("analyzing");
        const events = scanEvents("reuse", from);
        try {
            const result = await AnalyzeReuse();
            save(result, latest?.file_name ?? "Your last CV");
            events.finished(result.market?.jobs_analyzed ?? 0);
            dispatch({type: "done"});
            finish(Boolean(ask));
        } catch (e) {
            console.error("Rescan error:", e);
            events.failed();
            setStatus("error");
            forget();
            dispatch({type: "failed", error: reuseError(e)});
        }
    };

    const show = (next: Ask | null = null) => {
        // A finished or failed scan starts over; one still reading stays on its steps.
        if (state.phase !== "reading") { dispatch({type: "reset"}); setAsk(next && next.skills.length ? next : null); }
        setOpen(true);
    };

    const sheet = (
        <CvSheet open={open} onOpenChange={setOpen} ask={ask} state={state} latest={latest} signedIn={signedIn}
                 onFile={upload} onReuse={() => void reuse()} onSee={() => setOpen(false)} />
    );
    return {open: show, isOpen: open, scanning: status === "analyzing", sheet};
}
