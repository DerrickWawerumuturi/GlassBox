'use client'

import React from "react";
import Link from "next/link";
import {XIcon} from "lucide-react";
import {Dialog as D} from "@base-ui/react/dialog";

import {Button} from "@/components/ui/button";
import Chip from "@/components/cv-ask/Chip";
import CvPicker from "@/components/cv-ask/CvPicker";
import {useHave} from "@/components/landing/useHave";
import {Ask, ASK, askCount, readingSteps, ScanState, StepMark} from "@/lib/cv-ask";
import {LatestCV} from "@/lib/api";
import {readOnLabel, skillsLabel} from "@/lib/latest-cv";
import {cn} from "@/lib/utils";

const S = ASK.sheet;
const TITLE = "m-0 pr-10 font-heading text-[20px] leading-[1.2] font-bold sm:text-[28px]";
const LINE = "mt-1 mb-4 text-[16px] leading-[1.5] text-foreground/85";

/** A made up result, labelled as one, out of the same total as the ask. */
function Example({ask}: {ask: Ask | null}) {
    const e = S.example(ask?.skills.length || undefined);
    return (
        <div className={"mb-4 rounded-xl border border-border bg-background p-3"}>
            <div className={"mb-2 flex justify-between font-mono text-[12px] font-medium tracking-[0.08em] text-muted-foreground uppercase"}>
                <span>{S.exampleKick}</span><span className={"rounded-full border border-border px-[7px]"}>{S.exampleTag}</span>
            </div>
            <b className={"font-heading text-[20px] font-bold"}>{e.have} of {e.of}</b> <span className={"text-[14px] text-muted-foreground"}>{e.line}</span>
            <div className={"mt-2 flex flex-wrap gap-1.5"}>{e.chips.map(([name, have]) => <Chip key={name} name={name} have={have} />)}</div>
        </div>
    );
}

function Trust() {
    return (
        <>
            <ul className={"m-0 mt-3.5 grid list-none gap-1.5 p-0 font-mono text-[12px] text-muted-foreground"}>
                {S.trust.map((t) => <li key={t} className={"flex items-center gap-2 before:size-1.5 before:shrink-0 before:rounded-full before:bg-chart-have before:content-['']"}>{t}</li>)}
            </ul>
            <div className={"mt-3 flex flex-wrap justify-between gap-x-4 gap-y-1 font-mono text-[12px] text-muted-foreground"}>
                <span><span className={"sm:hidden"}>{S.fine}</span><span className={"hidden sm:inline"}>{S.fineDesk}</span></span>
                <Link href={S.what.href} className={"text-foreground underline underline-offset-[3px]"}>{S.what.label}</Link>
            </div>
        </>
    );
}

const DOT: Record<StepMark, string> = {
    done: "border-chart-have bg-chart-have shadow-[inset_0_0_0_3px_var(--card)]",
    now: "border-foreground border-t-transparent animate-spin motion-reduce:animate-none",
    wait: "border-border",
};

function Reading({state, ask}: {state: ScanState; ask: Ask | null}) {
    return (
        <>
            <D.Title className={TITLE}>{state.kind === "reuse" ? S.comparing : S.reading}</D.Title>
            <D.Description className={cn(LINE, "truncate font-mono text-[12px] text-muted-foreground")}>{state.file ?? ""}</D.Description>
            <div role={"progressbar"} aria-label={S.reading} aria-busy className={"h-1 overflow-hidden rounded-full bg-foreground/[0.06]"}>
                <i className={"anim-across block h-full w-2/5 rounded-full bg-primary motion-reduce:w-full motion-reduce:opacity-30"} />
            </div>
            <ol className={"m-0 my-3.5 grid list-none gap-3 p-0"} aria-live={"polite"}>
                {readingSteps(state, ask).map((s) => (
                    <li key={s.label} className={cn("grid grid-cols-[22px_1fr_auto] items-center gap-2.5 text-[16px]", s.mark === "wait" && "text-muted-foreground")}>
                        <span aria-hidden className={cn("size-[18px] rounded-full border-2", DOT[s.mark])} />
                        <span>{s.label}</span>
                        <small className={"font-mono text-[12px] text-muted-foreground"}>{s.mark === "done" ? S.doneStep : s.mark === "now" ? S.now : ""}</small>
                    </li>
                ))}
            </ol>
            {state.kind === "upload" && <p className={"m-0 text-[14px] text-muted-foreground"}>{S.deleted}</p>}
        </>
    );
}

