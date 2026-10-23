// Graph API calls for the Page. Docs: https://developers.facebook.com/documentation/pages-api/posts

import { env } from "./env";

export class GraphError extends Error {
    constructor(message: string, public readonly status: number, public readonly body: unknown) {
        super(message);
    }
}

export async function graphPost(path: string, params: Record<string, string>): Promise<Record<string, unknown>> {
    const res = await fetch(`https://graph.facebook.com/${env.fbGraphVersion()}/${path}`, {
        method: "POST",
        body: new URLSearchParams(params),
    });
    const body = await res.json().catch(() => ({}));
    if (!res.ok || body.error) {
        const msg = body?.error?.message ?? `Graph API ${res.status}`;
        throw new GraphError(msg, res.status, body);
    }
    return body;
}

/**
 * Publish a text post to the Page feed. Returns the post id ("dry-run:..." when not live).
 * A hidden post is created unpublished: it never shows on the Page or in feeds, but Page admins can
 * open it by id. Hidden posts reach Facebook even in dry-run mode; the e2e test uses them.
 */
export async function publishToPage(message: string, opts: { hidden?: boolean } = {}): Promise<string> {
    if (!opts.hidden && !env.publishLive()) {
        console.log(`[dry-run] Would post to Facebook:\n${message}`);
        return `dry-run:${Date.now()}`;
    }
    const params: Record<string, string> = { message, access_token: env.fbPageToken() };
    if (opts.hidden) params.published = "false";
    const body = await graphPost(`${env.fbPageId()}/feed`, params);
    return String(body.id);
}

export async function deletePost(postId: string): Promise<void> {
    const url = `https://graph.facebook.com/${env.fbGraphVersion()}/${postId}?access_token=${env.fbPageToken()}`;
    const res = await fetch(url, { method: "DELETE" });
    const body = await res.json().catch(() => ({}));
    if (!res.ok || body.error) throw new GraphError(body?.error?.message ?? `Graph API ${res.status}`, res.status, body);
}
