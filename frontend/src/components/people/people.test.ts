import {existsSync, readdirSync, readFileSync, statSync} from "node:fs";
import {join} from "node:path";
import {createElement, type ReactElement} from "react";
import {renderToStaticMarkup} from "react-dom/server";
import {describe, expect, it, vi} from "vitest";

// The pages read the published count from the database (never the API); here, nothing. The CV ask needs the app's stores.
vi.mock("@/lib/landing/look-server", () => ({lookForPage: async () => null}));
vi.mock("@/components/landing/useHave", () => ({useHave: () => null}));
vi.mock("@/components/cv-ask/useCvScan", () => ({useCvScan: () => ({open: vi.fn(), isOpen: false, scanning: false, sheet: null})}));
vi.mock("next/navigation", () => ({useRouter: () => ({push: () => {}})}));
// next/font is the compiler's: outside a build it throws.
vi.mock("next/font/local", () => ({default: () => ({className: "", variable: "", style: {}})}));

import AboutPage from "@/app/(public)/about/page";
import ProductPage from "@/app/(public)/product/page";
import {cvPicture} from "@/components/market-hub/covers";
import ContentsMayVary from "@/components/stories/contents-may-vary/ContentsMayVary";
import PeakPython from "@/components/stories/peak-python/PeakPython";
import PickASide from "@/components/stories/pick-a-side/PickASide";
import TheLobby from "@/components/stories/the-lobby/TheLobby";
import WithinElevenJobs from "@/components/stories/within-eleven-jobs/WithinElevenJobs";
import amina from "./art/amina-figure";
import joon from "./art/joon-scene";
import kofi from "./art/kofi-figure";
import mateo from "./art/mateo-scene";
import rosa from "./art/rosa-figure";
import tomas from "./art/tomas-figure";
import reader from "./art/tomas-reading";
import type {Art} from "./art-type";
import {personSvg} from "./draw";

/*
 * The cast (founder, 15 and 16 Oct 2026): a few hand drawn people, each set
 * into the text beside the sentence it adds to. Just the drawing, no shape
 * behind it; in dark the drawing becomes line art in the paper colour.
 */

