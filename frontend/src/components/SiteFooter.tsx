import Link from "next/link";

import {cn} from "@/lib/utils";
import {GlassboxWordmark} from "@/components/brand/Logo";

/*
 * The site footer: the privacy pages, contact and the copyright. "full" closes
 * the landing page inside its green band; "slim" sits under the other public
 * pages. Contact shows only when NEXT_PUBLIC_CONTACT_EMAIL is set.
 */

const CONTACT = process.env.NEXT_PUBLIC_CONTACT_EMAIL;

export const FOOTER_LINKS: Array<{href: string; label: string}> = [
    {href: "/privacy", label: "Privacy"},
    {href: "/your-cv", label: "What happens to your CV"},
    ...(CONTACT ? [{href: `mailto:${CONTACT}`, label: "Contact"}] : []),
];

export default function SiteFooter({variant = "slim", className}: {variant?: "full" | "slim"; className?: string}) {
    const links = (
        <nav aria-label={"Site"} className={"flex flex-wrap items-center gap-x-1.5 gap-y-1 text-sm text-muted-foreground"}>
            {FOOTER_LINKS.map((link, i) => (
                <span key={link.href} className={"flex items-center gap-1.5"}>
                    {i > 0 && <span aria-hidden>·</span>}
                    <Link href={link.href} className={"transition-colors hover:text-foreground"}>{link.label}</Link>
                </span>
            ))}
        </nav>
    );
    const copyright = <span className={"font-mono text-[11px] text-muted-foreground"}>© 2026 Glassbox</span>;

    if (variant === "full") return (
        <footer className={cn("chart-band chart-panel-green flex flex-col gap-4 text-panel-green-ink border-b-0 px-5 py-6 lg:px-8", className)}>
            <div className={"flex flex-wrap items-center justify-between gap-3"}>
                <GlassboxWordmark className={"h-[11px] w-auto"} />
                <span className={"flex flex-col items-end gap-0.5 text-right"}>
                    <span className={"font-heading text-sm font-bold uppercase tracking-tight"}>We show. You decide.</span>
                    <span className={"font-mono text-[11px] text-panel-green-ink-muted"}>Counted from public job boards, every day. Mostly tech jobs in the US and Europe.</span>
                </span>
            </div>
            <div className={"flex flex-wrap items-center justify-between gap-3"}>{links}{copyright}</div>
        </footer>
    );
    return (
        <footer className={cn("mt-auto flex flex-wrap items-center justify-between gap-3 border-t border-border px-5 py-5 lg:px-8", className)}>
            {links}{copyright}
        </footer>
    );
}
