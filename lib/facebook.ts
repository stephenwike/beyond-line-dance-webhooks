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

export interface Published { id: string; permalink: string | null }

/**
 * Publish to the Page: a photo post with the message as its caption when imageUrl is given (Facebook
 * downloads the image from it), otherwise a text post. Returns the post id ("dry-run:..." when not live).
 * A hidden post is created unpublished: it exists only through the API and never shows on the Page,
 * in feeds or in Facebook's post lists. Hidden posts reach Facebook even in dry-run mode (the e2e test).
 */
export async function publishToPage(message: string, opts: { hidden?: boolean; imageUrl?: string } = {}): Promise<Published> {
    if (!opts.hidden && !env.publishLive()) {
        console.log(`[dry-run] Would post to Facebook${opts.imageUrl ? ` with image ${opts.imageUrl}` : ""}:\n${message}`);
        return { id: `dry-run:${Date.now()}`, permalink: null };
    }
    const params: Record<string, string> = { access_token: env.fbPageToken() };
    if (opts.hidden) params.published = "false";
    let id: string;
    if (opts.imageUrl) {
        const body = await graphPost(`${env.fbPageId()}/photos`, { ...params, url: opts.imageUrl, caption: message });
        id = String(body.post_id ?? body.id);
    } else {
        const body = await graphPost(`${env.fbPageId()}/feed`, { ...params, message });
        id = String(body.id);
    }
    return { id, permalink: opts.hidden ? null : await permalinkOf(id) };
}

/** Facebook's own link to a post, or null if it can't be read. */
async function permalinkOf(postId: string): Promise<string | null> {
    try {
        const res = await fetch(`https://graph.facebook.com/${env.fbGraphVersion()}/${postId}?fields=permalink_url&access_token=${env.fbPageToken()}`);
        const body = await res.json();
        return typeof body.permalink_url === "string" ? body.permalink_url : null;
    } catch {
        return null;
    }
}

export async function deletePost(postId: string): Promise<void> {
    const url = `https://graph.facebook.com/${env.fbGraphVersion()}/${postId}?access_token=${env.fbPageToken()}`;
    const res = await fetch(url, { method: "DELETE" });
    const body = await res.json().catch(() => ({}));
    if (!res.ok || body.error) throw new GraphError(body?.error?.message ?? `Graph API ${res.status}`, res.status, body);
}