const SRC = join(__dirname, "..", "..");
const read = (path: string) => readFileSync(join(SRC, path), "utf8");
const story = (c: (p: {fonts: string}) => ReactElement) => renderToStaticMarkup(createElement(c, {fonts: ""})).replace(/<!-- -->/g, "");
const page = async (p: () => Promise<ReactElement>) => renderToStaticMarkup(await p()).replace(/<!-- -->/g, "");
/** Each person on a page: the block it sits in, and the text of the paragraph straight after it. */
const people = (html: string) => [...html.matchAll(/<div class="([^"]*)" style="--w:(\d+)px" aria-hidden="true"><svg class="person"(.*?)<\/svg><\/div>(<p[^>]*>(.*?)<\/p>)?/g)]
    .map((m) => ({cls: m[1], width: Number(m[2]), body: m[3], next: (m[5] ?? "").replace(/<[^>]+>/g, "").replace(/&#x27;/g, "'")}));
const who = (html: string, art: Art) => people(html).filter((p) => p.body.includes(art.svg));

describe("the cast's drawings", () => {
    const ART = {amina, joon, kofi, mateo, reader, rosa, tomas};

    it("are only the seven the site shows, each credited to its library", () => {
        const files = readdirSync(join(__dirname, "art")).map((f) => f.replace(/\.ts$/, "")).sort();
        expect(files).toEqual(["amina-figure", "joon-scene", "kofi-figure", "mateo-scene", "rosa-figure", "tomas-figure", "tomas-reading"]);
        for (const f of files) {
            expect(read(`components/people/art/${f}.ts`), f).toMatch(/^\/\/ .*(Open Peeps|Open Doodles) by Pablo Stanley .*CC0 1\.0/);
            expect(read(`components/people/art/${f}.ts`), f).toContain(`{id: "${f}", `);
        }
        const licences = read("components/people/LICENSES.md");
        for (const s of ["Open Peeps", "Open Doodles", "Pablo Stanley", "CC0 1.0", "https://www.openpeeps.com", "https://www.opendoodles.com"]) expect(licences).toContain(s);
        expect(existsSync(join(__dirname, "CC0-1.0.txt"))).toBe(true);
    });

    it("keep ink and paper as variables the page sets, never the library's black and white", () => {
        for (const [name, a] of Object.entries(ART)) {
            expect(a.vb, name).toHaveLength(4);
            expect(a.svg, name).not.toMatch(/#000000|#FFFFFF|"black"|"white"|--m-|<svg|url\(#|id="/i);
            expect(a.svg, name).toContain('fill="currentColor"');
        }
    });
});

describe("a person, on the page", () => {
    it("is just the drawing: nothing drawn behind or around it", () => {
        for (const a of Object.values({amina, joon, kofi, mateo, reader, rosa, tomas})) {
            const around = personSvg(a).replace(a.svg, "");
            expect(around).toMatch(/^<svg class="person" viewBox="[^"]+" aria-hidden="true" focusable="false" style="--line-art:url\(#line-art-[a-z-]+\)"><defs><filter /);
            expect(around).not.toMatch(/<(path|rect|circle|ellipse|polygon|image)\b|people-pad|fill="#/);
        }
        const css = read("components/people/people.module.css").replace(/\/\*[^]*?\*\//g, "");
        expect(css).not.toMatch(/[\s;{](background|border|box-shadow|outline|clip-path|mask)[\w-]*\s*:/);
        expect(read("app/globals.css")).not.toContain("--people-pad");
    });

    it("turns to line art in dark: white ink on black paper into a filter that keeps the lines and hollows the solids", () => {
        const s = personSvg(rosa), [, , w, h] = rosa.vb;
        expect(s).toContain(`<feMorphology in="ink" operator="erode" radius="${+(Math.max(w, h) * .006).toFixed(2)}" result="core"/>`);
        expect(s).toContain(`<feComposite in="ink" in2="core" operator="out" result="cut"/><feMorphology in="cut" operator="dilate" radius="${+(Math.max(w, h) * .0022).toFixed(2)}" result="edge"/>`);
        expect(s).toMatch(/<g class="ink">/);
        const css = read("components/people/people.module.css");
        expect(css).toMatch(/:global\(\.dark\) \.person:not\(\.onLight\) \{ color: #fff; --pp: #000; \}/);
        expect(css).toMatch(/:global\(\.dark\) \.person:not\(\.onLight\) :global\(\.ink\) \{ filter: var\(--line-art\); \}/);
        expect(css).toMatch(/:global\(feFlood\) \{ flood-color: #f7f3ef; \}/);
    });

    it("in light keeps the library's ink and fills its paper with the ground it stands on", () => {
        expect(read("components/people/people.module.css")).toMatch(/\.person \{[^}]*color: #21201c; --pp: var\(--person-ground, var\(--background\)\);/);
        expect(read("components/stories/contents-may-vary/cmv.module.css")).toMatch(/--person-ground: var\(--ground\);/);
        expect(read("components/stories/the-lobby/lobby.module.css")).toMatch(/\.inside \{ --person-ground: var\(--cream\);/);
    });
});

describe("where the cast stands: in the text, beside a sentence, a few only", () => {
    it("/about: Mateo and his coffee beside \"Both are tiring.\", Tomas standing beside \"where you stand\"", async () => {
        const html = await page(AboutPage);
        expect(people(html)).toHaveLength(2);
        expect(who(html, mateo)[0].next).toBe("So people guess. Some apply for everything. Some apply for nothing. Both are tiring.");
        expect(who(html, tomas)[0].next).toMatch(/^We show where you stand against today's jobs\./);
    });

    it("/product: Kofi beside \"Move each one along\", and nobody over the CV card", async () => {
        const html = await page(ProductPage);
        expect(people(html)).toHaveLength(1);
        expect(who(html, kofi)[0].next).toContain("Move each one along");
        expect(html).not.toMatch(/cvcard[^"]*"><div/);
    });

    it("The lobby: Rosa in the last section; Contents may vary: Joon beside what is in the box; Pick a side: nobody", () => {
        const lobby = who(story(TheLobby), rosa);
        expect(lobby).toHaveLength(1);
        expect(lobby[0].next).toMatch(/waiting in the lobby\.$/);
        expect(lobby[0].cls).toMatch(/onLight/); // the inside stays cream in both themes
        const box = who(story(ContentsMayVary), joon);
        expect(box).toHaveLength(1);
        expect(box[0].next).toMatch(/^Whatever the side says\./);
        expect(story(PickASide)).not.toContain('class="person"');
    });

    it("Peak Python: Amina stands under \"The ridge almost every job stands on\", in a section of words alone", () => {
        const html = story(PeakPython), [p] = who(html, amina);
        expect(people(html)).toHaveLength(1);
        expect(p.next).toMatch(/The tallest peak is the range’s own name\./);
        const section = html.slice(html.lastIndexOf("<section", html.indexOf('<svg class="person"')), html.indexOf("</section>", html.indexOf('<svg class="person"')));
        expect(section).toContain("The ridge almost every job stands on");
        expect(section).not.toMatch(/<figure|<svg(?! class="person")[^>]*viewBox/);
    });

    it("Within eleven jobs: Tomas reads beside \"What they mean for you is yours to read.\"", () => {
        const html = story(WithinElevenJobs), [p] = who(html, reader);
        expect(people(html)).toHaveLength(1);
        expect(p.next).toMatch(/What they mean for you is yours to read\.$/);
    });

    it("never in a hero or at the top: every one follows its section's heading and sits before a paragraph", async () => {
        for (const html of [await page(AboutPage), await page(ProductPage), story(TheLobby), story(ContentsMayVary), story(PeakPython), story(WithinElevenJobs)]) {
            const at = html.indexOf('<svg class="person"');
            expect(at).toBeGreaterThan(html.indexOf("</h1>"));
            expect(html.lastIndexOf("</h2>", at)).toBeGreaterThan(html.indexOf("</h1>"));
            for (const p of people(html)) expect(p.next).not.toBe("");
        }
    });

    it("none on the /market CV card", () => {
        expect(cvPicture()).not.toContain('class="person"');
    });
});

describe("the old dolls", () => {
    const files = (dir: string): string[] => readdirSync(dir).flatMap((f) => {
        const p = join(dir, f);
        return statSync(p).isDirectory() ? files(p) : /\.(tsx?|css)$/.test(f) ? [p] : [];
    });

    it("are gone: no file left, nothing names them", () => {
        expect(existsSync(join(SRC, "components", "stories", "doll.ts"))).toBe(false);
        for (const f of files(SRC).filter((f) => f !== __filename)) expect(readFileSync(f, "utf8"), f).not.toMatch(/stories\/doll|dollSvg|dollAt\(|\.attendant|\.dealer\b/);
    });

    it("leave client components without drawings: the server draws each person", () => {
        for (const f of ["stories/contents-may-vary/Box.tsx", "stories/the-lobby/Lift.tsx", "stories/peak-python/Range.tsx", "market-hub/HubCv.tsx"]) {
            const src = read(`components/${f}`);
            expect(src.startsWith("'use client'"), f).toBe(true);
            expect(src, f).not.toMatch(/people\//);
        }
    });
});
