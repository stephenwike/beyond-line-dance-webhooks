// Test data shared by the *.test.ts files.

import type { Occurrence, PlannedLesson } from "./schedule";

export function lesson(over: Partial<PlannedLesson> = {}): PlannedLesson {
    return {
        _id: "l1", startAt: new Date("2026-10-20T01:00:00Z"), dance: "Copperhead Road", danceId: "d1",
        level: "Beginner", link: "https://example.com/copperhead", committed: false, skipped: false, ...over,
    };
}

export function occurrence(over: Partial<Occurrence> = {}): Occurrence {
    return {
        key: "et1|2026-10-19", eventTypeId: "et1", eventId: "ev1", date: "2026-10-19",
        startAt: new Date("2026-10-20T01:00:00Z"), endAt: new Date("2026-10-20T03:00:00Z"), timeZone: "America/Denver",
        title: "Charlies Country", level: "Beginner", price: "$10", venueName: "Charlie's Denver", venueAddress: "900 E Colfax Ave, Denver",
        isCancelled: false, cancelNote: null, substitute: null, substituteInstructorId: null, specialNote: null,
        lessons: [lesson()], ...over,
    };
}
