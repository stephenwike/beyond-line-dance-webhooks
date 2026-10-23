// Links to a post: its image on this app, and its card on the admin's Social Posts page.

import { env } from "./env";

/**
 * Where Facebook (and the admin preview) fetch a post's image; the version changes with the plan.
 * The "whatsapp" variant is the light event card (lib/eventCard.tsx) used for WhatsApp shares.
 */
export function cardUrl(p: { _id: string; planHash: string }, variant: "facebook" | "whatsapp" = "facebook"): string {
    const base = env.publicUrl();
    if (!base) throw new Error("PUBLIC_URL is not set, so Facebook can't fetch the post image");
    return `${base}${cardPath(p, variant)}`;
}

/** The same, as a path on this app (for its own pages). */
export function cardPath(p: { _id: string; planHash: string }, variant: "facebook" | "whatsapp" = "facebook"): string {
    return `/api/card/${p._id}?v=${p.planHash}${variant === "whatsapp" ? "&variant=whatsapp" : ""}`;
}

export function adminPostUrl(id: string): string | undefined {
    const base = env.adminUrl();
    return base ? `${base}/social-posts?id=${id}` : undefined;
}
