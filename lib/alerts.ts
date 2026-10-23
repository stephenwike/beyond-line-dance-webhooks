// What the phone alerts say. Short enough for a lock screen, with the post image and one-tap buttons.
// Pure apart from reading env for links, so the wording is easy to test.

import type { Issue, PostKind } from "./drafts";
import { env } from "./env";
import type { AlertAction, Alert } from "./notify";
import { quickUrl } from "./quickAction";
import { formatTime12, zonedParts } from "./time";
import { adminPostUrl, cardUrl } from "./urls";

export interface AlertPost {
    _id: string; kind: PostKind; label: string; planHash: string; issues: Issue[];
    expireAt: Date; card?: unknown;
}

const TAGS: Record<PostKind, string> = { lesson: "loudspeaker", cancellation: "warning", weekly_outline: "calendar", test: "test_tube" };

/** "Charlies Country at Charlie's Denver, Mon 10/26 5:00 PM" → what / when. */
function splitLabel(label: string): { what: string; when: string | null } {
    const i = label.lastIndexOf(", ");
    return i > 0 ? { what: label.slice(0, i), when: label.slice(i + 2) } : { what: label, when: null };
}

function buttons(p: AlertPost, approveLabel: string, withSkip: boolean): AlertAction[] {
    const base = env.publicUrl();
    const out: AlertAction[] = [];
    if (base) {
        out.push({ kind: "http", label: approveLabel, url: quickUrl(base, p, "approve") });
        if (withSkip) out.push({ kind: "http", label: "Skip", url: quickUrl(base, p, "skip") });
    }
    const review = adminPostUrl(p._id);
    if (review) out.push({ kind: "view", label: "Review", url: review });
    return out;
}

function image(p: AlertPost): string | undefined {
    return p.card && env.publicUrl() ? cardUrl(p) : undefined;
}

/** A held post that still needs your OK. */
export function waitingAlert(p: AlertPost, timeZone: string): Alert {
    const { what, when } = splitLabel(p.label);
    const reasons = p.kind === "cancellation"
        ? ["Cancellations always need your OK"]
        : p.issues.filter((i) => i.check !== "test").map((i) => i.message);
    const shown = reasons.slice(0, 2).map((r) => `• ${r}`);
    if (reasons.length > 2) shown.push(`+ ${reasons.length - 2} more`);
    const by = formatTime12(zonedParts(p.expireAt, timeZone).hhmm);
    return {
        title: what,
        message: [when ? `${when} · needs your OK` : "Needs your OK", ...shown, `Won't post after ${by}`].join("\n"),
        url: adminPostUrl(p._id), urlTitle: "Review post", urgent: true,
        tags: [TAGS[p.kind]],
        image: image(p),
        actions: buttons(p, "✅ Approve & post", true),
    };
}

/** Facebook refused the post. */
export function failedAlert(p: AlertPost, error: string): Alert {
    const { what, when } = splitLabel(p.label);
    const short = error.length > 140 ? `${error.slice(0, 137)}…` : error;
    return {
        title: `Couldn't post: ${what}`,
        message: [when, short].filter(Boolean).join("\n"),
        url: adminPostUrl(p._id), urlTitle: "Open Social Posts", urgent: true,
        tags: ["x"],
        image: image(p),
        actions: buttons(p, "🔁 Retry", false),
    };
}
