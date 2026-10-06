import {readFileSync} from "node:fs";
import {join} from "node:path";

import {describe, expect, it} from "vitest";

/*
 * Orange acts; it never marks data (brand, step C, 2026-10-05). Data
 * components may not use the orange tokens: --primary, --chart-3 or the
 * retired yellow-to-red ramp. Links and hover states that act are listed.
 */

const SRC = join(__dirname, "..");
const ORANGE = /\b(?:bg|text|fill|stroke|border|ring|from|to)-(?:primary|chart-3|chart-ramp-\d)\b|var\(--(?:primary|chart-3|chart-ramp-\d)\)/;

const DATA_FILES = [
    "components/dashboard/DemandBars.tsx", "components/dashboard/GapTally.tsx", "components/dashboard/Bridges.tsx",
    "components/dashboard/MarketParts.tsx", "components/dashboard/SkillBadge.tsx",
    "components/landing/Showcase.tsx", "components/landing/LowerSections.tsx",
];

// Actions inside data components: a link and an expanded card's outline.
const ACTIONS = ["font-medium text-primary hover:underline", "aria-expanded=true]]:border-primary"];

// In bits.tsx only the data pieces are checked; the rest holds the logo dot and buttons.
const BITS_DATA = ["TagChip", "ScoreChip", "StatusChip", "DemandMeter", "SkillTag"];

function orangeLines(text: string): string[] {
    return text.split("\n").filter((line) => ORANGE.test(line) && !ACTIONS.some((ok) => line.includes(ok))).map((l) => l.trim());
}

describe("orange stays out of data", () => {
    it("is not used by any data component", () => {
        const hits = DATA_FILES.flatMap((file) => orangeLines(readFileSync(join(SRC, file), "utf8")).map((l) => `${file}: ${l.slice(0, 80)}`));
        expect(hits).toEqual([]);
    });

    it("is not used by the chips and meters in bits.tsx", () => {
        const bits = readFileSync(join(SRC, "components/dashboard/bits.tsx"), "utf8");
        const status = bits.slice(bits.indexOf("const STATUS_STYLE"), bits.indexOf("};", bits.indexOf("const STATUS_STYLE")));
        const bodies = BITS_DATA.map((name) => {
            const start = bits.indexOf(`export function ${name}`);
            return start < 0 ? "" : bits.slice(start, bits.indexOf("\n}\n", start));
        });
        expect([status, ...bodies].flatMap(orangeLines)).toEqual([]);
    });
});
