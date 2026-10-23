// Phone alerts: Pushover if configured, otherwise ntfy. Returns false when neither is set up.

export interface Alert { title: string; message: string; url?: string; urlTitle?: string; urgent?: boolean }

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
        const headers: Record<string, string> = { Title: a.title, Priority: a.urgent ? "high" : "default" };
        if (a.url) headers.Click = a.url;
        if (process.env.NTFY_TOKEN) headers.Authorization = `Bearer ${process.env.NTFY_TOKEN}`;
        const server = (process.env.NTFY_SERVER || "https://ntfy.sh").replace(/\/$/, "");
        const res = await fetch(`${server}/${encodeURIComponent(topic)}`, { method: "POST", headers, body: a.message });
        if (!res.ok) throw new Error(`ntfy ${res.status}: ${await res.text()}`);
        return true;
    }

    console.warn(`No phone alert channel configured. Would have sent: ${a.title} — ${a.message}`);
    return false;
}
