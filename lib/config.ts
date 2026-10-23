// The posting rules. Change timings and checks here; everything else reads from this file.

export type CheckId =
    | "noLessons"
    | "lessonMissingTime"
    | "lessonMissingDance"
    | "danceNotInCatalog"
    | "lessonMissingLink"
    | "lessonMissingLevel"
    | "substituteMissingName"
    | "venueMissing";

/** Wording that appears on every post. */
export const brand = {
    name: "Beyond Line Dance",
    /** Short reassurance shown with each class. */
    welcome: "No partner needed",
    hashtags: ["#LineDance", "#LineDancing", "#DenverLineDance", "#DenverDance", "#BeyondLineDance"],
};

export const rules = {
    /** After each post reaches Facebook, send a phone alert to share it to WhatsApp (lib/whatsapp.ts). */
    whatsappShare: true,
    lesson: {
        /** Post this many hours before class starts. */
        leadHours: 6,
        /** Still waiting on you this close to class: send a phone alert. */
        alertHoursBefore: 3,
        /** Still waiting on you this close to class: give up and don't post. */
        expireHoursBefore: 1,
    },
    cancellation: {
        alertHoursBefore: 3,
        /** A cancellation can still go out right up to the start time. */
        expireHoursBefore: 0,
    },
    weekly: {
        /** Local day and time the weekly outline goes out. */
        day: "MO" as const,
        time: "09:00",
        /** Hours after it's queued: phone alert, then give up. */
        alertAfterHours: 3,
        expireAfterHours: 12,
    },
    /**
     * A failed check holds the post for your approval instead of publishing it.
     * Set one to false to stop it holding posts.
     */
    checks: {
        noLessons: true,
        lessonMissingTime: true,
        lessonMissingDance: true,
        danceNotInCatalog: true,
        lessonMissingLink: true,
        lessonMissingLevel: true,
        substituteMissingName: true,
        venueMissing: true,
    } satisfies Record<CheckId, boolean>,
};
