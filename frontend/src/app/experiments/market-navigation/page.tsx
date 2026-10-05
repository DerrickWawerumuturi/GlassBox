import type {Metadata} from "next";
import {notFound} from "next/navigation";

import Lab from "./_lab/Lab";

/*
 * A navigation experiment for Market Charts: four rotary concepts and a
 * plain-tabs baseline. Development only, so a commit can never ship it.
 * The real Market tab is untouched.
 */

export const metadata: Metadata = {
    title: "Market Charts navigation (experiment)",
    robots: {index: false, follow: false},
};

export default function MarketNavigationExperiment() {
    if (process.env.NODE_ENV === "production") notFound();
    return <Lab />;
}
