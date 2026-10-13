import {readFileSync} from "node:fs";
import {join} from "node:path";
import {createElement} from "react";
import {renderToStaticMarkup} from "react-dom/server";
import {describe, expect, it} from "vitest";

import {PeekGlyph} from "./Peek";

const src = (f: string) => readFileSync(join(__dirname, "..", f), "utf8");

// Founder, 13 Oct 2026 (issue #6): look C and mark 1, the dot peeking over the rim, are the only looks; the switches are gone.
describe("the peek", () => {
    const css = readFileSync(join(__dirname, "peek.css"), "utf8");

    it("draws the dot under the rim, so it rises from inside the box", () => {
        const h = renderToStaticMarkup(createElement(PeekGlyph));
        expect(h).toMatch(/^<svg class="peek-glyph size-5" viewBox="0 0 20 20" aria-hidden="true"><circle class="peek-dot"[^>]*><\/circle><rect[^>]*stroke="currentColor"[^>]*><\/rect><\/svg>$/);
    });

    it("hops on hover or focus, drops on press, and keeps still with reduced motion", () => {
        expect(css).toMatch(/\.peek:is\(:hover, :focus-visible\) \.peek-dot \{ transform: translateY\(-11px\); \}/);
        expect(css).toMatch(/\.peek:active \.peek-dot \{ transform: translateY\(0\);/);
        expect(css).toMatch(/prefers-reduced-motion: reduce\) \{\s*button\.peek-button\.peek, \.peek \.peek-dot \{ transition: none; \}/);
    });

    // The founder kept C's size and type as is and asked that the family match it.
    it("styles the family as the founder's pick: 44px, radius 12, Space Grotesk 600 at 15px, white on the orange", () => {
        expect(css).toMatch(/button\.peek-button\.peek \{\s*height: 44px; padding: 0 20px 0 15px; gap: 9px; border-radius: 12px;\s*font: 600 15px\/1 var\(--font-space-grotesk\)/);
        expect(css).toMatch(/background: var\(--primary\); color: #fff;/);
    });

    it("sits on every button that takes a CV, and nowhere else", () => {
        for (const f of ["cv-ask/CompareCv.tsx", "AddCvButton.tsx", "landing/Showcase.tsx", "landing/CvSection.tsx", "cv-ask/CvSheet.tsx"]) {
            // The two classes, then the glyph as the button's first child.
            expect(src(f), f).toMatch(/className=\{"peek peek-button[^"]*"\}[^\n]*>\s*<PeekGlyph \/>/);
        }
        // The header's mono "Try it out", the dashboard's example banner and the form buttons stay quiet.
        for (const f of ["Navbar.tsx", "dashboard/AnalysisShell.tsx", "dashboard/Sidebar.tsx", "Form.tsx"]) {
            expect(src(f), f).not.toMatch(/PeekGlyph|peek-button/);
        }
    });

    it("has no look or mark switch left in the code", () => {
        for (const f of ["cv-ask/CompareCv.tsx", "Navbar.tsx", "brand/Logo.tsx"]) {
            expect(src(f), f).not.toMatch(/URLSearchParams|\?btn|\?mark|cv-look-|WordmarkIdea/);
        }
    });
});
