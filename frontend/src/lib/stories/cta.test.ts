import {createElement} from "react";
import {renderToStaticMarkup} from "react-dom/server";
import {beforeEach, describe, expect, it, vi} from "vitest";

/*
 * "Compare your CV" on a story and on the /market grid fires the existing
 * cta_clicked with a place of its own, then opens the CV sheet: the story's
 * about the skills it counts, the grid's about today's jobs.
 */

const h = vi.hoisted(() => ({click: null as null | (() => void), open: vi.fn(), track: vi.fn(), have: null as null | Set<string>}));
vi.mock("@/components/cv-ask/CompareCv", () => ({default: (p: {onClick: () => void}) => { h.click = p.onClick; return null; }}));
vi.mock("@/components/cv-ask/useCvScan", () => ({useCvScan: () => ({open: h.open, isOpen: false, scanning: false, sheet: null})}));
vi.mock("@/components/landing/useHave", () => ({useHave: () => h.have}));
vi.mock("@/lib/analytics", async (original) => ({...await original<typeof import("@/lib/analytics")>(), track: h.track}));
vi.mock("next/navigation", () => ({useRouter: () => ({push: vi.fn()})}));

import HubCv from "@/components/market-hub/HubCv";
import StoryCvAsk from "@/components/stories/StoryCvAsk";
import {STORIES} from "@/lib/stories";
import {AI_ON_YOUR_CV} from "@/lib/stories/ai-on-your-cv";

beforeEach(() => { h.click = null; h.have = null; h.open.mockClear(); h.track.mockClear(); });

describe("Compare your CV", () => {
    it("on each story says which story, and asks about the skills that story counts", () => {
        for (const story of STORIES.filter((s) => s.ask.length)) {
            renderToStaticMarkup(createElement(StoryCvAsk, {story}));
            h.click!();
            expect(h.track).toHaveBeenLastCalledWith("cta_clicked", {where: `story_${story.slug.replaceAll("-", "_")}`});
            expect(h.open).toHaveBeenLastCalledWith(expect.objectContaining({skills: story.ask, jobs: story.readable, what: "skills this story counts"}));
        }
    });

    it("inside a story that names skills, says its own place and asks about the same skills (21 Oct 2026)", () => {
        for (const place of ["story_ai_on_your_cv_guess", "story_ai_on_your_cv_street"] as const) {
            renderToStaticMarkup(createElement(StoryCvAsk, {story: AI_ON_YOUR_CV, place, question: "Q?"}));
            h.click!();
            expect(h.track).toHaveBeenLastCalledWith("cta_clicked", {where: place});
            expect(h.open).toHaveBeenLastCalledWith(expect.objectContaining({skills: AI_ON_YOUR_CV.ask, jobs: 800}));
        }
    });

    it("inside a story, steps aside once the reader has an answer, which stands once, at the end", () => {
        h.have = new Set(["llm"]);
        expect(renderToStaticMarkup(createElement(StoryCvAsk, {story: AI_ON_YOUR_CV, place: "story_ai_on_your_cv_street", question: "Q?"}))).toBe("");
        h.have = null;
        expect(renderToStaticMarkup(createElement(StoryCvAsk, {story: AI_ON_YOUR_CV, place: "story_ai_on_your_cv_street", question: "Q?"}))).toContain("<p>Q?</p>");
    });

    it("on a story that names no skills, opens the sheet about the latest jobs, as the /market grid does", () => {
        const none = STORIES.filter((s) => !s.ask.length);
        expect(none.map((s) => s.slug)).toEqual(["is-entry-level-dead"]);
        const html = renderToStaticMarkup(createElement(StoryCvAsk, {story: none[0], question: "Thanks for taking your time to read, I hope we have provided value for you."}));
        // Never "0 skills": the question is the story's own.
        expect(html).toContain("<p>Thanks for taking your time to read, I hope we have provided value for you.</p>");
        h.click!();
        expect(h.track).toHaveBeenLastCalledWith("cta_clicked", {where: "story_is_entry_level_dead"});
        expect(h.open).toHaveBeenLastCalledWith();
    });

    it("on the /market grid says market, and opens the sheet about today's jobs", () => {
        renderToStaticMarkup(createElement(HubCv));
        h.click!();
        expect(h.track).toHaveBeenLastCalledWith("cta_clicked", {where: "market"});
        expect(h.open).toHaveBeenLastCalledWith();
    });
});
