// Stephen's classes for a date range, from ldco-lessons: projected from running frequencies and
// overlaid with stored events (data-model.md, "Instructor schedule"). Joins happen here because
// $lookup doesn't cross databases.

import type { Db } from "mongodb";
import { addDays, dowOf, nthOfMonth, zonedParts, zonedTimeToUtc, type Dow } from "./time";

export interface EventTypeDoc { _id: string; title: string; level?: string | null; price?: string | null; venueId?: string | null; isActive?: boolean }
export interface FrequencyDoc {
    _id: string; eventTypeId: string; kind: string; byDay?: Dow[]; weekday?: Dow; nth?: number;
    startTime: string; durationMinutes?: number; startDate?: string; endDate?: string; isActive?: boolean;
}
export interface PlannedLesson {
    _id: string; startAt: Date | null; dance: string | null; danceId: string | null;
    level: string | null; link: string | null; committed: boolean; skipped: boolean;
}
export interface EventDoc {
    _id: string; eventTypeId?: string | null; venueId?: string | null; title?: string | null;
    date: string; startAt: Date; timeZone?: string | null; isCancelled?: boolean; cancelNote?: string | null;
    substitute?: string | null; substituteInstructorId?: string | null; specialNote?: string | null;
    lessons?: PlannedLesson[];
}
export interface VenueDoc { _id: string; venuename?: string; venueaddress?: string; city?: string; timeZone?: string }

export interface Occurrence {
    /** `${eventTypeId}|${date}` for a class, `event:${id}` for a special event. */
    key: string;
    eventTypeId: string | null;
    eventId: string | null;
    date: string;
    startAt: Date;
    timeZone: string;
    title: string;
    level: string | null;
    price: string | null;
    venueName: string | null;
    /** Street address, with the city when it isn't already in it. */
    venueAddress: string | null;
    isCancelled: boolean;
    cancelNote: string | null;
    substitute: string | null;
    substituteInstructorId: string | null;
    specialNote: string | null;
    /** null when the date is only projected (no stored event, so no plan). */
    lessons: PlannedLesson[] | null;
}

export interface ScheduleInput {
    eventTypes: EventTypeDoc[];
    frequencies: FrequencyDoc[];
    events: EventDoc[];
    venues: VenueDoc[];
    /** Local YYYY-MM-DD, inclusive. */
    from: string;
    to: string;
    defaultTimeZone: string;
}

function frequencyRunsOn(f: FrequencyDoc, ymd: string): boolean {
    if (f.isActive === false) return false;
    if (f.startDate && ymd < f.startDate) return false;
    if (f.endDate && ymd > f.endDate) return false;
    const dow = dowOf(ymd);
    if (f.kind === "WEEKLY") return (f.byDay ?? []).includes(dow);
    if (f.kind === "MONTHLY_NTH_WEEKDAY") {
        if (f.weekday !== dow || f.nth == null) return false;
        if (f.nth === -1) return addDays(ymd, 7).slice(0, 7) !== ymd.slice(0, 7);
        return nthOfMonth(ymd) === f.nth;
    }
    if (f.kind === "ONE_TIME") return f.startDate === ymd;
    return false;
}

function addressOf(v: VenueDoc | undefined): string | null {
    const street = v?.venueaddress?.trim();
    if (!street) return null;
    const city = v?.city?.trim();
    return city && !street.toLowerCase().includes(city.toLowerCase()) ? `${street}, ${city}` : street;
}

