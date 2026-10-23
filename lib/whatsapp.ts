// WhatsApp sharing. Meta has no API for posting to a Channel, and its Groups API only reaches small
// groups it creates itself, so posts reach the WhatsApp group and Updates channel by a one-tap share from
// Stephen's phone: after a Facebook post publishes, a phone alert opens /share/<id>, which hands the
// image and a WhatsApp-formatted caption to the phone's share sheet.

import { brand } from "./config";
import { env } from "./env";
import type { Alert } from "./notify";
import { signQuick, verifyQuick } from "./quickAction";
import { cardUrl } from "./urls";

/** The Facebook caption, reworked for WhatsApp: bold first line, no hashtags. */
export function whatsappCaption(message: string): string {
    const blocks = message.split("\n\n").filter((b) => !/^#\S+(\s+#\S+)*$/.test(b.trim()));
    if (blocks.length > 0 && blocks[0].trim()) blocks[0] = `*${blocks[0].trim()}*`;
    return blocks.join("\n\n");
}

export interface SharePost { _id: string; label: string; planHash: string; card?: unknown; kind: string }

/** Signed link to the share page. Shares are for published posts, so the plan no longer changes. */
export function shareUrl(p: Pick<SharePost, "_id" | "planHash">): string {
    return `${env.publicUrl()}/share/${p._id}?t=${signQuick(p._id, p.planHash, "share")}`;
}

export function verifyShare(p: Pick<SharePost, "_id" | "planHash">, token: string): boolean {
    return verifyQuick(p._id, p.planHash, "share", token);
}

/** The alert sent after a post publishes on Facebook. */
export function shareAlert(p: SharePost): Alert {
    const url = shareUrl(p);
    return {
        title: `Share to WhatsApp: ${p.label}`,
        message: `It's on Facebook. Tap to share the image and caption to your ${brand.name} group or channel.`,
        url, urlTitle: "Share to WhatsApp",
        tags: ["speech_balloon"],
        image: p.card ? cardUrl(p) : undefined,
        actions: [{ kind: "view", label: "Share to WhatsApp", url }],
    };
}
