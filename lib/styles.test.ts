import { describe, expect, it } from "vitest";
import { lessonDraft } from "./drafts";
import { lesson, occurrence } from "./fixtures";
import { DEFAULT_STYLE, fillStyleText, resolveStyle } from "./styles";

const COUNTRY = "694f56089fad7f908b6be167";

describe("resolveStyle", () => {
    it("uses the default for unknown classes and the suggestion for known ones", () => {
        expect(resolveStyle("nope")).toEqual(DEFAULT_STYLE);
        expect(resolveStyle(COUNTRY)).toMatchObject({ theme: "sunset", photo: "rodeo-sunset", headline: "Country Night!" });
    });

    it("lets saved fields override the suggestion one by one", () => {
        const saved = new Map([[COUNTRY, { cta: "Yeehaw!" }]]);
        expect(resolveStyle(COUNTRY, saved)).toMatchObject({ theme: "sunset", cta: "Yeehaw!" });
    });

    it("falls back when a saved theme or photo doesn't exist", () => {
        const saved = new Map([[COUNTRY, { theme: "gone", photo: "gone" } as never]]);
        expect(resolveStyle(COUNTRY, saved)).toMatchObject({ theme: "neon", photo: "dance-floor" });
    });
});

describe("styled drafts", () => {
    it("fills placeholders", () => {
        expect(fillStyleText("{When}! {when} at {venue}", "tonight", "Charlie's")).toBe("Tonight! tonight at Charlie's");
    });

    it("uses the class's hook, headline, call to action and hashtags", () => {
        const d = lessonDraft(occurrence({ lessons: [lesson()] }), "https://x", resolveStyle(COUNTRY));
        expect(d.message).toMatch(/^👢 Country dance night at Charlie's Denver, tonight!/);
        expect(d.message).toContain("#BeyondLineDance #CountryDance");
        expect(d.card.style).toEqual({ theme: "sunset", photo: "rodeo-sunset", headline: "Country Night!", cta: "Grab your boots!" });
    });

    it("changes the planHash when the style changes, so open posts get redrawn", () => {
        const o = occurrence();
        expect(lessonDraft(o, "https://x", resolveStyle(COUNTRY)).planHash).not.toBe(lessonDraft(o, "https://x").planHash);
    });
});
