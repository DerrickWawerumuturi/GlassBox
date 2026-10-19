import {createElement} from "react";
import {renderToStaticMarkup} from "react-dom/server";
import {describe, expect, it, vi} from "vitest";

/*
 * Every CV ask a phone visitor meets carries the handoff (PhoneHandoff), with
 * the same `where` as its "Compare your CV" or "Add your CV" click: the
 * landing's hero and closing, a market page and a story, the /market grid,
 * and the close of /product and /about.
 */

vi.mock("@/components/cv-ask/PhoneHandoff", () => ({default: ({where}: {where: string}) => createElement("i", {"data-handoff": where})}));
vi.mock("@/components/cv-ask/useCvScan", () => ({useCvScan: () => ({open: vi.fn(), isOpen: false, scanning: false, sheet: null})}));
vi.mock("@/components/landing/useHave", () => ({useHave: () => null}));
vi.mock("next/navigation", () => ({useRouter: () => ({push: vi.fn()})}));

import CvSection from "@/components/landing/CvSection";
import Hero from "@/components/landing/Hero";
import HubCv from "@/components/market-hub/HubCv";
import CvClose from "@/components/product/CvClose";
import StoryCvAsk from "@/components/stories/StoryCvAsk";
import {STORIES} from "@/lib/stories";

const places = (html: string) => [...html.matchAll(/data-handoff="([^"]+)"/g)].map((m) => m[1]);
const ask = {skills: [{key: "python", name: "Python"}], what: "skills backend jobs ask for most", jobs: 10, subject: "Backend"};
const data = {readable: 10} as never;

describe("the handoff on every CV ask", () => {
    it("the landing's hero and closing section", () => {
        expect(places(renderToStaticMarkup(createElement(Hero, {total: "1,000", ask, scanning: false, onFind: () => {}})))).toEqual(["hero"]);
        expect(places(renderToStaticMarkup(createElement(CvSection, {asks: [], data, have: null, scanning: false, onCv: () => {}})))).toEqual(["closing"]);
    });

    it("not in the closing section once a scan is in", () => {
        expect(places(renderToStaticMarkup(createElement(CvSection, {asks: [], data, have: new Set(["python"]), scanning: false, onCv: () => {}})))).toEqual([]);
    });

    it("each story, with its own place", () => {
        for (const story of STORIES) {
            expect(places(renderToStaticMarkup(createElement(StoryCvAsk, {story})))).toEqual([`story_${story.slug.replaceAll("-", "_")}`]);
        }
    });

    it("the /market grid's CV card, and the close of /product and /about", () => {
        expect(places(renderToStaticMarkup(createElement(HubCv)))).toEqual(["market"]);
        expect(places(renderToStaticMarkup(createElement(CvClose, {where: "product"})))).toEqual(["product"]);
        expect(places(renderToStaticMarkup(createElement(CvClose, {where: "about"})))).toEqual(["about"]);
    });
});
