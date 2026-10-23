"use client";

import { useState } from "react";

const WA = { green: "#25D366", bubble: "#005C4B", text: "#E9EDEF", muted: "#8696A0", panel: "#202C33" };

/** WhatsApp's *bold* markup shown as bold, the way it will look in the chat. */
function Formatted({ text }: { text: string }) {
    return <>{text.split(/(\*[^*\n]+\*)/g).map((part, i) => /^\*[^*]+\*$/.test(part) ? <strong key={i}>{part.slice(1, -1)}</strong> : part)}</>;
}

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
            <p style={{ margin: 0, fontSize: 13, color: WA.muted }}>How it will look in your WhatsApp group or channel:</p>
            {/* The post as a WhatsApp chat bubble */}
            <div style={{ alignSelf: "flex-end", maxWidth: "88%", background: WA.bubble, borderRadius: "10px 0 10px 10px", padding: 4, boxShadow: "0 1px 1px rgba(0,0,0,0.3)" }}>
                {imageUrl && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={imageUrl} alt="Post image" style={{ display: "block", width: "100%", height: "auto", borderRadius: 7 }} />
                )}
                <div style={{ whiteSpace: "pre-wrap", fontSize: 14.5, lineHeight: 1.4, color: WA.text, padding: "6px 6px 2px", wordBreak: "break-word" }}>
                    <Formatted text={caption} />
                </div>
                <div style={{ textAlign: "right", fontSize: 11, color: "#a8c7c0", padding: "0 6px 2px" }}>now ✓✓</div>
            </div>

            <button type="button" onClick={share} style={{ ...button, background: WA.green, color: "#062b14" }}>Share to WhatsApp</button>
            {status && <p style={{ margin: 0, fontSize: 14, color: WA.text }}>{status}</p>}
            <div style={{ display: "flex", gap: 10 }}>
                <button type="button" onClick={async () => setStatus((await copy()) ? "Caption copied." : "Couldn't copy; long-press the caption above to select it.")} style={{ ...button, flex: 1 }}>Copy caption</button>
                {imageUrl && <a href={imageUrl} download="beyond-line-dance.png" style={{ ...button, flex: 1, textAlign: "center", textDecoration: "none" }}>Save image</a>}
            </div>
        </div>
    );
}

const button: React.CSSProperties = {
    display: "block", padding: "14px 16px", borderRadius: 24, border: "none", fontSize: 17, fontWeight: 700,
    background: WA.panel, color: WA.text, cursor: "pointer",
};
