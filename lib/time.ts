// Local wall-clock helpers. Recurring rules are local "HH:mm" in a venue's IANA zone; dated
// things are UTC Dates (ldco-database decision 18), so we convert between the two here.

export type Dow = "SU" | "MO" | "TU" | "WE" | "TH" | "FR" | "SA";
export const DOWS: Dow[] = ["SU", "MO", "TU", "WE", "TH", "FR", "SA"];

const SHORT_TO_DOW: Record<string, Dow> = { Sun: "SU", Mon: "MO", Tue: "TU", Wed: "WE", Thu: "TH", Fri: "FR", Sat: "SA" };

/** The local date, time and weekday of an instant in a zone. */
export function zonedParts(date: Date, timeZone: string): { ymd: string; hhmm: string; dow: Dow } {
    const fmt = new Intl.DateTimeFormat("en-US", {
        timeZone,
        year: "numeric", month: "2-digit", day: "2-digit",
        hour: "2-digit", minute: "2-digit", weekday: "short", hourCycle: "h23",
    });
    const p = Object.fromEntries(fmt.formatToParts(date).map((x) => [x.type, x.value]));
    return { ymd: `${p.year}-${p.month}-${p.day}`, hhmm: `${p.hour}:${p.minute}`, dow: SHORT_TO_DOW[p.weekday] };
}

function offsetMs(date: Date, timeZone: string): number {
    const { ymd, hhmm } = zonedParts(date, timeZone);
    const [y, m, d] = ymd.split("-").map(Number);
    const [h, mi] = hhmm.split(":").map(Number);
    const asUtc = Date.UTC(y, m - 1, d, h, mi);
    return asUtc - Math.floor(date.getTime() / 60000) * 60000;
}

/** The UTC instant of a local date and "HH:mm" in a zone (DST-aware). */
export function zonedTimeToUtc(ymd: string, hhmm: string, timeZone: string): Date {
    const [y, m, d] = ymd.split("-").map(Number);
    const [h, mi] = hhmm.split(":").map(Number);
    const wall = Date.UTC(y, m - 1, d, h, mi);
    let ts = wall - offsetMs(new Date(wall), timeZone);
    ts = wall - offsetMs(new Date(ts), timeZone);
    return new Date(ts);
}

export function addDays(ymd: string, n: number): string {
    const d = new Date(`${ymd}T12:00:00Z`);
    d.setUTCDate(d.getUTCDate() + n);
    return d.toISOString().slice(0, 10);
}

export function dowOf(ymd: string): Dow {
    return DOWS[new Date(`${ymd}T12:00:00Z`).getUTCDay()];
}

/** The Monday on or before a date. */
export function mondayOf(ymd: string): string {
    const idx = new Date(`${ymd}T12:00:00Z`).getUTCDay();
    return addDays(ymd, -((idx + 6) % 7));
}

/** Which week of the month a date falls in (1 for days 1–7, 2 for 8–14, ...). */
export function nthOfMonth(ymd: string): number {
    return Math.ceil(Number(ymd.slice(8, 10)) / 7);
}

/** "19:00" → "7:00 PM" */
export function formatTime12(hhmm: string): string {
    const [h, m] = hhmm.split(":").map(Number);
    const ampm = h < 12 ? "AM" : "PM";
    const h12 = h % 12 === 0 ? 12 : h % 12;
    return `${h12}:${String(m).padStart(2, "0")} ${ampm}`;
}

/** "2026-10-19" → "Mon 10/19" */
export function formatShortDate(ymd: string): string {
    const names: Record<Dow, string> = { SU: "Sun", MO: "Mon", TU: "Tue", WE: "Wed", TH: "Thu", FR: "Fri", SA: "Sat" };
    return `${names[dowOf(ymd)]} ${Number(ymd.slice(5, 7))}/${Number(ymd.slice(8, 10))}`;
}
