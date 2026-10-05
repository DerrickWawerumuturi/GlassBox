'use client'

import React, {useState} from 'react'
import {useRouter} from "next/navigation";
import {toast} from "sonner";

import Analyze, {AnalyzeReuse, ProcessCv} from "@/lib/api";
import {useAnalysis} from "@/lib/analysis-store";
import {useCv} from "@/lib/cv-store";
import {useOpportunities} from "@/lib/opportunities-store";
import {PRIVACY_LINE, reuseError, useLatestCV} from "@/lib/latest-cv";
import {PageBar} from "@/components/dashboard/bits";
import FileUpload from "@/components/ui/FileUpload";
import AnalysisProgress from "@/components/AnalysisProgress";
import ReuseCvDialog from "@/components/dashboard/ReuseCvDialog";
import {scanEvents} from "@/lib/analytics";

/** Run a scan without leaving the workspace. */
export default function ScanPage() {
    const router = useRouter();
    const {status, setStatus, save} = useAnalysis();
    const {saveCv} = useCv();
    const {refresh: refreshOpportunities} = useOpportunities();
    const [file, setFile] = useState<File | null>(null);
    const [errorMessage, setErrorMessage] = useState<string | null>(null);
    const {latest, signedIn, forget} = useLatestCV();
    // The pop-up shows once per visit, and only when the kept CV can be reused.
    const [chose, setChose] = useState(false);

    const isAnalyzing = status === "analyzing";

    const runScan = async (upload: File) => {
        setErrorMessage(null);
        setStatus("analyzing");
        const events = scanEvents("upload");
        try {
            const analysisPromise = Analyze(upload);
            ProcessCv(upload).then(saveCv).catch((e) => {
                console.error("CV breakdown error:", e);
                toast.error(e instanceof Error ? e.message : "Failed to process CV");
            });

            const result = await analysisPromise;
            save(result, upload.name);
            events.finished(result.market?.jobs_analyzed ?? 0);
            // The scan added the jobs it found to the pool: show them now.
            void refreshOpportunities();
            router.push("/dashboard/opportunities");
        } catch (e) {
            console.error("Scan error:", e);
            events.failed();
            setStatus("error");
            const detail = e instanceof Error ? e.message : null;
            setErrorMessage(detail);
            toast.error(detail ?? "Scan failed");
        }
    };

    // A rescan from the kept skills: no upload, no CV read. 409 means an older parser read it.
    const reuseScan = async () => {
        setChose(true);
        setErrorMessage(null);
        setStatus("analyzing");
        const events = scanEvents("reuse");
        try {
            const result = await AnalyzeReuse();
            save(result, latest?.file_name ?? "Your last CV");
            events.finished(result.market?.jobs_analyzed ?? 0);
            void refreshOpportunities();
            router.push("/dashboard/opportunities");
        } catch (e) {
            console.error("Rescan error:", e);
            events.failed();
            setStatus("error");
            forget();
            setErrorMessage(reuseError(e));
        }
    };

    return (
        <div className={"flex min-h-screen flex-col"}>
            {latest?.reusable && (
                <ReuseCvDialog latest={latest} open={!chose && !isAnalyzing} onReuse={reuseScan} onUpload={() => setChose(true)} />
            )}
            <PageBar title={"New scan"} meta={"one PDF in, your market out"} />

            <div className={"mx-auto flex w-full max-w-xl flex-col gap-6 px-4 py-10 sm:px-6"}>
                {isAnalyzing ? (
                    <AnalysisProgress />
                ) : (
                    <>
                        <div>
                            <h2 className={"text-lg font-bold"}>Scan the market with your latest CV</h2>
                            <p className={"mt-1 text-sm text-muted-foreground"}>
                                A scan takes about a minute. It reads your CV and maps your market: what jobs ask
                                for and what you cover. It replaces your previous scan. Opportunities don&apos;t need
                                one. They come from the job pool we refresh every morning.
                            </p>
                        </div>
                        <FileUpload Cv={file} setHandleCv={setFile} onUploadComplete={runScan} />
                        {signedIn && <p className={"-mt-3 text-small text-muted-foreground"}>{PRIVACY_LINE}</p>}
                        {errorMessage && (
                            <p className={"rounded-md border border-destructive/40 bg-destructive/8 px-4 py-3 text-sm"}>
                                {errorMessage}
                            </p>
                        )}
                        <p aria-hidden className={"-rotate-1 self-start font-hand text-lg text-primary/80"}>
                            fresh CV → fresh matches, it&apos;s that direct
                        </p>
                    </>
                )}
            </div>
        </div>
    )
}
