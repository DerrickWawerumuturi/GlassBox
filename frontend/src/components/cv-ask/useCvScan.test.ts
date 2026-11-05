import {beforeEach, describe, expect, it, vi} from "vitest";

// Minimal hook scheduler: exercise navigation state without adding a DOM dependency.
const h = vi.hoisted(() => {
    const slots: unknown[] = [];
    const h = {slots, index: 0, effects: [] as Array<() => void>, pending: false,
        pathname: "/market/entry-level-software", push: vi.fn(),
        state<T>(initial: T | (() => T)): [T, (value: T | ((previous: T) => T)) => void] {
            const i = h.index++;
            if (!(i in slots)) slots[i] = typeof initial === "function" ? (initial as () => T)() : initial;
            return [slots[i] as T, (value) => { slots[i] = typeof value === "function" ? (value as (p: T) => T)(slots[i] as T) : value; }];
        },
        ref<T>(value: T) { return h.state({current: value})[0]; },
    };
    return h;
});
vi.mock("react", async (original) => ({...await original<typeof import("react")>(),
    useState: h.state, useRef: h.ref, useReducer: (_r: unknown, initial: unknown) => [initial, vi.fn()],
    useEffect: (effect: () => void) => h.effects.push(effect), useCallback: (fn: unknown) => fn,
    useTransition: () => [h.pending, (action: () => void) => { h.pending = true; action(); }],
}));
vi.mock("next/navigation", () => ({useRouter: () => ({push: h.push}), usePathname: () => h.pathname}));
vi.mock("@/components/cv-ask/CvSheet", () => ({default: () => null}));
vi.mock("@/lib/analysis-store", () => ({useAnalysis: () => ({status: "ready", setStatus: vi.fn(), save: vi.fn()})}));
vi.mock("@/lib/cv-store", () => ({useCv: () => ({saveCv: vi.fn()})}));
vi.mock("@/lib/latest-cv", () => ({useLatestCV: () => ({latest: null, signedIn: false, forget: vi.fn()}), reuseError: vi.fn()}));
vi.mock("@/lib/api", () => ({default: vi.fn(), AnalyzeReuse: vi.fn(), ProcessCv: vi.fn(), createScanRequestId: vi.fn(), wakeApi: vi.fn()}));
vi.mock("@/lib/analytics", () => ({scanEvents: vi.fn(), track: vi.fn()}));

import {useCvScan} from "./useCvScan";
import {scanEvents} from "@/lib/analytics";

function render() {
    h.index = 0;
    h.effects = [];
    const scan = useCvScan();
    h.effects.forEach((effect) => effect());
    return scan;
}

beforeEach(() => {
    h.slots.length = 0;
    h.pending = false;
    h.pathname = "/market/entry-level-software";
    vi.clearAllMocks();
    h.push.mockReset();
});

describe("full-scan navigation", () => {
    it("keeps the overlay open throughout an 800ms navigation and ignores dismissal", async () => {
        vi.useFakeTimers();
        try {
            render().open();
            render().sheet.props.onSee();
            for (let i = 0; i < 8; i++) {
                await vi.advanceTimersByTimeAsync(100);
                const scan = render();
                expect(scan.sheet.props.opening).toBe(true);
                scan.sheet.props.onOpenChange(false);
                expect(render().isOpen).toBe(true);
            }
            h.pending = false;
            h.pathname = "/analysis";
            render();
            expect(render().isOpen).toBe(false);
        } finally {
            vi.useRealTimers();
        }
    });
    it("keeps the modal open, prevents duplicate pushes and closes only on arrival", () => {
        render().open();
        const scan = render();
        scan.sheet.props.onSee();
        scan.sheet.props.onSee();
        expect(h.push).toHaveBeenCalledExactlyOnceWith("/analysis");
        expect(render().sheet.props.opening).toBe(true);
        expect(render().isOpen).toBe(true);
        h.pathname = "/analysis";
        h.pending = false;
        render();
        expect(render().isOpen).toBe(false);
        expect(scanEvents).not.toHaveBeenCalled();
    });

    it("retains the result and allows retry after a push failure", () => {
        h.push.mockImplementationOnce(() => { throw new Error("navigation failed"); });
        render().open();
        render().sheet.props.onSee();
        const failed = render();
        expect(failed.isOpen).toBe(true);
        expect(failed.sheet.props.navigationError).toBe(true);
        expect(failed.sheet.props.opening).toBe(false);
        failed.sheet.props.onSee();
        expect(h.push).toHaveBeenCalledTimes(2);
    });

    it("offers recovery if the transition settles without reaching analysis", () => {
        render().open();
        render().sheet.props.onSee();
        render();
        h.pending = false;
        render();
        expect(render().sheet.props.navigationError).toBe(true);
        expect(render().isOpen).toBe(true);
    });

    it("closes immediately when the reader is already on analysis", () => {
        h.pathname = "/analysis";
        render().open();
        render().sheet.props.onSee();
        expect(render().isOpen).toBe(false);
        expect(h.push).not.toHaveBeenCalled();
    });
});
