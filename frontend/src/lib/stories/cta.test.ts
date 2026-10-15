import {createElement} from "react";
import {renderToStaticMarkup} from "react-dom/server";
import {beforeEach, describe, expect, it, vi} from "vitest";

/*
 * "Compare your CV" on a story and on the /market grid fires the existing
 * cta_clicked with a place of its own, then opens the CV sheet: the story's
 * about the skills it counts, the grid's about today's jobs.
 */

const h = vi.hoisted(() => ({click: null as null | (() => void), open: vi.fn(), track: vi.fn()}));
vi.mock("@/components/cv-ask/CompareCv", () => ({default: (p: {onClick: () => void}) => { h.click = p.onClick; return null; }}));
vi.mock("@/components/cv-ask/useCvScan", () => ({useCvScan: () => ({open: h.open, isOpen: false, scanning: false, sheet: null})}));
vi.mock("@/components/landing/useHave", () => ({useHave: () => null}));
vi.mock("@/lib/analytics", async (original) => ({...await original<typeof import("@/lib/analytics")>(), track: h.track}));
vi.mock("next/navigation", () => ({useRouter: () => ({push: vi.fn()})}));

import HubCv from "@/components/market-hub/HubCv";
import StoryCvAsk from "@/components/stories/StoryCvAsk";
import {STORIES} from "@/lib/stories";

beforeEach(() => { h.click = null; h.open.mockClear(); h.track.mockClear(); });

describe("Compare your CV", () => {
    it("on each story says which story, and asks about the skills that story counts", () => {
        for (const story of STORIES) {
            renderToStaticMarkup(createElement(StoryCvAsk, {story}));
            h.click!();
            expect(h.track).toHaveBeenLastCalledWith("cta_clicked", {where: `story_${story.slug.replaceAll("-", "_")}`});
            expect(h.open).toHaveBeenLastCalledWith(expect.objectContaining({skills: story.ask, jobs: story.readable, what: "skills this story counts"}));
        }
    });

    it("on the /market grid says market, and opens the sheet about today's jobs", () => {
        renderToStaticMarkup(createElement(HubCv));
        h.click!();
        expect(h.track).toHaveBeenLastCalledWith("cta_clicked", {where: "market"});
        expect(h.open).toHaveBeenLastCalledWith();
    });
});