/** Every class and special event in the range, sorted by start time. Switched-off types are left out (decision 15). */
export function projectOccurrences(input: ScheduleInput): Occurrence[] {
    const typeById = new Map(input.eventTypes.filter((t) => t.isActive !== false).map((t) => [t._id, t]));
    const venueById = new Map(input.venues.map((v) => [v._id, v]));
    const out = new Map<string, Occurrence>();

    const zoneFor = (venueId?: string | null, stored?: string | null) =>
        stored || (venueId && venueById.get(venueId)?.timeZone) || input.defaultTimeZone;

    for (let ymd = input.from; ymd <= input.to; ymd = addDays(ymd, 1)) {
        for (const f of input.frequencies) {
            const et = typeById.get(f.eventTypeId);
            if (!et || !frequencyRunsOn(f, ymd)) continue;
            const timeZone = zoneFor(et.venueId);
            const key = `${et._id}|${ymd}`;
            if (out.has(key)) continue;
            out.set(key, {
                key, eventTypeId: et._id, eventId: null, date: ymd,
                startAt: zonedTimeToUtc(ymd, f.startTime, timeZone), timeZone,
                title: et.title, level: et.level ?? null, price: et.price ?? null,
                venueName: (et.venueId && venueById.get(et.venueId)?.venuename) || null,
                venueAddress: addressOf(et.venueId ? venueById.get(et.venueId) : undefined),
                isCancelled: false, cancelNote: null, substitute: null, substituteInstructorId: null,
                specialNote: null, lessons: null,
            });
        }
    }

    for (const ev of input.events) {
        if (ev.date < input.from || ev.date > input.to) continue;
        const et = ev.eventTypeId ? typeById.get(ev.eventTypeId) : undefined;
        if (ev.eventTypeId && !et) continue;
        const venueId = et?.venueId ?? ev.venueId ?? null;
        const key = et ? `${et._id}|${ev.date}` : `event:${ev._id}`;
        out.set(key, {
            key, eventTypeId: et?._id ?? null, eventId: ev._id, date: ev.date,
            startAt: new Date(ev.startAt), timeZone: zoneFor(venueId, ev.timeZone),
            title: et?.title ?? ev.title ?? "Special event",
            level: et?.level ?? null, price: et?.price ?? null,
            venueName: (venueId && venueById.get(venueId)?.venuename) || null,
            venueAddress: addressOf(venueId ? venueById.get(venueId) : undefined),
            isCancelled: !!ev.isCancelled, cancelNote: ev.cancelNote ?? null,
            substitute: ev.substitute ?? null, substituteInstructorId: ev.substituteInstructorId ?? null,
            specialNote: ev.specialNote ?? null,
            lessons: Array.isArray(ev.lessons) ? ev.lessons : [],
        });
    }

    return [...out.values()].sort((a, b) => a.startAt.getTime() - b.startAt.getTime());
}

/** Load the instructor's schedule for a local date range. */
export async function loadOccurrences(
    lessonsDb: Db, mainDb: Db,
    opts: { instructorId: string; from: string; to: string; defaultTimeZone: string },
): Promise<Occurrence[]> {
    const links = await lessonsDb.collection("event_instructors")
        .find({ instructorId: opts.instructorId }).toArray();
    const typeIds = links.map((l) => l.eventTypeId).filter(Boolean) as string[];
    const specialIds = links.map((l) => l.eventId).filter(Boolean) as string[];

    const [eventTypes, frequencies, events] = await Promise.all([
        lessonsDb.collection("event_types").find({ _id: { $in: typeIds } } as object).toArray(),
        lessonsDb.collection("frequencies").find({ eventTypeId: { $in: typeIds } }).toArray(),
        lessonsDb.collection("events").find({
            date: { $gte: opts.from, $lte: opts.to },
            $or: [{ eventTypeId: { $in: typeIds } }, { _id: { $in: specialIds } }],
        } as object).toArray(),
    ]);

    const venueIds = new Set<string>();
    for (const t of eventTypes) if (t.venueId) venueIds.add(t.venueId);
    for (const e of events) if (e.venueId) venueIds.add(e.venueId);
    const venues = await mainDb.collection("venues")
        .find({ _id: { $in: [...venueIds] } } as object)
        .project({ venuename: 1, venueaddress: 1, city: 1, timeZone: 1 }).toArray();

    return projectOccurrences({
        eventTypes: eventTypes as unknown as EventTypeDoc[],
        frequencies: frequencies as unknown as FrequencyDoc[],
        events: events as unknown as EventDoc[],
        venues: venues as unknown as VenueDoc[],
        from: opts.from, to: opts.to, defaultTimeZone: opts.defaultTimeZone,
    });
}

/** The local "HH:mm" an occurrence starts at. */
export function localStartTime(o: Pick<Occurrence, "startAt" | "timeZone">): string {
    return zonedParts(o.startAt, o.timeZone).hhmm;
}
