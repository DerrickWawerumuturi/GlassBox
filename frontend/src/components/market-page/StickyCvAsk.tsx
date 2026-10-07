'use client'

import React from "react";

import AddCvButton from "@/components/AddCvButton";
import {MarketPage} from "@/lib/analytics";

/** The title bar's CV button: the same flow as the page's ask, nothing more. The CV ask redesign replaces it. */
export default function StickyCvAsk({page}: {page: MarketPage}) {
    return <AddCvButton label={"Add your CV"} reading={""} page={page} />;
}
