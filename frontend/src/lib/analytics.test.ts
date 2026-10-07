import {beforeEach, describe, expect, it, vi} from "vitest";

const posthog = vi.hoisted(() => ({init: vi.fn(), capture: vi.fn(), identify: vi.fn(), reset: vi.fn()}));
vi.mock("posthog-js", () => ({default: posthog}));

/** A fresh module each time: analytics keeps an "is it on" flag. */
const load = () => import("./analytics");

beforeEach(() => {
    vi.resetModules();
    Object.values(posthog).forEach((fn) => fn.mockClear());
    vi.stubGlobal("window", {});
    vi.stubEnv("NEXT_PUBLIC_POSTHOG_KEY", "");
});

describe("analytics without a key", () => {
    it("is a no-op: nothing starts, nothing is sent", async () => {
        const a = await load();
        expect(a.initAnalytics("")).toBe(false);
        a.track("scan_started", {});
        a.trackPageview("/dashboard");
        await a.identifyUser("123");
        expect(posthog.init).not.toHaveBeenCalled();
        expect(posthog.capture).not.toHaveBeenCalled();
        expect(posthog.identify).not.toHaveBeenCalled();
    });
});

describe("analytics with a key", () => {
    it("starts on US cloud (through /ingest) with no storage, autocapture or recording", async () => {
        const a = await load();
        expect(a.initAnalytics("phc_test")).toBe(true);
        const [key, config] = posthog.init.mock.calls[0];
        expect(key).toBe("phc_test");
        expect(config).toMatchObject({
            api_host: "/ingest", ui_host: "https://us.posthog.com", persistence: "memory", autocapture: false, capture_pageview: false,
            capture_pageleave: true, disable_session_recording: true, respect_dnt: true, ip: false,
        });
    });

    it("never sends a file name, skills or an email, even when passed by mistake", async () => {
        const a = await load();
        a.initAnalytics("phc_test");
        const leaky = {duration_s: 41, jobs: 58, file_name: "CV_Amara.pdf", skills: ["Python"], email: "a@b.c"};
        (a.track as (e: string, p: object) => void)("scan_finished", leaky);
        expect(posthog.capture).toHaveBeenCalledWith("scan_finished", {duration_s: 41, jobs: 58});
    });

    it("a market page's events carry only the page's name", async () => {
        const a = await load();
        a.initAnalytics("phc_test");
        (a.track as (e: string, p: object) => void)("fact_copied", {page: "entry-level-software", text: "Python appears in 68 jobs"});
        a.track("cta_clicked", {where: "entry-level-software"});
        const scan = a.scanEvents("upload", "entry-level-software");
        scan.finished(58);
        expect(posthog.capture).toHaveBeenCalledWith("fact_copied", {page: "entry-level-software"});
        expect(posthog.capture).toHaveBeenCalledWith("cta_clicked", {where: "entry-level-software"});
        expect(posthog.capture).toHaveBeenCalledWith("scan_started", {from: "entry-level-software"});
        expect(posthog.capture).toHaveBeenCalledWith("scan_finished", expect.objectContaining({jobs: 58, from: "entry-level-software"}));
        const scrubbed = a.scrub({event: "fact_copied", properties: {page: "entry-level-software", text: "x", token: "t", distinct_id: "d"}} as never);
        expect(scrubbed?.properties).toEqual({page: "entry-level-software", token: "t", distinct_id: "d"});
    });

    it("a scan from anywhere else says nothing about where it started", async () => {
        const a = await load();
        a.initAnalytics("phc_test");
        a.scanEvents("reuse");
        expect(posthog.capture).toHaveBeenCalledWith("scan_started", {});
    });

    it("sends pages as a path, without the query string", async () => {
        const a = await load();
        a.initAnalytics("phc_test");
        a.trackPageview("/dashboard/market?view=gaps&file_name=cv.pdf");
        expect(posthog.capture).toHaveBeenCalledWith("$pageview", {$current_url: "/dashboard/market"});
    });

    it("identifies by a hash of the account id, never the id itself", async () => {
        const a = await load();
        a.initAnalytics("phc_test");
        await a.identifyUser("109876543210");
        const [id] = posthog.identify.mock.calls[0];
        expect(id).toMatch(/^u_[0-9a-f]{32}$/);
        expect(id).not.toContain("109876543210");
    });
});

