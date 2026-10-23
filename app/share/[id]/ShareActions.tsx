"use client";

import { useState } from "react";

/**
 * Hands the image and caption to the phone's share sheet (pick WhatsApp, then the group or channel).
 * The caption is copied first: WhatsApp sometimes drops text shared with an image, so it can be pasted.
 */
export function ShareActions({ imageUrl, caption }: { imageUrl: string | null; caption: string }) {
    const [status, setStatus] = useState<string | null>(null);

    async function copy(): Promise<boolean> {
        try {
            await navigator.clipboard.writeText(caption);
            return true;
        } catch {
            return false;
        }
    }

    async function share() {
        const copied = await copy();
        try {
            const files = imageUrl ? [new File([await (await fetch(imageUrl)).blob()], "beyond-line-dance.png", { type: "image/png" })] : [];
            if (files.length && navigator.canShare?.({ files })) {
                await navigator.share({ files, text: caption });
            } else if (navigator.share) {
                await navigator.share({ text: caption });
            } else {
                setStatus("This browser can't open the share sheet. Save the image and paste the caption in WhatsApp.");
                return;
            }
            setStatus(copied ? "Shared. If the caption didn't come through, it's copied: paste it in WhatsApp." : "Shared.");
        } catch (e) {
            // Closing the share sheet is not an error worth showing.
            if (e instanceof DOMException && e.name === "AbortError") return;
            setStatus(`Couldn't share: ${e instanceof Error ? e.message : String(e)}`);
        }
    }

    return (
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            {imageUrl && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={imageUrl} alt="Post image" style={{ width: "100%", height: "auto", borderRadius: 12 }} />
            )}
            <button type="button" onClick={share} style={{ ...button, background: "#25D366", color: "#062b14" }}>Share to WhatsApp</button>
            {status && <p style={{ margin: 0, fontSize: 14, color: "#c9b6ff" }}>{status}</p>}
            <div style={{ display: "flex", gap: 10 }}>
                <button type="button" onClick={async () => setStatus((await copy()) ? "Caption copied." : "Couldn't copy; select the text below instead.")} style={{ ...button, flex: 1 }}>Copy caption</button>
                {imageUrl && <a href={imageUrl} download="beyond-line-dance.png" style={{ ...button, flex: 1, textAlign: "center", textDecoration: "none" }}>Save image</a>}
            </div>
            <pre style={{ whiteSpace: "pre-wrap", fontFamily: "inherit", fontSize: 14, lineHeight: 1.45, margin: 0, padding: 14, borderRadius: 12, background: "#1B0B33", userSelect: "text" }}>{caption}</pre>
        </div>
    );
}

const button: React.CSSProperties = {
    display: "block", padding: "14px 16px", borderRadius: 12, border: "none", fontSize: 17, fontWeight: 700,
    background: "#2a1650", color: "#fff", cursor: "pointer",
};
