// Post styles: theme (colors), photo, headline, caption hook, call to action and hashtags.
// Lesson posts use their class's style: each event type starts from a suggested style below, and what you
// save on the admin's Ads page (bld.post_styles, _id = eventTypeId) overrides it field by field.
// Cancellations and the weekly schedule have their own styles (_id = "type:cancellation" /
// "type:weekly_outline"), starting from TYPE_DEFAULTS.

import type { Db } from "mongodb";

export const THEMES = {
    neon: { label: "Neon Night", ink: "#0B0614", deep: "#1B0B33", brushFrom: "#FF3EA5", brushTo: "#8A5CFF", swoosh: "#2EE6F6", highlight: "#FF8A1F", accent: "#8A5CFF" },
    sunset: { label: "Sunset", ink: "#140805", deep: "#3A1208", brushFrom: "#FFB347", brushTo: "#FF4E50", swoosh: "#FFE08A", highlight: "#FFB347", accent: "#FF6A3D" },
    electric: { label: "Electric Blue", ink: "#040A18", deep: "#0A1F4A", brushFrom: "#3DA5FF", brushTo: "#7CF0FF", swoosh: "#C6FF3D", highlight: "#C6FF3D", accent: "#3D7BFF" },
    ruby: { label: "Ruby", ink: "#12040A", deep: "#3D0A22", brushFrom: "#FF4D8D", brushTo: "#FFB3D1", swoosh: "#FFD166", highlight: "#FFD166", accent: "#E0306E" },
    fresh: { label: "Fresh Start", ink: "#03110F", deep: "#07332C", brushFrom: "#3DDC97", brushTo: "#B5F4D8", swoosh: "#FFE45C", highlight: "#FFE45C", accent: "#22B37A" },
} as const;
export type ThemeId = keyof typeof THEMES;
export type Theme = (typeof THEMES)[ThemeId];

/** Background photos in assets/photos. */
export const PHOTOS = {
    "dance-floor": { label: "Dance floor (purple lights)", file: "dance-floor.jpg" },
    "charlies-1": { label: "Charlie's dance floor 1", file: "charlies-1.jpg" },
    "charlies-2": { label: "Charlie's dance floor 2", file: "charlies-2.jpg" },
    "rodeo-sunset": { label: "Rodeo at sunset", file: "rodeo-sunset.jpg" },
    "turnverein-ballroom": { label: "Turnverein ballroom", file: "turnverein-ballroom.jpg" },
} as const;
export type PhotoId = keyof typeof PHOTOS;

export interface PostStyle {
    theme: ThemeId;
    photo: PhotoId;
    /** The brush-script word on the image. {When} → Tonight / Today. */
    headline: string;
    /** First caption line. {when} → tonight / today, {venue} → the venue's name. */
    hook: string;
    /** Brush-script line above the image footer. */
    cta: string;
    /** Added after the brand hashtags. */
    hashtags: string[];
    /** Cancellations only: draw with the cancelled class's theme and photo instead of this style's. */
    matchClass?: boolean;
}

export const DEFAULT_STYLE: PostStyle = {
    theme: "neon", photo: "dance-floor", headline: "{When}!",
    hook: "💃 Line dancing {when} at {venue}! ✨", cta: "Come dance with us!", hashtags: [],
};

