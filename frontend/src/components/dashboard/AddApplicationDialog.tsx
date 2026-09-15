'use client'

import React, {useEffect, useMemo, useRef, useState} from 'react'
import {ArrowLeftIcon, LinkIcon, Loader2Icon, PlusIcon} from "lucide-react";

import {cn} from "@/lib/utils";
import {ApiError, ExtractJob} from "@/lib/api";
import {useApplications} from "@/lib/applications-store";
import {useCv} from "@/lib/cv-store";
import {timeAgo} from "@/lib/dashboard-data";
import {skillKey} from "@/lib/market";
import {ExtractedJob, Workplace} from "@/types/jobradar";
import {Dialog, DialogContent, DialogTitle, DialogTrigger} from "@/components/ui/dialog";
import {StatusChip} from "@/components/dashboard/bits";
import SkillBadge from "@/components/dashboard/SkillBadge";
import SourceBadge from "@/components/dashboard/SourceBadge";

const INPUT = "w-full rounded-md border border-input bg-transparent px-3 py-2 text-[13px] outline-none placeholder:text-muted-foreground/50 focus:border-foreground/30";
const MISSING = "border-amber-500/60 bg-amber-500/5";
const WORKPLACES: Workplace[] = ["remote", "hybrid", "onsite"];
const WORKPLACE_LABEL: Record<Workplace, string> = {remote: "Remote", hybrid: "Hybrid", onsite: "On-site"};

/** Past this, the wait is almost certainly the API waking from zero replicas. */
const SLOW_AFTER_MS = 4_000;

interface Draft {
    url: string;
    title: string;
    company: string;
    location: string;
    workplace: Workplace | null;
    employment_type: string;
    salary: string;
    applied: boolean;
}

const emptyDraft = (url = ""): Draft => ({
    url, title: "", company: "", location: "", workplace: null, employment_type: "", salary: "", applied: false
});

const looksLikeUrl = (text: string) => /^(https?:\/\/)?[\w-]+(\.[\w-]+)+\S*$/i.test(text.trim());

/**
 * Paste a job link, check what JobRadar read from it, save. Anything the page
 * didn't give up stays editable and is flagged, so a partial read is still a
 * head start rather than a failure.
 */
