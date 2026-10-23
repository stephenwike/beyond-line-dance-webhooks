import { describe, expect, it } from "vitest";
import { addDays, formatShortDate, formatTime12, mondayOf, nthOfMonth, zonedParts, zonedTimeToUtc } from "./time";

const TZ = "America/Denver";

describe("time", () => {
    it("converts local wall time to UTC across daylight saving", () => {
        expect(zonedTimeToUtc("2026-10-19", "19:00", TZ).toISOString()).toBe("2026-10-20T01:00:00.000Z"); // MDT
        expect(zonedTimeToUtc("2026-11-09", "19:00", TZ).toISOString()).toBe("2026-11-10T02:00:00.000Z"); // MST
    });

    it("reads local parts back", () => {
        expect(zonedParts(new Date("2026-10-20T01:00:00Z"), TZ)).toEqual({ ymd: "2026-10-19", hhmm: "19:00", dow: "MO" });
    });

    it("does date arithmetic on YYYY-MM-DD", () => {
        expect(addDays("2026-10-31", 1)).toBe("2026-11-01");
        expect(mondayOf("2026-10-25")).toBe("2026-10-19"); // Sunday → previous Monday
        expect(mondayOf("2026-10-19")).toBe("2026-10-19");
        expect(nthOfMonth("2026-10-15")).toBe(3);
    });

    it("formats", () => {
        expect(formatTime12("19:05")).toBe("7:05 PM");
        expect(formatTime12("00:30")).toBe("12:30 AM");
        expect(formatTime12("12:00")).toBe("12:00 PM");
        expect(formatShortDate("2026-10-19")).toBe("Mon 10/19");
    });
});
