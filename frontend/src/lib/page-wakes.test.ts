import {readdirSync, readFileSync, statSync} from "node:fs";
import {join, relative} from "node:path";

import {describe, expect, it} from "vitest";

import {LOOK_REVALIDATE_SECONDS} from "@/lib/landing/look-server";

/*
 * A visit to a public page doesn't wake the API (GitHub issue #4). The API
 * scales to zero; a page or fetch that expires every 5 minutes made the next
 * visit rebuild it against the API, and that was 477 of its 517 wakes in the
 * week to 12 Oct 2026. The weekly publication rebuilds the pages itself
 * (lib/revalidate.ts), so a day is only a safety net. This reads every route's
 * `revalidate` under src/app: the shortest one on a route sets how often it rebuilds.
 */

const DAY = 86_400;
const APP = join(__dirname, "..", "app");

function files(dir: string): string[] {
    return readdirSync(dir).flatMap((name) => {
        const path = join(dir, name);
        if (statSync(path).isDirectory()) return files(path);
        return /\.tsx?$/.test(name) && !name.includes(".test.") ? [path] : [];
    });
}

const segments = files(APP).flatMap((path) => {
    const match = readFileSync(path, "utf8").match(/^export const revalidate = ([\d_]+);/m);
    return match ? [[relative(APP, path), Number(match[1].replaceAll("_", ""))] as const] : [];
});

describe("public pages and the API", () => {
    it("keep the API's published bodies in Next's cache for a day", () => {
        expect(LOOK_REVALIDATE_SECONDS).toBeGreaterThanOrEqual(DAY);
    });

    it("rebuild on a timer once a day at most", () => {
        expect(segments.map(([path]) => path)).toEqual(expect.arrayContaining(
            ["(landing)/page.tsx", "market/page.tsx", "market/[page]/page.tsx", "sitemap.ts"]));
        expect(segments.filter(([, seconds]) => seconds < DAY)).toEqual([]);
    });
});
