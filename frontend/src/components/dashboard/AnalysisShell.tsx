'use client'

import React, {useEffect, useState} from 'react'
import Link from "next/link";
import {ArrowRightIcon} from "lucide-react";

import {ExampleAnalysisProvider, useAnalysis} from "@/lib/analysis-store";
import {JobRadarAnalysis} from "@/types/jobradar";
import {Button} from "@/components/ui/button";
import Sidebar from "@/components/dashboard/Sidebar";
import {useCvScan} from "@/components/cv-ask/useCvScan";
import {ApplicationsProvider} from "@/lib/applications-store";
import {OpportunitiesProvider} from "@/lib/opportunities-store";

const EXAMPLE = {line: "This is an example. Add your CV to see yours.", cta: "Add your CV", signUp: "Sign up", reading: "Reading your CV. A run takes about a minute."};

/**
 * A scan without an account: the dashboard's shell and pages, read from the
 * scan kept in this browser. Before there is one, the same pages show an
 * example scan (lib/example-scan.json) under a banner that says so, never an
 * empty dashboard. A scan replaces the example the moment it lands.
 */
export default function AnalysisShell({children}: {children: React.ReactNode}) {
    const {analysis, hydrated} = useAnalysis();
    const scan = useCvScan();
    const [example, setExample] = useState<JobRadarAnalysis | null>(null);
    const needExample = hydrated && !analysis;
    useEffect(() => {
        if (needExample && !example) import("@/lib/example-scan.json").then((m) => setExample(m.default as unknown as JobRadarAnalysis));
    }, [needExample, example]);

    if (!hydrated || (needExample && !example)) return null;

    const shell = (
        <ApplicationsProvider>
            <OpportunitiesProvider>
                <div className={"flex min-h-screen flex-col bg-background lg:flex-row"}>
                    <Sidebar scan />
                    <div className={"min-w-0 flex-1 overflow-x-clip"}>
                        {needExample && (
                            <div role={"note"} className={"sticky top-0 z-20 flex flex-wrap items-center gap-x-4 gap-y-2 border-b border-border bg-background/95 px-4 py-2.5 backdrop-blur sm:px-8"}>
                                <span className={"rounded-full border border-border px-2 py-0.5 font-mono text-[10px] uppercase tracking-[0.12em] text-muted-foreground"}>Example</span>
                                <span className={"text-[13.5px]"}>{scan.scanning ? EXAMPLE.reading : EXAMPLE.line}</span>
                                <span className={"ml-auto flex items-center gap-3"}>
                                    <Button size={"sm"} onClick={() => scan.open()} disabled={scan.scanning}>{EXAMPLE.cta} <ArrowRightIcon className={"size-3.5"} /></Button>
                                    <Button variant={"link"} size={"sm"} className={"px-0 text-foreground"} nativeButton={false} render={<Link href={"/sign-in"} />}>{EXAMPLE.signUp}</Button>
                                </span>
                            </div>
                        )}
                        {children}
                    </div>
                </div>
                {scan.sheet}
            </OpportunitiesProvider>
        </ApplicationsProvider>
    );
    return needExample ? <ExampleAnalysisProvider example={example!}>{shell}</ExampleAnalysisProvider> : shell;
}
