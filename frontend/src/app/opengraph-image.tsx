import {readFileSync} from "node:fs";
import {join} from "node:path";

import {ImageResponse} from "next/og";

// The brand wordmark (docs/brand/assets/logo, on dark), as an image the card can draw.
const WORDMARK = `data:image/svg+xml;base64,${readFileSync(join(process.cwd(), "public/brand/wordmark-on-dark.svg")).toString("base64")}`;

export const alt = "Glassbox: your job market, mapped";
export const size = {width: 1200, height: 630};
export const contentType = "image/png";

export default function OgImage() {
    return new ImageResponse(
        (
            <div
                style={{
                    width: "100%",
                    height: "100%",
                    display: "flex",
                    flexDirection: "column",
                    justifyContent: "space-between",
                    padding: "72px 80px",
                    backgroundColor: "#131316",
                    backgroundImage:
                        "linear-gradient(rgba(255,255,255,0.05) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.05) 1px, transparent 1px)",
                    backgroundSize: "44px 44px",
                    color: "#f4f2ec",
                }}
            >
                <div style={{display: "flex", fontSize: 28, letterSpacing: 6, color: "#e8672e"}}>
                    JOB HUNT INTELLIGENCE
                </div>

                <div style={{display: "flex", flexDirection: "column", gap: 10}}>
                    <div style={{display: "flex", fontSize: 96, fontWeight: 800, lineHeight: 1.02}}>
                        See where you
                    </div>
                    <div style={{display: "flex", fontSize: 96, fontWeight: 800, lineHeight: 1.02}}>
                        actually stand.
                    </div>
                </div>

                <div style={{display: "flex", alignItems: "center", justifyContent: "space-between"}}>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={WORDMARK} width={274} height={40} alt={"Glassbox"} />
                    <div
                        style={{
                            display: "flex",
                            fontSize: 24,
                            padding: "10px 22px",
                            border: "2px solid #d3f26a",
                            borderRadius: 6,
                            color: "#d3f26a",
                            transform: "rotate(-3deg)",
                        }}
                    >
                        YOUR CV · READ IN ~1 MIN
                    </div>
                </div>
            </div>
        ),
        {...size}
    );
}
