import { beforeEach, describe, expect, it } from "vitest";
import { failedAlert, waitingAlert, type AlertPost } from "./alerts";
import { quickUrl, signQuick, verifyQuick } from "./quickAction";

const post = (over: Partial<AlertPost> = {}): AlertPost => ({
    _id: "6adbb6accde38a44af9b31c1", kind: "lesson", planHash: "abc123",
    label: "Charlies Country at Charlie's Denver, Mon 10/26 5:00 PM",
    issues: [
        { check: "danceNotInCatalog", message: "Guillotine isn't in the dance catalog" },
        { check: "lessonMissingDance", message: "Lesson at 6:00 PM: no dance chosen" },
        { check: "lessonMissingLink", message: "Lesson at 6:00 PM: no link" },
    ],
    expireAt: new Date("2026-10-26T22:00:00Z"), card: { type: "lesson" }, ...over,
});

beforeEach(() => {
    process.env.INTERNAL_API_SECRET = "test-secret";
    process.env.PUBLIC_URL = "https://poster.example";
    process.env.ADMIN_URL = "https://admin.example";
});

describe("waitingAlert", () => {
    it("fits a lock screen: class as title, time, two reasons, the deadline", () => {
        const a = waitingAlert(post(), "America/Denver");
        expect(a.title).toBe("Charlies Country at Charlie's Denver");
        expect(a.message).toBe([
            "Mon 10/26 5:00 PM · needs your OK",
            "• Guillotine isn't in the dance catalog",
            "• Lesson at 6:00 PM: no dance chosen",
            "+ 1 more",
            "Won't post after 4:00 PM",
        ].join("\n"));
        expect(a.tags).toEqual(["loudspeaker"]);
        expect(a.image).toBe("https://poster.example/api/card/6adbb6accde38a44af9b31c1?v=abc123");
        expect(a.url).toBe("https://admin.example/social-posts?id=6adbb6accde38a44af9b31c1");
    });

    it("has Approve, Skip and Review buttons", () => {
        const a = waitingAlert(post(), "America/Denver");
        expect(a.actions?.map((x) => [x.kind, x.label])).toEqual([
            ["http", "✅ Approve & post"], ["http", "Skip"], ["view", "Review"],
        ]);
        expect(a.actions?.[0].url).toBe(quickUrl("https://poster.example", post(), "approve"));
    });

    it("explains cancellations and leaves out the test marker", () => {
        expect(waitingAlert(post({ kind: "cancellation", issues: [] }), "America/Denver").message).toContain("• Cancellations always need your OK");
        const test = waitingAlert(post({ kind: "test", issues: [{ check: "test", message: "Test post" }] }), "America/Denver");
        expect(test.message).not.toContain("Test post");
        expect(test.tags).toEqual(["test_tube"]);
    });
});

describe("failedAlert", () => {
    it("offers Retry and Review and trims long errors", () => {
        const a = failedAlert(post(), "x".repeat(200));
        expect(a.title).toBe("Couldn't post: Charlies Country at Charlie's Denver");
        expect(a.message.split("\n")[1]).toHaveLength(138);
        expect(a.actions?.map((x) => x.label)).toEqual(["🔁 Retry", "Review"]);
    });
});

describe("quick action tokens", () => {
    it("only verify for the same post, plan and action", () => {
        const t = signQuick("p1", "plan1", "approve");
        expect(verifyQuick("p1", "plan1", "approve", t)).toBe(true);
        expect(verifyQuick("p1", "plan2", "approve", t)).toBe(false); // plan changed since the alert
        expect(verifyQuick("p1", "plan1", "skip", t)).toBe(false);
        expect(verifyQuick("p2", "plan1", "approve", t)).toBe(false);
        expect(verifyQuick("p1", "plan1", "approve", "nope")).toBe(false);
    });
});