/** Starting styles for Stephen's classes, by event type id. Saved styles override these. */
export const SUGGESTED_STYLES: Record<string, Partial<PostStyle>> = {
    // Charlies Country: Thursday & Saturday nights
    "694f56089fad7f908b6be167": { theme: "sunset", photo: "rodeo-sunset", headline: "Country Night!", hook: "👢 Country dance night at {venue}, {when}!", cta: "Grab your boots!", hashtags: ["#CountryDance"] },
    // Popular Line Dance: Monday nights at Charlie's
    "6adbc9571ee36b88df899dbd": { theme: "neon", photo: "charlies-2", hook: "💃 Popular line dancing {when} at {venue}! ✨" },
    // Alternative Line Dance: Saturday afternoons at Charlie's
    "694f56089fad7f908b6be168": { theme: "ruby", photo: "charlies-1", hook: "🎧 Alternative line dance {when} at {venue}!", hashtags: ["#AlternativeLineDance"] },
    // Glenarm: Beginner & Improver
    "69aa4c690a7750f056e60746": { theme: "fresh", photo: "dance-floor", headline: "Beginners Welcome!", hook: "🌱 New to line dancing? Start {when} at {venue}!", cta: "No experience needed!", hashtags: ["#BeginnerLineDance"] },
    // Barnum: Intermediate to Advanced
    "694f56089fad7f908b6be169": { theme: "electric", photo: "dance-floor", headline: "Level Up!", hook: "🔥 Ready for a challenge? Intermediate & advanced line dancing {when} at {venue}!", cta: "Bring your A-game!", hashtags: ["#AdvancedLineDance"] },
};

/** Ad types with a style of their own; lesson posts use their class's style. */
export type AdType = "cancellation" | "weekly_outline";

export const TYPE_DEFAULTS: Record<AdType, PostStyle> = {
    cancellation: {
        theme: "neon", photo: "dance-floor", headline: "Cancelled", hook: "⚠️ Class cancelled: {class} at {venue}",
        cta: "See you next time!", hashtags: [], matchClass: true,
    },
    weekly_outline: {
        theme: "neon", photo: "dance-floor", headline: "Line Dance Classes", hook: "🗓️ This week at Beyond Line Dance 💜",
        cta: "Come dance with us!", hashtags: [],
    },
};

export type SavedStyles = Map<string, Partial<PostStyle>>;

/** The style for an ad type: saved fields over its defaults. */
export function resolveTypeStyle(type: AdType, saved: SavedStyles = new Map()): PostStyle {
    const s = { ...TYPE_DEFAULTS[type], ...saved.get(`type:${type}`) };
    return {
        ...s,
        theme: s.theme in THEMES ? s.theme : TYPE_DEFAULTS[type].theme,
        photo: s.photo in PHOTOS ? s.photo : TYPE_DEFAULTS[type].photo,
        hashtags: Array.isArray(s.hashtags) ? s.hashtags : [],
    };
}

/** The style for an event type: saved fields over suggested over the default. Unknown ids fall back. */
export function resolveStyle(eventTypeId: string | null, saved: SavedStyles = new Map()): PostStyle {
    const s = { ...DEFAULT_STYLE, ...(eventTypeId ? SUGGESTED_STYLES[eventTypeId] : {}), ...(eventTypeId ? saved.get(eventTypeId) : {}) };
    return {
        ...s,
        theme: s.theme in THEMES ? s.theme : DEFAULT_STYLE.theme,
        photo: s.photo in PHOTOS ? s.photo : DEFAULT_STYLE.photo,
        hashtags: Array.isArray(s.hashtags) ? s.hashtags : [],
    };
}

const FIELDS = ["theme", "photo", "headline", "hook", "cta", "hashtags", "matchClass"] as const;

export async function loadSavedStyles(bldDb: Db): Promise<SavedStyles> {
    const docs = await bldDb.collection<{ _id: string } & Partial<PostStyle>>("post_styles").find().toArray();
    return new Map(docs.map((d) => [d._id, Object.fromEntries(FIELDS.filter((k) => d[k] != null).map((k) => [k, d[k]])) as Partial<PostStyle>]));
}

/** Fill {when}/{When}/{venue}/{class} in a style's text. */
export function fillStyleText(text: string, when: "tonight" | "today", venue: string | null, className = "class"): string {
    return text
        .replaceAll("{When}", when === "tonight" ? "Tonight" : "Today")
        .replaceAll("{when}", when)
        .replaceAll("{venue}", venue ?? "our class")
        .replaceAll("{class}", className);
}
