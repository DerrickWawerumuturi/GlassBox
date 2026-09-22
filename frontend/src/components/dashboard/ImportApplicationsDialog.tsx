'use client'

import React, {useEffect, useRef, useState} from 'react'
import {ArrowLeftIcon, FileSpreadsheetIcon, Loader2Icon, UploadIcon} from "lucide-react";
import {toast} from "sonner";

import {cn} from "@/lib/utils";
import {CommitImport, PreviewImport} from "@/lib/api";
import {useApplications} from "@/lib/applications-store";
import {ImportField, ImportPreview, ImportRowPreview} from "@/types/jobradar";
import {Dialog, DialogContent, DialogTitle, DialogTrigger} from "@/components/ui/dialog";
import {StatusChip} from "@/components/dashboard/bits";

const HOW: Record<string, string> = {header: "from its header", values: "from its cells", you: "your choice"};
const ROW_TONE: Record<ImportRowPreview["status"], string> = {
    ready: "text-success", warning: "text-chart-ramp-2", duplicate: "text-muted-foreground", error: "text-destructive"
};

/**
 * Bring in the spreadsheet someone tracked applications in before JobRadar.
 * Nothing is saved until they have seen exactly what would happen: which
 * column became which field (and can change it), what every row becomes,
 * and what is wrong with it — duplicates of what they already track included.
 */
