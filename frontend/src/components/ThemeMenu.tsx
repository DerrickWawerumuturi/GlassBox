'use client'

import React, {useEffect, useId, useState} from "react";
import {MonitorIcon, MoonIcon, SunIcon} from "lucide-react";

import {DropdownMenuRadioGroup, DropdownMenuRadioItem} from "@/components/ui/dropdown-menu";
import {applyChoice, readChoice, saveChoice, ThemeChoice} from "@/lib/theme";

const CHOICES: Array<{value: ThemeChoice; label: string; Icon: typeof SunIcon}> = [
    {value: "light", label: "Light", Icon: SunIcon},
    {value: "dark", label: "Dark", Icon: MoonIcon},
    {value: "system", label: "System", Icon: MonitorIcon},
];

/**
 * The account menu's Theme row: three icons in a segmented control, the
 * shadcn mode-toggle pattern. Each is a menu radio item, so arrow keys and
 * screen readers treat it like the rest of the menu.
 */
export function ThemeMenu() {
    const [choice, setChoice] = useState<ThemeChoice>("system");
    const label = useId();
    useEffect(() => setChoice(readChoice()), []);
    return (
        <div className={"flex items-center justify-between gap-3 px-1.5 py-1"}>
            <span id={label} className={"text-small text-muted-foreground"}>Theme</span>
            <DropdownMenuRadioGroup aria-labelledby={label} value={choice}
                                    className={"flex gap-0.5 rounded-md border border-border p-0.5"}
                                    onValueChange={(value) => {
                                        setChoice(value as ThemeChoice);
                                        saveChoice(value as ThemeChoice);
                                    }}>
                {CHOICES.map(({value, label: name, Icon}) => (
                    <DropdownMenuRadioItem key={value} value={value} aria-label={name} title={name} closeOnClick={false}
                                           className={"size-7 cursor-pointer justify-center rounded-[5px] p-0 pr-0 text-muted-foreground data-checked:bg-accent data-checked:text-foreground [&>[data-slot=dropdown-menu-radio-item-indicator]]:hidden"}>
                        <Icon className={"size-4"} aria-hidden />
                    </DropdownMenuRadioItem>
                ))}
            </DropdownMenuRadioGroup>
        </div>
    );
}

/** On System, follow the OS when it switches between light and dark. Renders nothing. */
export function ThemeWatcher() {
    useEffect(() => {
        const media = matchMedia("(prefers-color-scheme: dark)");
        const onChange = () => { if (readChoice() === "system") applyChoice("system"); };
        media.addEventListener("change", onChange);
        return () => media.removeEventListener("change", onChange);
    }, []);
    return null;
}
