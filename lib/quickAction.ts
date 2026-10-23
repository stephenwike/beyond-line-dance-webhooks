// Signed one-tap links for the phone alert's Approve / Skip / Retry buttons. A token is tied to one post
// and its current plan, so it stops working as soon as the plan changes (you then review it in the admin).

import { createHmac, timingSafeEqual } from "node:crypto";

export type QuickAction = "approve" | "skip";

function secret(): string {
    const s = process.env.INTERNAL_API_SECRET;
    if (!s) throw new Error("INTERNAL_API_SECRET is not set");
    return s;
}

export function signQuick(postId: string, planHash: string, action: QuickAction): string {
    return createHmac("sha256", secret()).update(`${postId}.${planHash}.${action}`).digest("hex").slice(0, 32);
}

export function verifyQuick(postId: string, planHash: string, action: QuickAction, token: string): boolean {
    const want = Buffer.from(signQuick(postId, planHash, action));
    const got = Buffer.from(token);
    return got.length === want.length && timingSafeEqual(got, want);
}

/** The URL a phone button calls (POST). */
export function quickUrl(baseUrl: string, p: { _id: string; planHash: string }, action: QuickAction): string {
    return `${baseUrl}/api/posts/${p._id}/quick?a=${action}&t=${signQuick(p._id, p.planHash, action)}`;
}