export default function ImportApplicationsDialog() {
    const {refresh} = useApplications();
    const [open, setOpen] = useState(false);
    const [file, setFile] = useState<File | null>(null);
    const [preview, setPreview] = useState<ImportPreview | null>(null);
    const [mapping, setMapping] = useState<Record<number, ImportField | null>>({});
    const [dateOrder, setDateOrder] = useState<"dmy" | "mdy" | undefined>(undefined);
    const [include, setInclude] = useState<Record<number, boolean>>({});
    const [busy, setBusy] = useState<"reading" | "importing" | null>(null);
    const [error, setError] = useState<string | null>(null);
    const input = useRef<HTMLInputElement>(null);

    useEffect(() => {
        if (open) return;
        setFile(null); setPreview(null); setMapping({}); setDateOrder(undefined);
        setInclude({}); setBusy(null); setError(null);
    }, [open]);

    const read = async (chosen: File, nextMapping = mapping, order = dateOrder) => {
        setBusy("reading");
        setError(null);
        try {
            const result = await PreviewImport(chosen, nextMapping, order);
            setPreview(result);
            setInclude(Object.fromEntries(result.rows.map((row) => [row.row, row.include])));
        } catch (err) {
            setError(err instanceof Error ? err.message : "That file couldn't be read.");
        } finally {
            setBusy(null);
        }
    };

    const pick = (chosen: File | undefined) => {
        if (!chosen) return;
        setFile(chosen);
        setMapping({});
        void read(chosen, {});
    };

    const remap = (index: number, field: ImportField | null) => {
        const next = {...mapping, [index]: field};
        setMapping(next);
        if (file) void read(file, next);
    };

    const chosenRows = preview?.rows.filter((row) => include[row.row] && row.status !== "error") ?? [];

    const confirm = async () => {
        if (!preview || chosenRows.length === 0) return;
        setBusy("importing");
        try {
            const result = await CommitImport(chosenRows.map((row) => row.values), preview.file_name);
            const skipped = result.skipped.length ? ` — ${result.skipped.length} skipped as already tracked` : "";
            toast(`Imported ${result.created} application${result.created === 1 ? "" : "s"}${skipped}`);
            await refresh();
            setOpen(false);
        } catch (err) {
            setError(err instanceof Error ? err.message : "The import failed; nothing was saved.");
            setBusy(null);
        }
    };

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger render={(props) => (
                <button
                    {...props}
                    className={cn(props.className, "inline-flex items-center gap-1.5 rounded-md border border-border px-3 py-1 font-mono text-[11px] uppercase tracking-[0.08em] text-muted-foreground transition-colors hover:border-foreground/25 hover:text-foreground")}
                >
                    <UploadIcon className={"size-3"} /> Import
                </button>
            )} />
            <DialogContent className={"max-h-[90dvh] overflow-y-auto sm:max-w-3xl"}>
                {!preview ? (
                    <>
                        <DialogTitle className={"text-base font-bold"}>Import your applications</DialogTitle>
                        <p className={"text-[13px] leading-relaxed text-muted-foreground"}>
                            Upload the spreadsheet you&apos;ve been tracking applications in (.xlsx or .csv). JobRadar reads
                            its columns — job title, company, link, date applied, status and the rest — and shows you
                            exactly what it will import, and what it thinks is a duplicate, before anything is saved.
                        </p>
                        <button
                            type={"button"}
                            disabled={busy !== null}
                            onClick={() => input.current?.click()}
                            onDragOver={(event) => event.preventDefault()}
                            onDrop={(event) => { event.preventDefault(); pick(event.dataTransfer.files?.[0]); }}
                            className={"flex flex-col items-center gap-2 rounded-lg border border-dashed border-input px-6 py-10 text-center transition-colors hover:border-foreground/30 disabled:opacity-60"}
                        >
                            {busy === "reading"
                                ? <Loader2Icon className={"size-6 animate-spin text-muted-foreground"} />
                                : <FileSpreadsheetIcon className={"size-6 text-muted-foreground"} />}
                            <span className={"text-sm font-medium"}>{busy === "reading" ? `Reading ${file?.name}…` : "Choose a spreadsheet"}</span>
                            <span className={"text-[12px] text-muted-foreground"}>or drop it here · Excel or CSV, up to 5 MB</span>
                        </button>
                        <input ref={input} type={"file"} accept={".xlsx,.xlsm,.csv,text/csv"} className={"hidden"}
                               onChange={(event) => { pick(event.target.files?.[0]); event.target.value = ""; }} />
                        {error && <p className={"text-[12.5px] text-destructive"} role={"alert"}>{error}</p>}
                    </>
                ) : (
                    <>
                        <div className={"flex items-center gap-2"}>
                            <button type={"button"} onClick={() => setPreview(null)} aria-label={"Choose another file"}
                                    className={"rounded p-1 text-muted-foreground hover:bg-foreground/5 hover:text-foreground"}>
                                <ArrowLeftIcon className={"size-4"} />
                            </button>
                            <DialogTitle className={"text-base font-bold"}>Check before importing</DialogTitle>
                            {busy === "reading" && <Loader2Icon className={"size-3.5 animate-spin text-muted-foreground"} />}
                        </div>
                        <p className={"font-mono text-[11px] text-muted-foreground"}>
                            {preview.file_name}
                            {preview.sheet && ` · sheet “${preview.sheet}”${preview.sheets.length > 1 ? ` of ${preview.sheets.length}` : ""}`}
                            {preview.header_row && ` · headers on row ${preview.header_row}`}
                        </p>

                        <div className={"flex flex-wrap gap-x-4 gap-y-1 font-mono text-[11px] uppercase tracking-[0.08em]"}>
                            <span>{preview.summary.rows} rows</span>
                            <span className={ROW_TONE.ready}>{preview.summary.ready} ready</span>
                            <span className={ROW_TONE.warning}>{preview.summary.warning} with notes</span>
                            <span className={ROW_TONE.duplicate}>{preview.summary.duplicate} duplicates</span>
                            <span className={ROW_TONE.error}>{preview.summary.error} unusable</span>
                        </div>

                        {preview.missing_fields.length > 0 && (
                            <p className={"rounded-md border border-amber-500/30 bg-amber-500/8 px-3 py-2 text-[12.5px]"}>
                                No column found for {preview.missing_fields.join(", ")}. If your sheet has one, set it below.
                            </p>
                        )}
                        {preview.date_order_ambiguous && (
                            <div className={"flex flex-wrap items-center gap-2 text-[12.5px]"}>
                                <span>Dates like 03/04/2026 could be either way. Read them as</span>
                                {(["dmy", "mdy"] as const).map((order) => (
                                    <button key={order} type={"button"}
                                            onClick={() => { setDateOrder(order); if (file) void read(file, mapping, order); }}
                                            className={cn("rounded-md border px-2 py-0.5 font-mono text-[11px]",
                                                preview.date_order === order ? "border-foreground/30 bg-foreground/10" : "border-input text-muted-foreground")}>
                                        {order === "dmy" ? "day / month" : "month / day"}
                                    </button>
                                ))}
                            </div>
                        )}

                        <section className={"flex flex-col gap-1.5"}>
                            <h3 className={"font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground"}>Columns</h3>
                            {preview.columns.map((column) => (
                                <div key={column.index} className={"grid grid-cols-[minmax(0,1fr)_11rem] items-center gap-3 border-b border-border/60 py-1.5 sm:grid-cols-[minmax(0,14rem)_11rem_minmax(0,1fr)]"}>
                                    <span className={"min-w-0 truncate text-[12.5px]"}>
                                        <span className={"mr-1.5 font-mono text-[10.5px] text-muted-foreground"}>{column.letter}</span>
                                        {column.header}
                                    </span>
                                    <select
                                        value={column.field ?? ""}
                                        onChange={(event) => remap(column.index, (event.target.value || null) as ImportField | null)}
                                        aria-label={`Field for column ${column.letter}`}
                                        className={"rounded-md border border-input bg-transparent px-2 py-1 text-[12px]"}
                                    >
                                        <option value={""}>Ignore</option>
                                        {Object.entries(preview.fields).map(([field, label]) => (
                                            <option key={field} value={field}>{label}</option>
                                        ))}
                                    </select>
                                    <span className={"hidden min-w-0 truncate font-mono text-[10.5px] text-muted-foreground sm:block"}>
                                        {column.how && <span className={"mr-2 text-foreground/60"}>{HOW[column.how]}</span>}
                                        {column.samples.join(" · ")}
                                    </span>
                                </div>
                            ))}
                        </section>

                        <section className={"flex flex-col"}>
                            <h3 className={"mb-1.5 font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground"}>Rows</h3>
                            {preview.rows.map((row) => (
                                <label key={row.row} className={cn("flex items-start gap-3 border-b border-border/60 py-2", row.status === "error" && "opacity-60")}>
                                    <input
                                        type={"checkbox"}
                                        checked={Boolean(include[row.row]) && row.status !== "error"}
                                        disabled={row.status === "error"}
                                        onChange={(event) => setInclude((prev) => ({...prev, [row.row]: event.target.checked}))}
                                        className={"mt-1"}
                                    />
                                    <span className={"min-w-0 flex-1"}>
                                        <span className={"flex flex-wrap items-center gap-x-2 gap-y-1"}>
                                            <span className={"font-mono text-[10.5px] text-muted-foreground"}>row {row.row}</span>
                                            <span className={"truncate text-[13px] font-medium"}>{row.values.title ?? "No title"}</span>
                                            {row.values.company && <span className={"truncate text-[12px] text-muted-foreground"}>· {row.values.company}</span>}
                                            <StatusChip status={row.values.status} />
                                            <span className={"font-mono text-[10.5px] text-muted-foreground"}>
                                                {row.values.applied_at ?? (row.values.status === "saved" ? "" : "date unknown")}
                                            </span>
                                        </span>
                                        {row.duplicate && (
                                            <span className={cn("block text-[11.5px]", row.duplicate.certain ? "text-muted-foreground" : "text-chart-ramp-2")}>
                                                {row.duplicate.reason}{row.duplicate.kind === "file" ? ` as row ${row.duplicate.row}` : " as one you already track"}
                                                {row.duplicate.certain ? " — skipped" : " — tick it to import anyway"}
                                            </span>
                                        )}
                                        {row.issues.map((issue) => (
                                            <span key={issue.message} className={cn("block text-[11.5px]", ROW_TONE[issue.level === "error" ? "error" : "warning"])}>
                                                {issue.message}
                                            </span>
                                        ))}
                                    </span>
                                </label>
                            ))}
                        </section>

                        {error && <p className={"text-[12.5px] text-destructive"} role={"alert"}>{error}</p>}
                        <div className={"sticky bottom-0 -mx-4 -mb-4 flex items-center gap-3 border-t border-border bg-popover px-4 py-3"}>
                            <span className={"text-[12px] text-muted-foreground"}>Nothing is saved until you import.</span>
                            <button
                                type={"button"}
                                disabled={chosenRows.length === 0 || busy !== null}
                                onClick={() => void confirm()}
                                className={"ml-auto inline-flex items-center gap-2 rounded-md bg-accent-lime px-4 py-2 font-mono text-xs font-bold uppercase tracking-[0.1em] text-accent-lime-ink transition-opacity hover:opacity-90 disabled:opacity-40"}
                            >
                                {busy === "importing" && <Loader2Icon className={"size-3.5 animate-spin"} />}
                                Import {chosenRows.length} application{chosenRows.length === 1 ? "" : "s"}
                            </button>
                        </div>
                    </>
                )}
            </DialogContent>
        </Dialog>
    );
}
