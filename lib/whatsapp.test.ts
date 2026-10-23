import { beforeEach, describe, expect, it } from "vitest";
import { shareAlert, shareUrl, verifyShare, whatsappCaption } from "./whatsapp";

beforeEach(() => {
    process.env.INTERNAL_API_SECRET = "test-secret";
    process.env.PUBLIC_URL = "https://poster.example";
});

describe("whatsappCaption", () => {
    it("bolds the first line and drops the hashtags", () => {
        expect(whatsappCaption("💃 Line dancing tonight! ✨\n\nCharlies · 5 PM\n\n#LineDance #DenverDance"))
            .toBe("*💃 Line dancing tonight! ✨*\n\nCharlies · 5 PM");
    });
});

describe("share links", () => {
    const p = { _id: "6adbb6accde38a44af9b31c1", planHash: "abc", label: "Charlies Country, Sat 10/24 5:00 PM", kind: "lesson", card: {} };

    it("signs the link for that post only", () => {
        const t = new URL(shareUrl(p)).searchParams.get("t")!;
        expect(shareUrl(p)).toMatch(/^https:\/\/poster\.example\/share\/6adbb6accde38a44af9b31c1\?t=/);
        expect(verifyShare(p, t)).toBe(true);
        expect(verifyShare({ ...p, _id: "000000000000000000000000" }, t)).toBe(false);
    });

    it("alerts with the image and a share button", () => {
        const a = shareAlert(p);
        expect(a.title).toBe("Share to WhatsApp: Charlies Country, Sat 10/24 5:00 PM");
        expect(a.image).toBe("https://poster.example/api/card/6adbb6accde38a44af9b31c1?v=abc");
        expect(a.actions).toEqual([{ kind: "view", label: "Share to WhatsApp", url: shareUrl(p) }]);
    });
});
