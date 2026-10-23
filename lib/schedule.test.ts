import { describe, expect, it } from "vitest";
import { projectOccurrences, type ScheduleInput } from "./schedule";

const base: ScheduleInput = {
    eventTypes: [
        { _id: "et1", title: "Charlies Country", level: "Beginner", price: "$10", venueId: "v1", isActive: true },
        { _id: "et2", title: "Old Class", venueId: "v1", isActive: false },
    ],
    frequencies: [
        { _id: "f1", eventTypeId: "et1", kind: "WEEKLY", byDay: ["MO", "WE"], startTime: "19:00" },
        { _id: "f2", eventTypeId: "et2", kind: "WEEKLY", byDay: ["MO"], startTime: "18:00" },
    ],
    events: [],
    venues: [{ _id: "v1", venuename: "Charlie's Denver", timeZone: "America/Denver" }],
    from: "2026-10-19", to: "2026-10-25", defaultTimeZone: "America/Denver",
};

describe("projectOccurrences", () => {
    it("projects running frequencies and leaves switched-off types out", () => {
        const out = projectOccurrences(base);
        expect(out.map((o) => o.key)).toEqual(["et1|2026-10-19", "et1|2026-10-21"]);
        expect(out[0].startAt.toISOString()).toBe("2026-10-20T01:00:00.000Z");
        expect(out[0].venueName).toBe("Charlie's Denver");
        expect(out[0].lessons).toBeNull();
    });

    it("respects a frequency's on/off switch and end date", () => {
        expect(projectOccurrences({ ...base, frequencies: [{ ...base.frequencies[0], isActive: false }] })).toHaveLength(0);
        expect(projectOccurrences({ ...base, frequencies: [{ ...base.frequencies[0], endDate: "2026-10-20" }] })).toHaveLength(1);
    });

    it("projects the nth weekday of the month", () => {
        const out = projectOccurrences({
            ...base, from: "2026-10-01", to: "2026-10-31",
            frequencies: [{ _id: "f3", eventTypeId: "et1", kind: "MONTHLY_NTH_WEEKDAY", weekday: "TH", nth: 3, startTime: "19:00" }],
        });
        expect(out.map((o) => o.date)).toEqual(["2026-10-15"]);
    });

    it("overlays stored events (plan, cancellation) and includes special events", () => {
        const out = projectOccurrences({
            ...base,
            events: [
                { _id: "ev1", eventTypeId: "et1", date: "2026-10-21", startAt: new Date("2026-10-22T01:30:00Z"), isCancelled: true, cancelNote: "Venue closed", lessons: [] },
                { _id: "ev2", venueId: "v1", title: "Halloween Social", date: "2026-10-24", startAt: new Date("2026-10-25T00:00:00Z") },
                { _id: "ev3", eventTypeId: "et2", date: "2026-10-19", startAt: new Date("2026-10-20T00:00:00Z") },
            ],
        });
        expect(out.map((o) => o.key)).toEqual(["et1|2026-10-19", "et1|2026-10-21", "event:ev2"]);
        expect(out[1]).toMatchObject({ eventId: "ev1", isCancelled: true, cancelNote: "Venue closed", lessons: [] });
        expect(out[2]).toMatchObject({ title: "Halloween Social", venueName: "Charlie's Denver" });
    });
});
