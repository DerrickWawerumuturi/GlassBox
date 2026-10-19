/*
 * When a signed in browser asks the API for the account's stored scan and CV.
 * Only on the product's own pages, where they are the page. Public pages (the
 * landing page, /market, the stories, /product, /about) paint from this
 * browser's copy, so a signed in visit to them never wakes the API: it scales
 * to zero, and each wake keeps it up about 6 minutes. In the week to 19 Oct
 * 2026 signed in page loads were 18 of its 59 wakes.
 */

/** The product's routes: app/(product). /analysis shows the example scan to a visitor without one. */
export const PRODUCT_PATHS = ["/dashboard", "/analysis", "/onboarding"] as const;

export function isProductPath(pathname: string | null): boolean {
    if (!pathname) return false;
    return PRODUCT_PATHS.some((base) => pathname === base || pathname.startsWith(`${base}/`));
}

/** True when this page load should fetch the account's stored scan and CV. */
export function shouldSyncAccount(authStatus: "authenticated" | "loading" | "unauthenticated", pathname: string | null): boolean {
    return authStatus === "authenticated" && isProductPath(pathname);
}
