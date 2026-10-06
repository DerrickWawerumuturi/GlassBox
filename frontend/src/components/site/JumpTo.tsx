'use client'

import React from "react";

import {Select, SelectContent, SelectItem, SelectTrigger, SelectValue} from "@/components/ui/select";

/** The table of contents on a phone: a "Jump to" select that scrolls to the section. */
export default function JumpTo({label, sections}: {label: string; sections: Array<{id: string; title: string}>}) {
    return (
        <Select onValueChange={(id) => { if (id) document.getElementById(String(id))?.scrollIntoView({behavior: "smooth", block: "start"}); }}>
            <SelectTrigger className={"w-full"} aria-label={label}>
                <SelectValue placeholder={label} />
            </SelectTrigger>
            <SelectContent>
                {sections.map((s, i) => (
                    <SelectItem key={s.id} value={s.id}>{String(i + 1).padStart(2, "0")} {s.title}</SelectItem>
                ))}
            </SelectContent>
        </Select>
    );
}
