import {type CtaPlace, track} from "@/lib/analytics";

/*
 * The phone handoff (docs/decisions/cv-ask.md; founder, 16 Oct 2026): a CV
 * usually lives on a laptop, so on a phone or tablet the CV ask also offers
 * this page's link to take there. The link keeps the visit's utm_source and
 * says utm_medium=phone-handoff, so the laptop visit shows where it came from.
 * Nothing is asked of the visitor: no email, no phone number.
 */

export const HANDOFF_MEDIUM = "phone-handoff";

export const HANDOFF = {
    line: "Your CV is probably on your laptop. Comparing it there takes a minute.",
    copy: "Copy link",
    share: "Send to yourself",
    copied: "Link copied",
    failed: "That didn't copy. Use the address bar instead.",
};

/** This page's address to take along: its query kept (utm_source with it), utm_medium set to phone-handoff, no hash. */
export function handoffUrl(href: string): string {
    const url = new URL(href);
    url.searchParams.set("utm_medium", HANDOFF_MEDIUM);
    url.hash = "";
    return url.toString();
}

type Nav = Pick<Navigator, "clipboard"> & {share?: Navigator["share"]};

/** Copies the link; true once it is on the clipboard, and only then counted as cv_handoff. */
export async function copyHandoff(where: CtaPlace, nav: Nav = navigator, href = location.href): Promise<boolean> {
    try {
        await nav.clipboard.writeText(handoffUrl(href));
    } catch {
        return false;
    }
    track("cv_handoff", {how: "copy", where});
    return true;
}

/** Opens the phone's share sheet with the link; counted only when something was shared, not when the sheet is closed. */
export async function shareHandoff(where: CtaPlace, nav: Nav = navigator, href = location.href, title = document.title): Promise<boolean> {
    if (typeof nav.share !== "function") return false;
    try {
        await nav.share({title, url: handoffUrl(href)});
    } catch {
        return false;
    }
    track("cv_handoff", {how: "share", where});
    return true;
}
