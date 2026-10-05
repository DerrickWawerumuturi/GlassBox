import {readdirSync, readFileSync, statSync} from "node:fs";
import {join, relative} from "node:path";

import {describe, expect, it} from "vitest";

/*
 * UI copy says "jobs", never "postings" (founder, 2026-10-05). This reads
 * every string literal and every run of JSX text under src and fails on
 * "posting"/"postings". Code identifiers (JobPosting, posting.title) and
 * comments are not copy, so they are ignored.
 */

const SRC = join(__dirname, "..");
const SKIP = [/^app\/experiments\//, /\.test\.ts$/];

function files(dir: string): string[] {
    return readdirSync(dir).flatMap((name) => {
        const path = join(dir, name);
        if (statSync(path).isDirectory()) return files(path);
        return /\.tsx?$/.test(name) ? [path] : [];
    });
}

/** The copy in a source file: string literals and JSX text, comments removed. */
function copyIn(source: string): string[] {
    const code = source.replace(/\/\*[\s\S]*?\*\//g, "").replace(/(^|[^:"'`])\/\/.*$/gm, "$1");
    const strings = [...code.matchAll(/"((?:[^"\\\n]|\\.)*)"|'((?:[^'\\\n]|\\.)*)'|`((?:[^`\\]|\\.)*)`/g)]
        .map((m) => m[1] ?? m[2] ?? m[3] ?? "");
    const jsxText = [...code.matchAll(/>([^<>{}]+)</g)].map((m) => m[1]);
    return [...strings, ...jsxText];
}

const POSTING = /\bpostings?\b/i;

describe("copy words", () => {
    it("finds the word in copy, not in code", () => {
        expect(copyIn(`const a = "12 postings"; <p>Each posting counts</p>`).filter((t) => POSTING.test(t))).toHaveLength(2);
        expect(copyIn(`// postings here\nconst posting: JobPosting = row.posting; posting.title`).filter((t) => POSTING.test(t))).toHaveLength(0);
    });

    it("never says posting or postings in UI copy", () => {
        const offenders = files(SRC)
            .map((path) => ({file: relative(SRC, path), hits: copyIn(readFileSync(path, "utf8")).filter((t) => POSTING.test(t))}))
            .filter(({file, hits}) => hits.length && !SKIP.some((re) => re.test(file)))
            .map(({file, hits}) => `${file}: ${hits.map((h) => h.trim().slice(0, 60)).join(" | ")}`);
        expect(offenders).toEqual([]);
    });
});
