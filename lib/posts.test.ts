import { describe, expect, it } from "vitest";
import { nextStep, type SocialPost } from "./posts";

const start = new Date("2026-10-20T01:00:00Z");
const h = (n: number) => new Date(start.getTime() - n * 3_600_000);

function post(over: Partial<SocialPost> = {}): Parameters<typeof nextStep>[0] {
    return {
        kind: "lesson", status: "pending", issues: [], planHash: "a", approvedPlanHash: null,
        alertAt: h(3), expireAt: h(1), alertedAt: null, startAt: start, ...over,
    };
}
const issue = [{ check: "noLessons" as const, message: "No lesson plan yet" }];

describe("nextStep", () => {
    it("publishes a clean lesson post right away", () => {
        expect(nextStep(post(), h(6), true)).toBe("publish");
    });

    it("holds a post with issues, alerts once at 3h, expires at 1h", () => {
        expect(nextStep(post({ issues: issue }), h(5))).toBe("none");
        expect(nextStep(post({ issues: issue }), h(3))).toBe("alert");
        expect(nextStep(post({ issues: issue, alertedAt: h(3) }), h(2))).toBe("none");
        expect(nextStep(post({ issues: issue, alertedAt: h(3) }), h(1))).toBe("expire");
    });

    it("asks right away instead of publishing when autoPublish is off", () => {
        expect(nextStep(post(), h(6), false)).toBe("alert");
        expect(nextStep(post({ alertedAt: h(6) }), h(5), false)).toBe("none");
        expect(nextStep(post({ alertedAt: h(6) }), h(1), false)).toBe("expire");
    });

    it("never auto-publishes a cancellation", () => {
        expect(nextStep(post({ kind: "cancellation", expireAt: start }), h(6))).toBe("none");
        expect(nextStep(post({ kind: "cancellation", expireAt: start }), h(3))).toBe("alert");
    });

    it("publishes an approved post unless the plan changed or class started", () => {
        const approved = post({ status: "approved", issues: issue, approvedPlanHash: "a" });
        expect(nextStep(approved, h(0.5))).toBe("publish");
        expect(nextStep({ ...approved, planHash: "b" }, h(2))).toBe("reopen");
        expect(nextStep(approved, start)).toBe("expire");
    });

    it("leaves finished posts alone", () => {
        for (const status of ["published", "skipped", "expired", "failed", "publishing"] as const) {
            expect(nextStep(post({ status }), h(6))).toBe("none");
        }
    });
});
