'use client'

import React, {useState} from "react";
import {CalendarIcon} from "lucide-react";

import {Button} from "@/components/ui/button";
import {Calendar} from "@/components/ui/calendar";
import {Popover, PopoverContent, PopoverTrigger} from "@/components/ui/popover";
import {appliedDay} from "@/lib/application-rows";
import {useApplications} from "@/lib/applications-store";
import {cn} from "@/lib/utils";
import {ApplicationRow} from "@/types/jobradar";

const shortDate = (day: Date) => day.toLocaleDateString(undefined, {month: "short", day: "numeric", year: "numeric"});

/**
 * The day the user applied, changed on a calendar. A job only saved has no
 * applied date yet; moving it to Applied gives it one.
 */
export default function AppliedDatePicker({app, className}: {app: ApplicationRow; className?: string}) {
    const {setApplied} = useApplications();
    const [open, setOpen] = useState(false);
    if (app.status === "saved") return <span className={cn("text-muted-foreground/50", className)}>—</span>;

    const day = appliedDay(app.applied_at);
    return (
        // data-row-own: while rows are being selected, a click here still opens the calendar.
        <span data-row-own className={className}>
            <Popover open={open} onOpenChange={setOpen}>
                <PopoverTrigger
                    disabled={app.id < 0}
                    render={<Button variant={"ghost"} size={"sm"} className={"-ml-2 h-7 gap-1.5 px-2 font-mono text-[11px] font-normal text-muted-foreground hover:text-foreground"} />}
                    aria-label={day ? `Applied ${shortDate(day)}. Change the date` : "Applied date unknown. Set the date"}
                >
                    <CalendarIcon className={"size-3.5"} />
                    {day ? shortDate(day) : "unknown"}
                </PopoverTrigger>
                <PopoverContent align={"start"} className={"w-auto p-0"}>
                    <Calendar
                        mode={"single"}
                        selected={day}
                        defaultMonth={day}
                        disabled={{after: new Date()}}
                        onSelect={(picked) => {
                            if (picked) setApplied(app.id, picked);
                            setOpen(false);
                        }}
                    />
                </PopoverContent>
            </Popover>
        </span>
    );
}
