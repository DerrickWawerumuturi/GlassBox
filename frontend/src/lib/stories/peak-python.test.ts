import {createElement} from "react";
import {renderToStaticMarkup} from "react-dom/server";
import {describe, expect, it, vi} from "vitest";

// The CV ask's sheet and scan need the app's stores; the story's words are what is tested here.
vi.mock("@/components/landing/useHave", () => ({useHave: () => null}));
vi.mock("@/components/cv-ask/useCvScan", () => ({useCvScan: () => ({open: vi.fn(), isOpen: false, scanning: false, sheet: null})}));

import {peakPythonCover} from "@/components/stories/covers/peak-python";
import {label} from "@/components/stories/peak-python/engrave";
import PeakPython from "@/components/stories/peak-python/PeakPython";
import {peak, PEAK, PEAK_PYTHON} from "./peak-python";

/*
 * Peak Python's numbers are one week's (peak-python.ts). These catch a refresh
 * that breaks them: a count over its total, a share that doesn't round from
 * its count, bands that no longer add up, or a sentence the story writes that
 * the new numbers no longer bear out. A failing test names the sentence.
 */

const pct = (n: number, of: number) => Math.round((100 * n) / of);
const sum = (ns: number[]) => ns.reduce((a, b) => a + b, 0);
const html = () => renderToStaticMarkup(createElement(PeakPython, {fonts: ""})).replace(/<!-- -->/g, "").replace(/&#x27;/g, "'");

describe("Peak Python's numbers", () => {
    it("never count more jobs than there are", () => {
        expect(PEAK.readable).toBeLessThanOrEqual(PEAK.jobs);
        expect(PEAK.senior).toBeLessThanOrEqual(PEAK.jobs);
        for (const p of PEAK.peaks) {
            if (p.jobs !== null) expect(p.jobs, p.name).toBeLessThanOrEqual(PEAK.readable);
            if (p.employers !== null) expect(p.employers, p.name).toBeLessThanOrEqual(PEAK.employers);
            if (p.senior?.jobs != null) expect(p.senior.jobs, p.name).toBeLessThanOrEqual(PEAK.senior);
            expect(p.share, p.name).toBeLessThanOrEqual(100);
        }
        for (const r of PEAK.ridges) if (r.jobs !== null) expect(r.jobs, r.name).toBeLessThanOrEqual(PEAK.readable);
        expect(PEAK.languages.twoOrMore).toBeLessThanOrEqual(PEAK.languages.any);
        expect(PEAK.languages.any).toBeLessThanOrEqual(PEAK.readable);
        for (const p of PEAK.python) expect(p.jobs, p.page).toBeLessThanOrEqual(p.of);
        expect(PEAK.largest.jobs).toBeLessThanOrEqual(PEAK.jobs);
    });

    it("round every share from its count where the page gives both", () => {
        for (const p of PEAK.peaks) {
            if (p.jobs !== null) expect([p.name, p.share]).toEqual([p.name, pct(p.jobs, PEAK.readable)]);
            if (p.senior?.jobs != null) expect([p.name, p.senior.share]).toEqual([p.name, pct(p.senior.jobs, PEAK.senior)]);
        }
        for (const p of PEAK.python) expect([p.page, p.share]).toEqual([p.page, pct(p.jobs, p.of)]);
        expect(PEAK.remote.share).toBe(pct(PEAK.remote.jobs, PEAK.jobs));
        expect(PEAK.internships.share).toBe(pct(PEAK.internships.jobs, PEAK.jobs));
    });

    it("add the bands up: years 32 + 37 + 75 + 32 = 176, and 176 + 175 = 351; levels and places to 351", () => {
        const stated = sum(PEAK.years.bands.map((b) => b.jobs));
        expect(stated).toBe(176);
        expect(stated + PEAK.years.unstated).toBe(PEAK.jobs);
        const {senior, junior, mid, unstated} = PEAK.levels;
        expect(senior + junior + mid + unstated).toBe(PEAK.jobs);
        expect(senior).toBe(PEAK.senior);
        const {us, elsewhere, unknown} = PEAK.places;
        expect(us + elsewhere + unknown).toBe(PEAK.jobs);
    });

    it("draws Python on its own page from the same count as its peak", () => {
        const here = PEAK.python.find((p) => p.page === "machine-learning")!, py = peak("python");
        expect([here.jobs, here.of, here.share]).toEqual([py.jobs, PEAK.readable, py.share]);
    });
});

describe("the sentences the numbers must bear out", () => {
    it("'a higher share than on any other page we count'", () => {
        const [here, ...others] = PEAK.python;
        expect(here.page).toBe("machine-learning");
        for (const o of others) expect([o.page, here.share > o.share]).toEqual([o.page, true]);
    });

    it("'the tallest peak is the range's own name': machine learning stands above every other peak", () => {
        const ml = peak("machine learning");
        for (const p of PEAK.peaks) if (p !== ml) expect([p.name, p.share < ml.share]).toEqual([p.name, true]);
    });

    it("'one tall peak' among the languages: Python, then C++, SQL and Go in that order", () => {
        expect(PEAK.peaks.filter((p) => p.ridge === "lang").map((p) => p.name)).toEqual(["Python", "C++", "SQL", "Go"]);
        const shares = PEAK.peaks.filter((p) => p.ridge === "lang").map((p) => p.share);
        expect([...shares].sort((a, b) => b - a)).toEqual(shares);
    });

    it("the far range: PyTorch and reinforcement learning lean here, 'MLOps goes the other way' with AWS and feature engineering, 'Python barely moves'", () => {
        const here = (k: string) => peak(k).share - peak(k).senior!.share;
        expect(here("pytorch")).toBeGreaterThan(0);
        expect(here("reinforcement learning")).toBeGreaterThan(0);
        for (const k of ["mlops", "aws", "feature engineering"]) expect([k, here(k) < 0]).toEqual([k, true]);
        expect(Math.abs(here("python"))).toBeLessThanOrEqual(2);
        expect(PEAK.peaks.filter((p) => p.senior).length).toBe(9);
    });

    it("'5 to 7 years' is the most common ask, lit in lime", () => {
        const most = Math.max(...PEAK.years.bands.map((b) => b.jobs));
        expect(PEAK.years.bands.filter((b) => b.jobs === most).map((b) => b.label)).toEqual(["5 to 7"]);
    });
});

describe("the story as rendered", () => {
    const h = html();

    it("says the week it counts near the top, fixed to it, and links the live page", () => {
        const top = h.slice(0, h.indexOf("Four languages"));
        expect(top).toContain("By the Glassbox team · the week of 12 October 2026");
        expect(top).toContain("This story keeps to one week, 12 October 2026.");
        expect(top).toMatch(/<a href="\/market\/machine-learning">The machine learning page<\/a> starts a new count every Monday/);
    });

    it("dates every source line with the week", () => {
        const sources = h.match(/Source: Glassbox count, week of [^·]*·/g) ?? [];
        expect(sources.length).toBe(3);
        for (const s of sources) expect(s).toBe("Source: Glassbox count, week of 12 October 2026 ·");
    });

    it("writes the key sentences from the numbers", () => {
        expect(h).toContain("220 of the 351 machine learning jobs we read name Python: 63%, the highest Python share of the five pages.");
        expect(h).toContain("Python is named in 220 of the 351 jobs, 63%, by jobs at 128 of the 174 employers. The next language peak is C++, 54 jobs. Then SQL, 41. Then Go, 20.");
        expect(h).toContain("The other 119 name none (351 − 232 = 119).");
        expect(h).toContain("So 8% don’t (100 − 92 = 8).");
        expect(h).toContain("Data, 172 jobs: ETL / data pipelines 21%, statistics 21%, Apache Spark 12%. DevOps, 102 jobs: Kubernetes 13%, CI/CD 11%, observability 10%. Cloud, 73 jobs: AWS 18%, Google Cloud 12%, Azure 7%.");
        expect(h).toContain("MLOps goes the other way, 24% here and 29% there.");
        expect(h).toContain("Python barely moves: 63% and 64%.");
        expect(h).toContain("176 of the 351 jobs state a number of years. 175 don’t.");
        expect(h).toContain("8 in 100 don’t name it");
        expect(h).toContain("PYTHON ON THE FIVE PAGES WE COUNT · ONE SCALE");
    });

    it("reads every peak aloud and in the table twin", () => {
        expect(label(peak("python"))).toBe("Python, languages: 220 of 351 jobs · 63%; named by jobs at 128 employers; of 194 senior machine learning jobs: 64%");
        expect(label(peak("machine learning"))).toBe("Machine learning, AI: 92% of 351 jobs");
        for (const p of PEAK.peaks) expect(h).toContain(`<th scope="row">${p.name.replace(/&/g, "&amp;")}</th>`);
    });

    it("ends with the question, the CV button and how we counted, scope included", () => {
        expect(h).toContain("Curious how many of these skills are already on your CV?");
        // After the ask, the week once more in one short line; the fold says what "read" meant (copy rewrite S2, S9).
        expect(h).toMatch(/One week, 12 October 2026\. <a href="\/market\/machine-learning">The machine learning page<\/a> counts again on Monday\./);
        expect(h).toContain("We look for about 250 named skills, by fixed rules, in the 351 ads long enough to read.");
        expect(h).not.toMatch(/stays fixed to it|the live page|Skills are matched against/);
        expect(h).toMatch(/<button[^>]*class="[^"]*\bpeek\b[^"]*peek-button[^"]*"[^>]*>(?:<svg[^>]*>[\s\S]*?<\/svg>)?Compare your CV<\/button>/);
        expect(h).toContain("How we counted");
        expect(h).toContain("What we can't see:");
    });

    it("draws the cover from the same numbers", () => {
        const svg = peakPythonCover();
        expect(svg).toContain("PYTHON · 220 OF 351 · 63%");
        expect(svg).toContain("4 LANGUAGE PEAKS · OF 351 JOBS");
    });

    it("gives the hub its card line from the numbers", () => {
        expect(PEAK_PYTHON.card).toBe("220 of the 351 machine learning jobs we read name Python: 63%, the highest Python share of the five pages.");
    });
});
