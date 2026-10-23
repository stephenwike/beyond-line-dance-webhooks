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

/** Publish a text post to the Page feed. Returns the post id ("dry-run:..." when not live). */
export async function publishToPage(message: string): Promise<string> {
    if (!env.publishLive()) {
        console.log(`[dry-run] Would post to Facebook:\n${message}`);
        return `dry-run:${Date.now()}`;
    }
    const body = await graphPost(`${env.fbPageId()}/feed`, { message, access_token: env.fbPageToken() });
    return String(body.id);
}
