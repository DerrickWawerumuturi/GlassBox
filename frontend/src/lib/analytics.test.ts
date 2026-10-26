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

    it("every market page is a known page name, and an unknown name is dropped", async () => {
        const a = await load();
        a.initAnalytics("phc_test");
        for (const page of ["software-engineering", "ai", "machine-learning", "devops"] as const) {
            a.track("fact_copied", {page});
            a.track("cta_clicked", {where: page});
            a.scanEvents("upload", page);
            expect(posthog.capture).toHaveBeenCalledWith("fact_copied", {page});
            expect(posthog.capture).toHaveBeenCalledWith("cta_clicked", {where: page});
            expect(posthog.capture).toHaveBeenCalledWith("scan_started", {from: page});
        }
        (a.track as (e: string, p: object) => void)("fact_copied", {page: "Python appears in 68 jobs"});
        expect(posthog.capture).toHaveBeenCalledWith("fact_copied", {});
        a.track("cta_clicked", {where: "years"});
        expect(posthog.capture).toHaveBeenCalledWith("cta_clicked", {where: "years"});
    });

    it("the CV button says where it was, by a known name only", async () => {
        const a = await load();
        a.initAnalytics("phc_test");
        a.track("cta_clicked", {where: "entry-level-software"});
        a.track("cta_clicked", {where: "hero"});
        a.track("cta_clicked", {where: "years"});
        const loose = a.track as (e: string, p: object) => void;
        loose("cta_clicked", {where: "devops", ask: "Python, Go", file_name: "cv.pdf"});
        loose("cta_clicked", {where: "sticky"});
        expect(posthog.capture).toHaveBeenCalledWith("cta_clicked", {where: "entry-level-software"});
        expect(posthog.capture).toHaveBeenCalledWith("cta_clicked", {where: "hero"});
        expect(posthog.capture).toHaveBeenCalledWith("cta_clicked", {where: "years"});
        expect(posthog.capture).toHaveBeenCalledWith("cta_clicked", {where: "devops"});
        expect(posthog.capture).toHaveBeenCalledWith("cta_clicked", {});   // the sticky line is gone, and so is its name
    });

    it("the closing CV card of /product and /about says which page it was on", async () => {
        const a = await load();
        a.initAnalytics("phc_test");
        a.track("cta_clicked", {where: "product"});
        a.track("cta_clicked", {where: "about"});
        expect(posthog.capture).toHaveBeenCalledWith("cta_clicked", {where: "product"});
        expect(posthog.capture).toHaveBeenCalledWith("cta_clicked", {where: "about"});
    });

    it("each story's CV button and the /market grid's say which, by a known name only", async () => {
        const a = await load();
        a.initAnalytics("phc_test");
        const places = ["story_pick_a_side", "story_the_lobby", "story_contents_may_vary", "story_peak_python", "story_within_eleven_jobs", "market"] as const;
        for (const where of places) {
            a.track("cta_clicked", {where});
            expect(posthog.capture).toHaveBeenCalledWith("cta_clicked", {where});
        }
        (a.track as (e: string, p: object) => void)("cta_clicked", {where: "story_the_two_years"});
        expect(posthog.capture).toHaveBeenLastCalledWith("cta_clicked", {});
    });

    it("the header's Try it out says which menu it was in", async () => {
        const a = await load();
        a.initAnalytics("phc_test");
        a.track("cta_clicked", {where: "header"});
        a.track("cta_clicked", {where: "menu"});
        expect(posthog.capture).toHaveBeenCalledWith("cta_clicked", {where: "header"});
        expect(posthog.capture).toHaveBeenCalledWith("cta_clicked", {where: "menu"});
    });

    it("a refused file and a failed scan say why, as a known kind, never the file or the error", async () => {
        const a = await load();
        a.initAnalytics("phc_test");
        const loose = a.track as (e: string, p: object) => void;
        loose("file_refused", {reason: "not_pdf", file_name: "CV_Amara.docx", size: 9});
        a.scanEvents("upload").failed("timeout");
        loose("scan_failed", {stage: "upload", reason: "Groq said: Amara Okafor, Python", error: "x"});
        loose("file_refused", {reason: "amara@example.com"});
        expect(posthog.capture).toHaveBeenCalledWith("file_refused", {reason: "not_pdf"});
        expect(posthog.capture).toHaveBeenCalledWith("scan_failed", {stage: "upload", reason: "timeout"});
        expect(posthog.capture).toHaveBeenCalledWith("scan_failed", {stage: "upload"});
        expect(posthog.capture).toHaveBeenCalledWith("file_refused", {});
        const out = a.scrub({event: "file_refused", properties: {reason: "too_big", name: "cv.pdf", token: "t", distinct_id: "d"}} as never);
        expect(out?.properties).toEqual({reason: "too_big", token: "t", distinct_id: "d"});
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

describe("a story's interaction", () => {
    const sent = () => posthog.capture.mock.calls.filter((c) => c[0] === "story_interacted").map((c) => c[1]);

    it("is one story_interacted per page view, the story and the kind only", async () => {
        const a = await load();
        a.initAnalytics("phc_test");
        a.trackPageview("/market/entry-level-software/pick-a-side");
        a.storyInteracted("pick-a-side", "pick_side");
        a.storyInteracted("pick-a-side", "scratch");
        a.storyInteracted("pick-a-side", "reveal_all");
        expect(sent()).toEqual([{story: "pick-a-side", kind: "pick_side"}]);
        // A new page view (another story, or back again) counts again.
        a.trackPageview("/market/devops/within-eleven-jobs");
        a.storyInteracted("within-eleven-jobs", "crane");
        a.storyInteracted("within-eleven-jobs", "fly_over");
        expect(sent()).toEqual([{story: "pick-a-side", kind: "pick_side"}, {story: "within-eleven-jobs", kind: "crane"}]);
    });

    it("takes known stories and kinds only, and nothing else rides along", async () => {
        const a = await load();
        a.initAnalytics("phc_test");
        (a.track as (e: string, p: object) => void)("story_interacted", {story: "the-two-years", kind: "scratch", guess: "senior", email: "a@b.c"});
        (a.track as (e: string, p: object) => void)("story_interacted", {story: "the-lobby", kind: "Python, 5 years"});
        expect(sent()).toEqual([{kind: "scratch"}, {story: "the-lobby"}]);
    });

    it("marks scan events as internal only when a session test key is present", async () => {
        const a = await load();
        a.initAnalytics("phc_test");
        vi.stubGlobal("window", {sessionStorage: {getItem: vi.fn(() => "test-secret")}});
        a.scanEvents("upload").failed("server");
        expect(posthog.capture).toHaveBeenCalledWith("scan_started", {internal_test: true});
        expect(posthog.capture).toHaveBeenCalledWith("cv_uploaded", {internal_test: true});
        expect(posthog.capture).toHaveBeenCalledWith("scan_failed", {stage: "upload", reason: "server", internal_test: true});
    });

    it("sends nothing without a key", async () => {
        const a = await load();
        a.storyInteracted("the-lobby", "lift");
        expect(posthog.capture).not.toHaveBeenCalled();
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

    it("is the same for a story landed on from a tagged link as for a market page, its query string left off", async () => {
        for (const path of ["/market/entry-level-software/pick-a-side", "/market/entry-level-software"]) {
            vi.resetModules(); posthog.capture.mockClear();
            visit("https://www.reddit.com/r/cscareerquestions/comments/abc", "?utm_source=reddit&utm_medium=social&utm_campaign=stories");
            const a = await load();
            a.initAnalytics("phc_test");
            a.trackPageview(`${path}?utm_source=reddit&utm_medium=social&utm_campaign=stories`);
            a.storyInteracted("pick-a-side", "scratch");
            expect(posthog.capture.mock.calls[0]).toEqual(["$pageview",
                {$current_url: path, ref_domain: "reddit.com", utm_source: "reddit", utm_medium: "social", utm_campaign: "stories"}]);
        }
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