describe("scrub (before anything leaves the browser)", () => {
    it("strips queries, referrers and stray properties, and drops unknown events", async () => {
        const {scrub} = await load();
        const out = scrub({
            uuid: "1", event: "scan_failed",
            properties: {stage: "upload", file_name: "cv.pdf", $current_url: "https://x.app/dashboard/scan?token=abc", $referrer: "https://mail.example/inbox"},
        } as never);
        expect(out?.properties).toEqual({stage: "upload", $current_url: "/dashboard/scan"});
        expect(scrub({uuid: "2", event: "$autocapture", properties: {}} as never)).toBeNull();
    });

    it("keeps the token and id PostHog needs to accept an event", async () => {
        const {scrub} = await load();
        const out = scrub({uuid: "3", event: "view_opened", properties: {page: "skills", token: "phc_x", distinct_id: "u_1"}} as never);
        expect(out?.properties).toEqual({page: "skills", token: "phc_x", distinct_id: "u_1"});
    });
});

describe("pageviews", () => {
    it("send once per path, even when an effect runs twice", async () => {
        const a = await load();
        a.initAnalytics("phc_test");
        a.trackPageview("/dashboard");
        a.trackPageview("/dashboard?x=1");
        a.trackPageview("/dashboard/gaps");
        expect(posthog.capture.mock.calls.map((c) => c[1].$current_url)).toEqual(["/dashboard", "/dashboard/gaps"]);
    });
});

describe("where a visit came from", () => {
    const visit = (referrer: string, search = "", host = "seeglassbox.com") => {
        vi.stubGlobal("document", {referrer});
        vi.stubGlobal("location", {search, hostname: host});
    };

    it("the first pageview carries the referring site's name and the utm tags, nothing more", async () => {
        visit("https://www.reddit.com/r/cscareerquestions/comments/abc?share=1", "?utm_source=reddit&utm_campaign=launch&ref=x&email=a@b.c");
        const a = await load();
        a.initAnalytics("phc_test");
        a.trackPageview("/");
        a.trackPageview("/product");
        const [first, second] = posthog.capture.mock.calls.map((c) => c[1]);
        expect(first).toEqual({$current_url: "/", ref_domain: "reddit.com", utm_source: "reddit", utm_campaign: "launch"});
        expect(second).toEqual({$current_url: "/product"});
    });

    it("drops our own site and trims utm values to 100 characters", async () => {
        visit("https://seeglassbox.com/about", `?utm_content=${"x".repeat(150)}`, "www.seeglassbox.com");
        const a = await load();
        a.initAnalytics("phc_test");
        a.trackPageview("/");
        expect(posthog.capture.mock.calls[0][1]).toEqual({$current_url: "/", utm_content: "x".repeat(100)});
    });

    it("drops a utm value that looks like an address or an email", async () => {
        const {visitSource} = await load();
        expect(visitSource("", "?utm_source=https://evil.example/p?q=1&utm_medium=a@b.c&utm_term=jobs", "seeglassbox.com"))
            .toEqual({utm_term: "jobs"});
    });

    it("scrub never lets a full referrer address or a query string through", async () => {
        const {scrub} = await load();
        const out = scrub({
            uuid: "4", event: "$pageview",
            properties: {
                $current_url: "https://seeglassbox.com/?utm_source=reddit", ref_domain: "https://reddit.com/r/x?y=1",
                utm_source: "reddit", utm_medium: "https://x.example/?a=b", referrer: "https://reddit.com/r/x", title: "Glassbox",
                $referrer: "https://reddit.com/r/x", token: "phc_x", distinct_id: "u_1",
            },
        } as never);
        expect(out?.properties).toEqual({$current_url: "/", utm_source: "reddit", token: "phc_x", distinct_id: "u_1"});
    });

    it("scrub keeps a bare referring domain on a pageview, and only there", async () => {
        const {scrub} = await load();
        const page = scrub({uuid: "5", event: "$pageview", properties: {ref_domain: "news.ycombinator.com", utm_source: "hn"}} as never);
        expect(page?.properties).toEqual({ref_domain: "news.ycombinator.com", utm_source: "hn"});
        const leave = scrub({uuid: "6", event: "$pageleave", properties: {ref_domain: "news.ycombinator.com", utm_source: "hn"}} as never);
        expect(leave?.properties).toEqual({});
    });
});
