import {readFileSync} from "node:fs";
import {join} from "node:path";
import {createElement} from "react";
import {renderToStaticMarkup} from "react-dom/server";
import {describe, expect, it, vi} from "vitest";

const here = vi.hoisted(() => ({pathname: "/"}));
vi.mock("next/navigation", () => ({usePathname: () => here.pathname, useRouter: () => ({push: () => {}})}));
vi.mock("next-auth/react", () => ({useSession: () => ({data: null})}));
vi.mock("@/components/cv-ask/useCvScan", () => ({useCvScan: () => ({open: () => {}, sheet: null})}));

import Navbar, {isCurrent, SITE_LINKS} from "./Navbar";

const bar = (pathname: string) => {
    here.pathname = pathname;
    return renderToStaticMarkup(createElement(Navbar));
};
const links = (html: string) => [...html.matchAll(/<a [^>]*href="([^"]+)"[^>]*>([^<]+)<\/a>/g)].map(([, href, label]) => [href, label]);

// Founder, 15 Oct 2026: Product and Market are plain links; the Resources menu and its Market and method lines are gone.
describe("the header", () => {
    it("shows Product, Market, About and FAQ as plain links, then Sign in", () => {
        expect(links(bar("/"))).toEqual([
            ["/product", "Product"], ["/market", "Market"], ["/about", "About"], ["/#faq", "FAQ"], ["/sign-in", "Sign in"]]);
    });

    it("has no menu behind Product and no Resources", () => {
        const html = bar("/");
        expect(html).not.toMatch(/Resources|How Glassbox counts/);
        // The bar holds links only: no button that opens a menu.
        expect(html.match(/<nav aria-label="Main".*?<\/nav>/)![0]).not.toMatch(/<button|aria-haspopup/);
        expect(readFileSync(join(__dirname, "Navbar.tsx"), "utf8")).not.toMatch(/NavigationMenu|\/method|\/product#/);
    });

    it("lights Market on the market pages and their stories, and nothing else", () => {
        for (const path of ["/market", "/market/devops", "/market/entry-level-software/pick-a-side"]) {
            const current = [...bar(path).matchAll(/<a [^>]*aria-current="page"[^>]*>([^<]+)<\/a>/g)].map((m) => m[1]);
            expect(current, path).toEqual(["Market"]);
        }
        expect(bar("/product")).toMatch(/aria-current="page"[^>]*>Product</);
        expect(bar("/")).not.toMatch(/aria-current/);
    });

    it("counts a page as current only on itself and the pages under it", () => {
        expect(isCurrent("/market/devops", "/market")).toBe(true);
        expect(isCurrent("/marketing", "/market")).toBe(false);
        expect(isCurrent("/", "/#faq")).toBe(false);
    });

    it("gives the phone menu the same four links", () => {
        expect(SITE_LINKS.map((l) => [l.href, l.label])).toEqual([
            ["/product", "Product"], ["/market", "Market"], ["/about", "About"], ["/#faq", "FAQ"]]);
        expect(readFileSync(join(__dirname, "Navbar.tsx"), "utf8")).toMatch(/SITE_LINKS\.map\(\(\{href, label, icon: Icon\}\) => menuLink\(/);
    });
});
