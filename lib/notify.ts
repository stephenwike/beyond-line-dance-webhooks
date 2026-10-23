// Phone alerts: Pushover if configured, otherwise ntfy. Returns false when neither is set up.
// ntfy gets the full phone treatment (image, tags and up to 3 buttons); Pushover gets the text and link.

export type AlertAction =
    | { kind: "view"; label: string; url: string }
    /** A button that POSTs to url from the phone, then clears the notification. */
    | { kind: "http"; label: string; url: string };

export interface Alert {
    title: string;
    message: string;
    /** Opened when the notification itself is tapped. */
    url?: string;
    urlTitle?: string;
    urgent?: boolean;
    /** ntfy tag names; emoji shortcodes such as "loudspeaker" show as an icon. */
    tags?: string[];
    /** Image shown with the notification. */
    image?: string;
    actions?: AlertAction[];
}

export async function sendPhoneAlert(a: Alert): Promise<boolean> {
    const token = process.env.PUSHOVER_APP_TOKEN;
    const user = process.env.PUSHOVER_USER_KEY;
    if (token && user) {
        const res = await fetch("https://api.pushover.net/1/messages.json", {
            method: "POST",
            body: new URLSearchParams({
                token, user, title: a.title, message: a.message,
                ...(a.url ? { url: a.url, url_title: a.urlTitle ?? "Open" } : {}),
                priority: a.urgent ? "1" : "0",
            }),
        });
        if (!res.ok) throw new Error(`Pushover ${res.status}: ${await res.text()}`);
        return true;
    }

    const topic = process.env.NTFY_TOPIC;
    if (topic) {
        const server = (process.env.NTFY_SERVER || "https://ntfy.sh").replace(/\/$/, "");
        const headers: Record<string, string> = { "Content-Type": "application/json" };
        if (process.env.NTFY_TOKEN) headers.Authorization = `Bearer ${process.env.NTFY_TOKEN}`;
        // JSON publishing (https://docs.ntfy.sh/publish/#publish-as-json) carries image and buttons cleanly.
        const body = {
            topic, title: a.title, message: a.message,
            priority: a.urgent ? 4 : 3,
            tags: a.tags,
            click: a.url,
            attach: a.image,
            filename: a.image ? "post.png" : undefined,
            actions: a.actions?.slice(0, 3).map((x) => x.kind === "view"
                ? { action: "view", label: x.label, url: x.url }
                : { action: "http", label: x.label, url: x.url, method: "POST", clear: true }),
        };
        const res = await fetch(server, { method: "POST", headers, body: JSON.stringify(body) });
        if (!res.ok) throw new Error(`ntfy ${res.status}: ${await res.text()}`);
        return true;
    }

    console.warn(`No phone alert channel configured. Would have sent: ${a.title} — ${a.message}`);
    return false;
}