export default function AddApplicationDialog() {
    const {addFromUrl, addManual} = useApplications();
    const {cv} = useCv();
    const [open, setOpen] = useState(false);
    const [step, setStep] = useState<"paste" | "review">("paste");
    const [link, setLink] = useState("");
    const [reading, setReading] = useState(false);
    const [slow, setSlow] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [result, setResult] = useState<ExtractedJob | null>(null);
    const [draft, setDraft] = useState<Draft>(emptyDraft());
    const request = useRef(0);

    useEffect(() => {
        if (open) return;
        request.current += 1;
        setStep("paste"); setLink(""); setReading(false); setSlow(false);
        setError(null); setResult(null); setDraft(emptyDraft());
    }, [open]);

    const read = async (raw: string) => {
        const url = raw.trim();
        if (!url || reading) return;
        if (!looksLikeUrl(url)) {
            setError("Paste the full link to the job posting, e.g. https://…");
            return;
        }
        const id = ++request.current;
        setReading(true); setError(null);
        const slowTimer = window.setTimeout(() => setSlow(true), SLOW_AFTER_MS);
        try {
            const found = await ExtractJob(url);
            if (id !== request.current) return;
            const f = found.fields;
            setResult(found);
            setDraft({
                url: found.url,
                title: f.title ?? "",
                company: f.company ?? "",
                location: f.location ?? "",
                workplace: f.workplace,
                employment_type: f.employment_type ?? "",
                salary: f.salary ?? "",
                applied: false
            });
            setStep("review");
        } catch (err) {
            if (id !== request.current) return;
            // Only a bad link is a dead end; anything else still lets them type it in.
            if (err instanceof ApiError && err.status === 422) {
                setError(err.message);
            } else {
                setResult(null);
                setDraft(emptyDraft(url));
                setError(null);
                setStep("review");
            }
        } finally {
            window.clearTimeout(slowTimer);
            if (id === request.current) {
                setReading(false); setSlow(false);
            }
        }
    };

    // A failed read flags everything; typing one in from scratch flags nothing.
    const missing = new Set(result?.missing ?? (draft.url ? ["title", "company", "location", "workplace"] : []));
    const flag = (field: keyof Draft) => missing.has(field) && !draft[field];
    const set = (field: keyof Draft) => (event: React.ChangeEvent<HTMLInputElement>) =>
        setDraft((prev) => ({...prev, [field]: event.target.value}));

    const cvSkills = useMemo(
        () => new Set((cv?.skills ?? []).filter((s): s is string => Boolean(s)).map(skillKey)),
        [cv]
    );
    const skills = result?.skills ?? [];
    const matched = skills.filter((skill) => cvSkills.has(skillKey(skill))).length;

    const save = (event: React.FormEvent) => {
        event.preventDefault();
        const title = draft.title.trim();
        if (!title) return;
        const status = draft.applied ? "applied" : "saved";
        const url = draft.url.trim();
        if (url) {
            addFromUrl({
                url,
                title,
                job_id: result?.job_id ?? null,
                company: draft.company.trim() || null,
                location: draft.location.trim() || null,
                workplace: draft.workplace,
                employment_type: draft.employment_type.trim() || null,
                salary: draft.salary.trim() || null,
                source: result?.source ?? null,
                status
            });
        } else {
            addManual({title, company: draft.company.trim() || null, location: draft.location.trim() || null, status});
        }
        setOpen(false);
    };

    const hint = result?.message ?? (step === "review" && !result && draft.url
        ? "Couldn't reach that page right now. Fill in the details below."
        : null);

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger render={(props) => (
                <button
                    {...props}
                    className={cn(props.className, "ml-2 inline-flex items-center gap-1.5 rounded-md bg-accent-lime px-3 py-1 font-mono text-[11px] font-bold uppercase tracking-[0.08em] text-accent-lime-ink transition-opacity hover:opacity-90")}
                >
                    <PlusIcon className={"size-3"} /> Add application
                </button>
            )} />
            <DialogContent className={"sm:max-w-lg"}>
                {step === "paste" ? (
                    <>
                        <DialogTitle className={"text-base font-bold"}>Paste a job link</DialogTitle>
                        <form
                            onSubmit={(event) => { event.preventDefault(); void read(link); }}
                            className={"flex flex-col gap-3"}
                        >
                            <div className={"relative"}>
                                <LinkIcon className={"pointer-events-none absolute top-1/2 left-3 size-3.5 -translate-y-1/2 text-muted-foreground"} />
                                <input
                                    autoFocus
                                    value={link}
                                    disabled={reading}
                                    onChange={(event) => { setLink(event.target.value); setError(null); }}
                                    onPaste={(event) => {
                                        const pasted = event.clipboardData.getData("text");
                                        if (looksLikeUrl(pasted)) {
                                            event.preventDefault();
                                            setLink(pasted.trim());
                                            void read(pasted);
                                        }
                                    }}
                                    placeholder={"https://jobs.company.com/…"}
                                    aria-invalid={Boolean(error)}
                                    aria-describedby={"link-help"}
                                    className={cn(INPUT, "pl-8", error && "border-destructive/60")}
                                />
                            </div>
                            <p id={"link-help"} className={cn("min-h-4 text-[12px]", error ? "text-destructive" : "text-muted-foreground")} aria-live={"polite"}>
                                {error ?? (reading
                                    ? (slow ? "Waking the server — this first read can take up to half a minute…" : "Reading the posting…")
                                    : "LinkedIn, Greenhouse, Lever, Ashby, company career pages — we'll fill in the rest.")}
                            </p>
                            <div className={"flex items-center gap-3"}>
                                <button
                                    type={"submit"}
                                    disabled={reading || !link.trim()}
                                    className={"inline-flex items-center gap-2 rounded-md bg-accent-lime px-4 py-2 font-mono text-xs font-bold uppercase tracking-[0.1em] text-accent-lime-ink transition-opacity hover:opacity-90 disabled:opacity-40"}
                                >
                                    {reading && <Loader2Icon className={"size-3.5 animate-spin"} />}
                                    {reading ? "Reading" : "Continue"}
                                </button>
                                <button
                                    type={"button"}
                                    onClick={() => { setResult(null); setDraft(emptyDraft()); setStep("review"); }}
                                    className={"text-[12px] text-muted-foreground hover:text-foreground hover:underline"}
                                >
                                    No link? Enter it by hand
                                </button>
                            </div>
                        </form>
                    </>
                ) : (
                    <>
                        <div className={"flex items-center gap-2"}>
                            <button
                                type={"button"}
                                onClick={() => { request.current += 1; setStep("paste"); }}
                                aria-label={"Back to the link"}
                                className={"rounded p-1 text-muted-foreground hover:bg-foreground/5 hover:text-foreground"}
                            >
                                <ArrowLeftIcon className={"size-4"} />
                            </button>
                            <DialogTitle className={"text-base font-bold"}>Review before saving</DialogTitle>
                            {/* Clear of the dialog's close button, which sits in this corner. */}
                            {draft.url && <span className={"mr-8 ml-auto"}><SourceBadge url={draft.url} provider={result?.source ?? null} /></span>}
                        </div>

                        {hint && (
                            <p className={"rounded-md border border-amber-500/30 bg-amber-500/8 px-3 py-2 text-[12.5px]"} role={"status"}>
                                {hint}
                            </p>
                        )}

                        <form onSubmit={save} className={"flex flex-col gap-3"}>
                            <Field label={"Role"} missing={flag("title")}>
                                <input required autoFocus={!draft.title} value={draft.title} onChange={set("title")}
                                       placeholder={"e.g. Backend Engineer"} className={cn(INPUT, flag("title") && MISSING)} />
                            </Field>
                            <div className={"grid gap-3 sm:grid-cols-2"}>
                                <Field label={"Company"} missing={flag("company")}>
                                    <input value={draft.company} onChange={set("company")} className={cn(INPUT, flag("company") && MISSING)} />
                                </Field>
                                <Field label={"Location"} missing={flag("location")}>
                                    <input value={draft.location} onChange={set("location")} className={cn(INPUT, flag("location") && MISSING)} />
                                </Field>
                            </div>

                            <Field group label={"Workplace"} missing={missing.has("workplace") && !draft.workplace}>
                                <div className={"flex gap-1"} role={"radiogroup"} aria-label={"Workplace"}>
                                    {WORKPLACES.map((option) => (
                                        <button
                                            key={option}
                                            type={"button"}
                                            role={"radio"}
                                            aria-checked={draft.workplace === option}
                                            onClick={() => setDraft((prev) => ({...prev, workplace: prev.workplace === option ? null : option}))}
                                            className={cn(
                                                "rounded-md border px-3 py-1.5 text-[12px] transition-colors",
                                                draft.workplace === option
                                                    ? "border-foreground/30 bg-foreground/10 text-foreground"
                                                    : cn("border-input text-muted-foreground hover:text-foreground",
                                                        missing.has("workplace") && !draft.workplace && "border-amber-500/40")
                                            )}
                                        >
                                            {WORKPLACE_LABEL[option]}
                                        </button>
                                    ))}
                                </div>
                            </Field>

                            <div className={"grid gap-3 sm:grid-cols-2"}>
                                <Field label={"Employment type"}>
                                    <input value={draft.employment_type} onChange={set("employment_type")} placeholder={"Full-time"} className={INPUT} />
                                </Field>
                                <Field label={"Salary"}>
                                    <input value={draft.salary} onChange={set("salary")} placeholder={"Not stated"} className={INPUT} />
                                </Field>
                            </div>

                            {(skills.length > 0 || result?.experience.years != null || result?.fields.posted_at) && (
                                <div className={"flex flex-col gap-2 border-t border-border pt-3"}>
                                    <div className={"flex flex-wrap items-center gap-x-4 gap-y-1 font-mono text-[10.5px] uppercase tracking-[0.1em] text-muted-foreground"}>
                                        {skills.length > 0 && <span>{matched} of {skills.length} skills on your CV</span>}
                                        {result?.experience.years != null && (
                                            <span>{result.experience.kind === "preferred" ? "Prefers" : "Asks for"} {result.experience.years}+ yrs</span>
                                        )}
                                        {result?.fields.posted_at && <span>Posted {timeAgo(result.fields.posted_at)}</span>}
                                    </div>
                                    {skills.length > 0 && (
                                        <div className={"flex flex-wrap gap-1.5"}>
                                            {skills.map((skill) => {
                                                const have = cvSkills.has(skillKey(skill));
                                                return (
                                                    <span
                                                        key={skill}
                                                        title={have ? "On your CV" : "Not on your CV"}
                                                        className={cn(
                                                            "inline-flex items-center gap-1.5 rounded-full border py-0.5 pr-2.5 pl-0.5 text-[11.5px]",
                                                            have ? "border-accent-lime/50 text-foreground" : "border-border text-muted-foreground"
                                                        )}
                                                    >
                                                        <SkillBadge skill={skill} tone={have ? "have" : "gap"} className={"size-5"} />
                                                        {skill.replace(/\s*\(.*\)$/, "")}
                                                    </span>
                                                );
                                            })}
                                        </div>
                                    )}
                                </div>
                            )}

                            <div className={"mt-1 flex items-center gap-3 border-t border-border pt-3"}>
                                <div className={"flex gap-1"} role={"radiogroup"} aria-label={"Starting status"}>
                                    {([["saved", false], ["applied", true]] as const).map(([label, applied]) => (
                                        <button
                                            key={label}
                                            type={"button"}
                                            role={"radio"}
                                            aria-checked={draft.applied === applied}
                                            onClick={() => setDraft((prev) => ({...prev, applied}))}
                                            className={cn(
                                                "rounded-md px-2 py-1 transition-colors",
                                                draft.applied === applied ? "bg-foreground/10" : "opacity-50 hover:opacity-100"
                                            )}
                                        >
                                            <StatusChip status={label} />
                                        </button>
                                    ))}
                                </div>
                                <button
                                    type={"submit"}
                                    disabled={!draft.title.trim()}
                                    className={"ml-auto rounded-md bg-accent-lime px-4 py-2 font-mono text-xs font-bold uppercase tracking-[0.1em] text-accent-lime-ink transition-opacity hover:opacity-90 disabled:opacity-40"}
                                >
                                    Save application
                                </button>
                            </div>
                        </form>
                    </>
                )}
            </DialogContent>
        </Dialog>
    );
}

/** `group` for button sets: a <label> would forward clicks to the first button. */
function Field({label, missing, group, children}: { label: string; missing?: boolean; group?: boolean; children: React.ReactNode }) {
    const Wrapper = group ? "div" : "label";
    return (
        <Wrapper className={"flex flex-col gap-1"}>
            <span className={"flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.12em] text-muted-foreground"}>
                {label}
                {missing && <span className={"normal-case tracking-normal text-amber-600 dark:text-amber-400"}>not found — add it</span>}
            </span>
            {children}
        </Wrapper>
    );
}
