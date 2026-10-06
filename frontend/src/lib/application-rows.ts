/*
 * Small rules for the applications list, kept pure so they are tested
 * (application-rows.test.ts): the applied date as a calendar day, and which
 * clicks on a row select it while several rows are being selected.
 */

/** A calendar day as YYYY-MM-DD, in the visitor's own time zone (the day they clicked). */
export function dayKey(day: Date): string {
    const pad = (n: number) => String(n).padStart(2, "0");
    return `${day.getFullYear()}-${pad(day.getMonth() + 1)}-${pad(day.getDate())}`;
}

/**
 * The applied date as the day to show on the calendar. Stored at noon UTC
 * (the server keeps days that way), so its date part is the day in any zone.
 */
export function appliedDay(appliedAt: string | null | undefined): Date | undefined {
    const m = appliedAt?.match(/^(\d{4})-(\d{2})-(\d{2})/);
    return m ? new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3])) : undefined;
}

/**
 * While rows are being selected, a click anywhere on a row toggles it, except
 * on the row's own checkbox and the date picker, which handle themselves. The
 * row used to catch the checkbox's click too: it toggled the row and cancelled
 * the click, the browser undid the tick, and the box stayed empty.
 */
export function rowClickToggles(target: {closest: (selector: string) => unknown} | null): boolean {
    return !target?.closest("[data-row-select], [data-row-own]");
}
