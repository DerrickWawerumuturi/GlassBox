'use client'

import {Button} from "@/components/ui/button";

export default function AnalysisError({retry}: {retry: () => void}) {
    return (
        <div role={"alert"} className={"fixed inset-0 z-50 flex flex-col items-center justify-center gap-4 bg-background px-6 text-center text-foreground"}>
            <h1 className={"font-heading text-[26px] font-bold"}>Your report couldn’t open</h1>
            <p className={"max-w-[38ch] text-[14px] text-muted-foreground"}>Try opening it again. You don’t need to start another scan.</p>
            <Button onClick={retry} autoFocus>Try again</Button>
        </div>
    );
}
