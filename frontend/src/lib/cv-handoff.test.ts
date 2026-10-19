import {readFileSync} from "node:fs";
import {fileURLToPath} from "node:url";
import {createElement} from "react";
import {renderToStaticMarkup} from "react-dom/server";
import {beforeEach, describe, expect, it, vi} from "vitest";

/*
 * The phone handoff (lib/cv-handoff.ts, components/cv-ask/PhoneHandoff.tsx):
 * the link keeps the visit's utm_source and says utm_medium=phone-handoff,
 * cv_handoff is counted only when the link really left, and the line and its
 * two actions show only on a phone or tablet.
 */

const h = vi.hoisted(() => ({track: vi.fn()}));
vi.mock("@/lib/analytics", async (original) => ({...await original<typeof import("@/lib/analytics")>(), track: h.track}));

import {allowedProps} from "@/lib/analytics";
import CompareCv from "@/components/cv-ask/CompareCv";
import {copyHandoff, HANDOFF, handoffUrl, shareHandoff} from "@/lib/cv-handoff";

const PAGE = "https://glassbox.example/market/ai?utm_source=linkedin&utm_medium=social&utm_campaign=launch#finding-skill";

beforeEach(() => { h.track.mockClear(); });

describe("the handoff link", () => {
    it("keeps the page and its utm_source, and says it was taken from a phone", () => {
        const url = new URL(handoffUrl(PAGE));
        expect(url.pathname).toBe("/market/ai");
        expect(url.searchParams.get("utm_source")).toBe("linkedin");
        expect(url.searchParams.get("utm_campaign")).toBe("launch");
        expect(url.searchParams.get("utm_medium")).toBe("phone-handoff");
        expect(url.searchParams.getAll("utm_medium")).toHaveLength(1);
        expect(url.hash).toBe("");
    });

    it("adds the medium to a page reached with no tags", () => {
        expect(handoffUrl("https://glassbox.example/")).toBe("https://glassbox.example/?utm_medium=phone-handoff");
    });
});

describe("cv_handoff", () => {
    it("copies the link and counts how and where", async () => {
        const writeText = vi.fn().mockResolvedValue(undefined);
        expect(await copyHandoff("hero", {clipboard: {writeText}} as never, PAGE)).toBe(true);
        expect(writeText).toHaveBeenCalledWith(handoffUrl(PAGE));
        expect(h.track).toHaveBeenCalledWith("cv_handoff", {how: "copy", where: "hero"});
    });

    it("counts nothing when the copy fails", async () => {
        const writeText = vi.fn().mockRejectedValue(new Error("denied"));
        expect(await copyHandoff("hero", {clipboard: {writeText}} as never, PAGE)).toBe(false);
        expect(h.track).not.toHaveBeenCalled();
    });

    it("shares the link through the phone's sheet and counts it once shared", async () => {
        const share = vi.fn().mockResolvedValue(undefined);
        expect(await shareHandoff("story_pick_a_side", {share} as never, PAGE, "Pick a side")).toBe(true);
        expect(share).toHaveBeenCalledWith({title: "Pick a side", url: handoffUrl(PAGE)});
        expect(h.track).toHaveBeenCalledWith("cv_handoff", {how: "share", where: "story_pick_a_side"});
    });

    it("counts nothing when the sheet is closed, or there is no sheet", async () => {
        const share = vi.fn().mockRejectedValue(new DOMException("closed", "AbortError"));
        expect(await shareHandoff("hero", {share} as never, PAGE, "t")).toBe(false);
        expect(await shareHandoff("hero", {} as never, PAGE, "t")).toBe(false);
        expect(h.track).not.toHaveBeenCalled();
    });

    it("may carry only how and where, each a known name", () => {
        expect(allowedProps("cv_handoff", {how: "copy", where: "ai", url: PAGE})).toEqual({how: "copy", where: "ai"});
        expect(allowedProps("cv_handoff", {how: "email", where: "somewhere"})).toEqual({});
    });
});

describe("on a phone", () => {
    it("the line and both actions sit under Compare your CV, with a live line for Link copied", () => {
        const html = renderToStaticMarkup(createElement(CompareCv, {onClick: () => {}, scanning: false, where: "hero"}));
        expect(html).toContain(`class="cv-handoff"`);
        expect(html).toContain(HANDOFF.line);
        expect(html).toContain(HANDOFF.copy);
        expect(html).toContain(HANDOFF.share);
        expect(html).toMatch(/role="status" aria-live="polite"/);
        expect(html).not.toMatch(/email|phone number/i);
    });

    it("goes while a scan runs: the CV is on this phone after all", () => {
        const html = renderToStaticMarkup(createElement(CompareCv, {onClick: () => {}, scanning: true, where: "hero"}));
        expect(html).not.toContain("cv-handoff");
    });

    it("shows only where a coarse pointer meets a small screen, hidden everywhere else", () => {
        const css = readFileSync(fileURLToPath(new URL("../components/cv-ask/handoff.css", import.meta.url)), "utf8")
            .replace(/\/\*[\s\S]*?\*\//g, "");
        expect(css).toMatch(/^\.cv-handoff \{ display: none; \}/m);
        const shown = css.match(/@media ([^{]+)\{\s*\.cv-handoff \{ display: flex;/);
        expect(shown?.[1].trim()).toBe("(pointer: coarse) and (max-width: 1024px)");
    });
});
