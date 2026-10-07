'use client'

import {useMemo} from "react";

import {useAnalysis} from "@/lib/analysis-store";
import {useCv} from "@/lib/cv-store";
import {haveSet} from "@/lib/landing/look";

/**
 * The visitor's own skills, from their scan, as normalised names: the only
 * thing a public page lights up with (the landing page, the market pages).
 * Null before a scan.
 */
export function useHave(): Set<string> | null {
    const {analysis} = useAnalysis();
    const {cv} = useCv();
    return useMemo(() => {
        if (!analysis?.market) return null;
        const names = [...(analysis.market.user_skill_presence ?? []).map((s) => s.skill), ...(cv?.skills ?? []).filter((s): s is string => Boolean(s))];
        return names.length ? haveSet(names) : null;
    }, [analysis, cv]);
}
