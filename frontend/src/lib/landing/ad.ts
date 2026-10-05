import {API_BASE_URL} from "@/lib/api";
import {AdAsk, Level} from "@/lib/landing/look";

/** A pasted job ad, read on our server (POST /market/ad): its title, job type, level and asks. Never kept. */
export interface ReadAd {
    title: string;
    family: string;
    level: Level | "unstated";
    asks: AdAsk[];
}

/** A whole paste that is only a link is read from the link; anything else is the ad's text. */
export function pasteBody(paste: string): {url: string} | {text: string} {
    const text = paste.replace(/\r\n/g, "\n").trim();
    return /^https?:\/\/\S+$/i.test(text) ? {url: text} : {text};
}

/** The server said no; `status` 429 means too many ads from this visitor this hour. */
export class AdError extends Error {
    constructor(message: string, readonly status: number) { super(message); }
}

export async function readAd(body: {url: string} | {text: string}, signal?: AbortSignal): Promise<ReadAd> {
    const response = await fetch(`${API_BASE_URL}/market/ad`, {
        method: "POST", headers: {"Content-Type": "application/json"}, body: JSON.stringify(body), signal,
    });
    if (!response.ok) {
        const detail = await response.json().then((b) => b?.detail).catch(() => null);
        throw new AdError(typeof detail === "string" ? detail : `ad read failed: ${response.status}`, response.status);
    }
    return response.json();
}
