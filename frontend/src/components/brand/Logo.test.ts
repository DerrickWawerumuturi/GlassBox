import {readFileSync} from "node:fs";
import {join} from "node:path";
import {createElement} from "react";
import {renderToStaticMarkup} from "react-dom/server";
import {describe, expect, it} from "vitest";

import {GlassboxWordmark} from "./Logo";

const html = (peek?: boolean) => renderToStaticMarkup(createElement(GlassboxWordmark, {className: "h-[17px] w-auto", peek}));

describe("the wordmark", () => {
    // Before 13 Oct 2026 the O's path had no fill rule, so its inner square filled and the O was a solid block.
    it("draws the O as a rim with the dot inside, as the outlined file does", () => {
        const h = html();
        expect(h).toMatch(/<path d="M3849\.75 0H4245\.25[^"]*" fill-rule="evenodd"><\/path><\/svg>$/);
        // The dot sits under the O, so when it peeks it rises from behind the rim.
        expect(h).toMatch(/<circle class="wm-dot" cx="4047\.5" cy="350" r="108\.5" fill="var\(--logo-dot\)"><\/circle><path d="M3849\.75 0H4245\.25/);
        expect((h.match(/<path /g) ?? []).length).toBe(8);
        for (const f of ["wordmark-on-dark.svg", "wordmark-on-light.svg", "lockup-horizontal-on-dark.svg"]) {
            expect(readFileSync(join(__dirname, "..", "..", "..", "public", "brand", f), "utf8"), f).toMatch(/M3849\.75 0H4245\.25[^"]*" fill="[^"]*" fill-rule="evenodd"|fill-rule="evenodd"[^>]*d="M3849\.75 0H4245\.25/);
        }
    });

    it("peeks only where asked: the header passes `peek`, the footer, sidebar and title bar don't", () => {
        expect(html(true)).toMatch(/^<svg viewBox="0 -20 5069 740" class="wm-peek h-\[17px\] w-auto" role="img" aria-label="Glassbox" fill="currentColor" overflow="visible">/);
        expect(html()).toMatch(/^<svg viewBox="0 -20 5069 740" class="h-\[17px\] w-auto" role="img" aria-label="Glassbox" fill="currentColor">/);
        const css = readFileSync(join(__dirname, "logo.css"), "utf8");
        expect(css).toMatch(/:is\(a:hover, a:focus-visible\) > \.wm-peek \.wm-dot \{ transform: translateY\(-430px\); \}/);
        expect(css).toMatch(/prefers-reduced-motion: reduce\) \{\s*\.wm-peek \.wm-dot \{ transition: none; animation: none; \}/);
    });
});
