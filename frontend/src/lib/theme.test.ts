import {describe, expect, it} from "vitest";

import {isDark, parseChoice, themeScript} from "./theme";

/** Run the <head> script against a fake page; return the <html> it leaves. */
function boot(script: string, {stored = null as string | null, systemDark = false, search = "", storageThrows = false} = {}) {
    const classes = new Set<string>();
    const root = {classList: {add: (c: string) => classes.add(c)}, dataset: {} as Record<string, string>};
    // Answers only for the real key, so a wrong key reads as "nothing stored".
    const localStorage = {getItem: (key: string) => { if (storageThrows) throw new Error("blocked"); return key === "theme" ? stored : null; }};
    new Function("document", "localStorage", "matchMedia", "location", "URLSearchParams", script)(
        {documentElement: root}, localStorage, () => ({matches: systemDark}), {search}, URLSearchParams);
    return {dark: classes.has("dark")};
}

describe("theme choice", () => {
    it("defaults to System for anything unknown", () => {
        expect(parseChoice(null)).toBe("system");
        expect(parseChoice("sepia")).toBe("system");
        expect(parseChoice("light")).toBe("light");
    });

    it("System follows the OS; Dark and Light ignore it", () => {
        expect(isDark("system", true)).toBe(true);
        expect(isDark("system", false)).toBe(false);
        expect(isDark("light", true)).toBe(false);
        expect(isDark("dark", false)).toBe(true);
    });
});

describe("themeScript (no flash on load)", () => {
    it("paints the stored choice before the body", () => {
        expect(boot(themeScript(), {stored: "dark"}).dark).toBe(true);
        expect(boot(themeScript(), {stored: "light", systemDark: true}).dark).toBe(false);
        expect(boot(themeScript(), {systemDark: true}).dark).toBe(true);
    });

    it("falls back to dark when storage is blocked", () => {
        expect(boot(themeScript(), {storageThrows: true}).dark).toBe(true);
    });

});
