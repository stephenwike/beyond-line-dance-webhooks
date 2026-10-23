// Links to a post: its image on this app, and its card on the admin's Social Posts page.

import { env } from "./env";

/** Where Facebook (and the admin preview) fetch a post's image; the version changes with the plan. */
export function cardUrl(p: { _id: string; planHash: string }): string {
    const base = env.publicUrl();
    if (!base) throw new Error("PUBLIC_URL is not set, so Facebook can't fetch the post image");
    return `${base}/api/card/${p._id}?v=${p.planHash}`;
}

export function adminPostUrl(id: string): string | undefined {
    const base = env.adminUrl();
    return base ? `${base}/social-posts?id=${id}` : undefined;
}
