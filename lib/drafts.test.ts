import { describe, expect, it } from "vitest";
import { cancellationDraft, lessonDraft, weeklyDraft } from "./drafts";
import { lesson, occurrence } from "./fixtures";

const SITE = "https://beyondlinedance.com";
const checks = (d: { issues: { check: string }[] }) => d.issues.map((i) => i.check);

describe("lessonDraft", () => {
    it("has no issues for a complete plan, and lists each lesson", () => {
        const d = lessonDraft(occurrence({
            lessons: [lesson(), lesson({ _id: "l2", startAt: new Date("2026-10-20T02:00:00Z"), dance: "Cowboy Cha Cha", danceId: "d2" })],
        }), SITE);
        expect(d.issues).toEqual([]);
        expect(d.message).toContain("Tonight's line dance lessons at Charlie's Denver, starting 7:00 PM");
        expect(d.message).toContain("7:00 PM · Copperhead Road (Beginner)");
        expect(d.message).toContain("8:00 PM · Cowboy Cha Cha (Beginner)");
        expect(d.message).toContain(`${SITE}/calendar`);
    });

    it("holds a projected date with no plan", () => {
        expect(checks(lessonDraft(occurrence({ lessons: null }), SITE))).toEqual(["noLessons"]);
    });

    it("ignores skipped lessons", () => {
        expect(checks(lessonDraft(occurrence({ lessons: [lesson({ skipped: true })] }), SITE))).toEqual(["noLessons"]);
    });

    it("flags missing time, dance, catalog entry, level and link", () => {
        expect(checks(lessonDraft(occurrence({ lessons: [lesson({ startAt: null, level: null, link: null })] }), SITE)))
            .toEqual(["lessonMissingTime", "lessonMissingLevel", "lessonMissingLink"]);
        expect(checks(lessonDraft(occurrence({ lessons: [lesson({ dance: " ", danceId: null })] }), SITE)))
            .toEqual(["lessonMissingDance"]);
        expect(checks(lessonDraft(occurrence({ lessons: [lesson({ danceId: null })] }), SITE)))
            .toEqual(["danceNotInCatalog"]);
    });

    it("flags a substitute with no name and a missing venue", () => {
        expect(checks(lessonDraft(occurrence({ substituteInstructorId: "i2", venueName: null }), SITE)))
            .toEqual(["venueMissing", "substituteMissingName"]);
    });

    it("names a substitute and says Today for a daytime class", () => {
        const d = lessonDraft(occurrence({ startAt: new Date("2026-10-19T18:00:00Z"), substitute: "Jane" }), SITE);
        expect(d.message).toMatch(/^Today's/);
        expect(d.message).toContain("Jane is teaching today.");
    });

    it("changes planHash when the text changes", () => {
        const a = lessonDraft(occurrence(), SITE);
        const b = lessonDraft(occurrence({ lessons: [lesson({ dance: "Tush Push" })] }), SITE);
        expect(a.planHash).not.toBe(b.planHash);
        expect(lessonDraft(occurrence(), SITE).planHash).toBe(a.planHash);
    });
});

describe("cancellationDraft and weeklyDraft", () => {
    it("writes a cancellation with the note", () => {
        const d = cancellationDraft(occurrence({ isCancelled: true, cancelNote: "Venue closed for a private event." }), SITE);
        expect(d.message).toContain("Cancelled: Charlies Country at Charlie's Denver on Mon 10/19 at 7:00 PM.");
        expect(d.message).toContain("Venue closed for a private event.");
    });

    it("outlines the week with times only", () => {
        const d = weeklyDraft([
            occurrence(),
            occurrence({ key: "et1|2026-10-21", date: "2026-10-21", startAt: new Date("2026-10-22T01:00:00Z"), substitute: "Jane" }),
            occurrence({ key: "et1|2026-10-22", date: "2026-10-22", startAt: new Date("2026-10-23T01:00:00Z"), isCancelled: true }),
        ], SITE);
        expect(d.issues).toEqual([]);
        expect(d.message).toContain("Mon 10/19 · 7:00 PM · Charlies Country at Charlie's Denver (Beginner · $10)");
        expect(d.message).toContain("Wed 10/21 · 7:00 PM · Charlies Country at Charlie's Denver (Beginner · $10) · Sub: Jane");
        expect(d.message).toContain("Thu 10/22 · 7:00 PM · Charlies Country at Charlie's Denver · CANCELLED");
        expect(d.message).not.toContain("Copperhead");
    });
});
