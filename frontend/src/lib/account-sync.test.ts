import {readFileSync} from "node:fs";
import {join} from "node:path";

import {describe, expect, it} from "vitest";

import {isProductPath, shouldSyncAccount} from "@/lib/account-sync";

/*
 * A signed in page load wakes the API only on the product's pages. Before this,
 * the root layout's stores and the header's CV sheet asked for the stored scan,
 * the CV and the kept CV on every page, the landing page and the stories included.
 */

const source = (path: string) => readFileSync(join(__dirname, "..", path), "utf8");

describe("which pages fetch the account's scan and CV", () => {
    it("the product's pages do, when signed in", () => {
        for (const path of ["/dashboard", "/dashboard/profile", "/dashboard/scan", "/analysis", "/analysis/jobs", "/onboarding"]) {
            expect([path, shouldSyncAccount("authenticated", path)]).toEqual([path, true]);
        }
    });

    it("public pages never do, even signed in", () => {
        for (const path of ["/", "/market", "/market/ai", "/market/entry-level-software/pick-a-side", "/product", "/about", "/privacy", "/method", "/analysisx", "/dashboards"]) {
            expect([path, shouldSyncAccount("authenticated", path)]).toEqual([path, false]);
        }
    });

    it("nothing is fetched before the session is known or when signed out", () => {
        expect(shouldSyncAccount("loading", "/dashboard")).toBe(false);
        expect(shouldSyncAccount("unauthenticated", "/dashboard")).toBe(false);
        expect(isProductPath(null)).toBe(false);
    });
});

describe("the callers", () => {
    it("both root layout stores gate their fetch on shouldSyncAccount", () => {
        for (const [path, call] of [["lib/analysis-store.tsx", "GetAnalysis()"], ["lib/cv-store.tsx", "GetCV()"]]) {
            const text = source(path);
            expect(text).toContain("shouldSyncAccount(authStatus, usePathname())");
            expect(text).toMatch(/if \(!sync \|\| synced\.current\) return/);
            expect(text.split(call).length - 1).toBe(1);
        }
    });

    it("the CV sheet reads the kept CV only while it is open", () => {
        expect(source("components/cv-ask/useCvScan.tsx")).toContain("useLatestCV(open)");
    });
});
