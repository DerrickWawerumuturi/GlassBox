import {beforeEach, describe, expect, it, vi} from "vitest";

const track = vi.hoisted(() => vi.fn());
vi.mock("@/lib/analytics", () => ({track}));

import {StoreCV} from "./api";

/** The API's answers: a token for /api/token, then the save, with or without the "created" header. */
function answer(created: boolean) {
    vi.stubGlobal("fetch", vi.fn(async (url: string) => url === "/api/token"
        ? new Response(JSON.stringify({token: "t"}))
        : new Response("{}", {headers: created ? {"X-Account-Created": "1"} : {}})));
}

beforeEach(() => track.mockClear());

describe("signed_up", () => {
    it("is sent when the API says this request created the account", async () => {
        answer(true);
        await StoreCV({} as never);
        expect(track).toHaveBeenCalledWith("signed_up");
    });

    it("is not sent on any other answer", async () => {
        answer(false);
        await StoreCV({} as never);
        expect(track).not.toHaveBeenCalled();
    });
});
