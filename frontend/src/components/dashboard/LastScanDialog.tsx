'use client'

import React, {useState} from "react";
import {toast} from "sonner";

import {DeleteLatestCV, LatestCV} from "@/lib/api";
import {PRIVACY_LINE, readOnLabel, skillsLabel} from "@/lib/latest-cv";
import {Dialog, DialogContent, DialogDescription, DialogTitle} from "@/components/ui/dialog";

/**
 * The profile's "Last scan" details: which CV, when it was read, the skills
 * kept from it, and a delete with an inline confirm (no browser dialog).
 */
export default function LastScanDialog({latest, open, onOpenChange, onDeleted}: {
    latest: LatestCV | null; open: boolean; onOpenChange: (open: boolean) => void; onDeleted: () => void;
}) {
    const [confirming, setConfirming] = useState(false);
    const [busy, setBusy] = useState(false);

    const remove = async () => {
        setBusy(true);
        try {
            await DeleteLatestCV();
            onDeleted();
            setConfirming(false);
            onOpenChange(false);
            toast("Saved skills deleted. Your next scan needs an upload.");
        } catch (e) {
            toast.error(e instanceof Error ? e.message : "That failed. Nothing was deleted.");
        } finally {
            setBusy(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={(next) => { setConfirming(false); onOpenChange(next); }}>
            <DialogContent className={"gap-4 sm:max-w-md"}>
                <div>
                    <DialogTitle className={"text-h3 font-bold"}>Last scan</DialogTitle>
                    <DialogDescription className={"mt-1 text-small text-muted-foreground"}>
                        {latest ? `${latest.file_name ?? "Your CV"}, ${readOnLabel(latest.parsed_at)}` : "No skills kept. Your next scan keeps the ones it reads."}
                    </DialogDescription>
                </div>
                {latest && (
                    <>
                        <div>
                            <p className={"label text-muted-foreground"}>{skillsLabel(latest.skills.length)} kept</p>
                            <ul className={"mt-2 flex flex-wrap gap-1.5"}>
                                {latest.skills.map((skill) => (
                                    <li key={skill} className={"rounded-full px-2.5 py-0.5 text-small"}
                                        style={{background: "color-mix(in oklch, var(--chart-have) 15%, transparent)", color: "var(--chart-have-ink)"}}>
                                        {skill}
                                    </li>
                                ))}
                            </ul>
                        </div>
                        <p className={"text-small text-muted-foreground"}>{PRIVACY_LINE}</p>
                        <div className={"flex flex-wrap items-center gap-2 border-t border-border pt-3"}>
                            {confirming ? (
                                <>
                                    <span className={"text-small"}>Delete them? The next scan needs an upload.</span>
                                    <button type={"button"} onClick={remove} disabled={busy}
                                            className={"cursor-pointer rounded-md bg-destructive px-3 py-1.5 text-small font-semibold text-white disabled:opacity-50"}>
                                        {busy ? "Deleting…" : "Yes, delete"}
                                    </button>
                                    <button type={"button"} onClick={() => setConfirming(false)} disabled={busy}
                                            className={"cursor-pointer rounded-md border border-border px-3 py-1.5 text-small"}>
                                        Keep them
                                    </button>
                                </>
                            ) : (
                                <button type={"button"} onClick={() => setConfirming(true)}
                                        className={"cursor-pointer rounded-md border border-border px-3 py-1.5 text-small text-muted-foreground transition-colors hover:border-destructive/50 hover:text-foreground"}>
                                    Delete saved skills
                                </button>
                            )}
                        </div>
                    </>
                )}
            </DialogContent>
        </Dialog>
    );
}
