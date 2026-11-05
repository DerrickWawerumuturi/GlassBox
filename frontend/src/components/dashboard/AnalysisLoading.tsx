import {PeekGlyph} from "@/components/brand/Peek";

/** Opaque route handoff: also shown while the browser's saved scan hydrates. */
export default function AnalysisLoading() {
    return (
        <div role={"status"} aria-live={"polite"} aria-busy={true}
             className={"fixed inset-0 z-50 flex flex-col items-center justify-center gap-4 bg-background px-6 text-center text-foreground"}>
            <span className={"text-primary animate-pulse motion-reduce:animate-none"}><PeekGlyph className={"size-8"} /></span>
            <h1 className={"font-heading text-[26px] font-bold"}>Opening your report…</h1>
            <p className={"text-[14px] text-muted-foreground"}>Getting your analysis ready.</p>
        </div>
    );
}