function Result({ask, signedIn, onSee}: {ask: Ask; signedIn: boolean; onSee: () => void}) {
    const {k, n} = askCount(ask.skills, useHave());
    return (
        <div className={"pt-1.5 text-center"}>
            <D.Title className={"m-0 font-heading text-[56px] leading-none font-bold tracking-[-0.03em] text-chart-have"}>{S.result(k ?? 0, n)}</D.Title>
            <D.Description className={"mx-auto mt-1.5 mb-4 max-w-[34ch] text-[16px] leading-[1.5] text-foreground/85"}>{S.resultLine(ask)}</D.Description>
            <Button className={"h-auto w-full rounded-full py-3.5 text-[16px]"} onClick={onSee} autoFocus>{S.seeThem}</Button>
            {!signedIn && (
                <p className={"mt-3 mb-0 text-[14px] text-muted-foreground"}>
                    <Link href={"/sign-in"} className={"text-foreground underline underline-offset-[3px]"}>{S.keep}</Link>{S.keepLine}
                </p>
            )}
        </div>
    );
}

/**
 * The CV sheet: a bottom sheet on a phone, a centred panel on a wider screen.
 * Asks the page's question, shows an example of the answer, and starts
 * reading the moment a file is chosen. Then the steps, then the answer where
 * the question was asked. A signed in user with a kept CV can use it instead.
 */
export default function CvSheet({open, onOpenChange, ask, state, latest, signedIn, onFile, onReuse, onSee}: {
    open: boolean; onOpenChange: (open: boolean) => void; ask: Ask | null; state: ScanState;
    latest: LatestCV | null; signedIn: boolean; onFile: (file: File) => void; onReuse: () => void; onSee: () => void;
}) {
    const reuse = signedIn && latest?.reusable;
    return (
        <D.Root open={open} onOpenChange={onOpenChange}>
            <D.Portal>
                <D.Backdrop className={"fixed inset-0 z-50 bg-black/40 duration-150 dark:bg-black/60 data-open:animate-in data-open:fade-in-0 data-closed:animate-out data-closed:fade-out-0"} />
                <D.Popup className={cn(
                    "fixed inset-x-0 bottom-0 z-50 max-h-[92dvh] overflow-y-auto rounded-t-[22px] bg-card px-[18px] pt-2.5 pb-[calc(22px+env(safe-area-inset-bottom))] text-foreground shadow-[0_-10px_30px_rgba(0,0,0,.18)] outline-none duration-200",
                    "max-sm:data-open:animate-in max-sm:data-open:slide-in-from-bottom max-sm:data-closed:animate-out max-sm:data-closed:slide-out-to-bottom",
                    "sm:inset-x-auto sm:top-1/2 sm:bottom-auto sm:left-1/2 sm:w-[520px] sm:max-w-[calc(100%-32px)] sm:-translate-x-1/2 sm:-translate-y-1/2 sm:rounded-[18px] sm:border sm:border-border sm:p-6 sm:shadow-[0_30px_60px_rgba(0,0,0,.2)]",
                    "sm:data-open:animate-in sm:data-open:fade-in-0 sm:data-open:zoom-in-95 sm:data-closed:animate-out sm:data-closed:fade-out-0")}>
                    <div aria-hidden className={"mx-auto mb-3.5 h-1 w-10 rounded-full bg-border sm:hidden"} />
                    <D.Close render={<Button variant={"outline"} size={"icon-sm"} className={"absolute top-4 right-4 rounded-full"} />}>
                        <XIcon className={"text-muted-foreground"} /><span className={"sr-only"}>Close</span>
                    </D.Close>
                    {state.phase === "reading" ? <Reading state={state} ask={ask} />
                        : state.phase === "result" && ask ? <Result ask={ask} signedIn={signedIn} onSee={onSee} />
                            : (
                                <>
                                    <D.Title className={TITLE}>{S.title(ask)}</D.Title>
                                    <D.Description className={LINE}>{S.line(ask)}</D.Description>
                                    <Example ask={ask} />
                                    {state.phase === "error" && state.error && (
                                        <p role={"alert"} className={"mt-0 mb-3 rounded-lg border border-border bg-foreground/[0.04] px-3 py-2.5 text-[14px]"}>{state.error}</p>
                                    )}
                                    {reuse && latest && (
                                        <div className={"mb-3"}>
                                            <Button className={"h-auto w-full rounded-full py-3.5 text-[16px]"} onClick={onReuse}>{S.reuse}</Button>
                                            <p className={"mt-1.5 mb-0 text-center font-mono text-[12px] text-muted-foreground"}>
                                                {readOnLabel(latest.parsed_at)} · {skillsLabel(latest.skills.length)}
                                            </p>
                                            <p className={"mt-3 mb-2 text-center text-[14px] text-muted-foreground"}>{S.orNew}</p>
                                        </div>
                                    )}
                                    <CvPicker onFile={onFile} secondary={Boolean(reuse)} />
                                    <Trust />
                                </>
                            )}
                </D.Popup>
            </D.Portal>
        </D.Root>
    );
}
