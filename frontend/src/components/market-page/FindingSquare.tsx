import {cn} from "@/lib/utils";

/*
 * A hub card's picture: 100 squares, each 1% of the jobs the finding counts,
 * the finding's share lit in lime (the one highlight), the rest ink, as the
 * page's own lead squares are drawn. Server HTML; the label says the numbers.
 */

const LIT = "bg-accent-lime shadow-[inset_0_0_0_1px_var(--accent-lime-edge)]";

export default function FindingSquare({lit, label, className}: {lit: number; label: string; className?: string}) {
    const n = Math.max(0, Math.min(100, Math.round(lit)));
    return (
        <div role={"img"} aria-label={label} className={cn("grid aspect-square grid-cols-10 gap-[2px] sm:gap-[3px]", className)}>
            {Array.from({length: 100}, (_, i) => <i key={i} className={cn("rounded-[2px]", i < n ? LIT : "bg-foreground")} />)}
        </div>
    );
}
