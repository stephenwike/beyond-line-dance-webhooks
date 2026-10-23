// Post text, image card data, and the checks that decide whether a post may publish on its own.
// Pure: no I/O.

import { createHash } from "node:crypto";
import { brand, rules, type CheckId } from "./config";
import { localStartTime, type Occurrence } from "./schedule";
import { DEFAULT_STYLE, fillStyleText, TYPE_DEFAULTS, type PhotoId, type PostStyle, type ThemeId } from "./styles";
import { formatLongDate, formatShortDate, formatTime12, zonedParts } from "./time";

/** "test" posts come from scripts/e2e-test.ts and always publish hidden. */
export type PostKind = "lesson" | "cancellation" | "weekly_outline" | "test";

/** "planChanged" is added by posts.ts when the plan changes after you approved it; "test" holds e2e test posts. */
export interface Issue { check: CheckId | "planChanged" | "test"; message: string }

export interface CardLesson { time: string; dance: string; level: string | null }
export interface CardClass { time: string; title: string; venue: string | null; detail: string; cancelled: boolean; substitute: string | null }

/** The class's style, resolved for this post (lib/styles.ts). Absent on posts drafted before styles. */
export interface CardStyle { theme: ThemeId; photo: PhotoId; headline: string; cta: string }

/** What the image shows (lib/card.tsx draws it). */
export type CardData = (
    | {
        type: "lesson"; when: "Tonight" | "Today"; date: string; title: string; venue: string | null; startTime: string;
        /** For the WhatsApp event card (lib/eventCard.tsx); absent on older posts. */
        ymd?: string; endTime?: string | null; address?: string | null; note?: string | null;
        level: string | null; price: string | null; lessons: CardLesson[]; substitute: string | null;
    }
    | {
        type: "cancellation"; date: string; title: string; venue: string | null; startTime: string; note: string | null;
        ymd?: string; endTime?: string | null; address?: string | null; level?: string | null; price?: string | null;
    }
    | { type: "weekly"; eyebrow: string; range: string; days: { day: string; ymd?: string; classes: CardClass[] }[] }
) & { style?: CardStyle };

export interface Draft {
    kind: PostKind;
    message: string;
    card: CardData;
    /** Failed, enabled checks. Any issue holds the post for approval. */
    issues: Issue[];
    /** Changes whenever the post text or image changes; approval is tied to it. */
    planHash: string;
}

function hash(s: string): string {
    return createHash("sha1").update(s).digest("hex").slice(0, 16);
}

function finish(kind: PostKind, message: string, card: CardData, all: Issue[]): Draft {
    const issues = all.filter((i) => i.check === "planChanged" || i.check === "test" || rules.checks[i.check]);
    return { kind, message, card, issues, planHash: hash(message + JSON.stringify(card)) };
}

function join(...parts: (string | null | undefined | false)[]): string {
    return parts.filter(Boolean).join("\n\n");
}

/** Brand hashtags, then the styles' own, without repeats. */
const hashtags = (...styles: PostStyle[]) => [...new Set([...brand.hashtags, ...styles.flatMap((s) => s.hashtags)])].join(" ");

/** "2026-10-26" → "MONDAY OCT 26", the image's date line. */
const cardDate = (ymd: string) => formatLongDate(ymd).replace(",", "").toUpperCase();

/** "8:00 PM", or null when the class's end isn't known. */
function endTimeOf(o: Occurrence): string | null {
    return o.endAt ? formatTime12(zonedParts(o.endAt, o.timeZone).hhmm) : null;
}

function lessonLabel(o: Occurrence, startAt: Date | null, dance: string | null): string {
    const at = startAt ? formatTime12(zonedParts(startAt, o.timeZone).hhmm) : "(no time)";
    return dance ? `${dance} at ${at}` : `Lesson at ${at}`;
}

/** The pre-class post with the night's lesson plan. */
export function lessonDraft(o: Occurrence, siteUrl: string, style: PostStyle = DEFAULT_STYLE): Draft {
    const issues: Issue[] = [];
    const lessons = (o.lessons ?? [])
        .filter((l) => !l.skipped)
        .sort((a, b) => (a.startAt?.getTime() ?? Infinity) - (b.startAt?.getTime() ?? Infinity));

    if (!o.venueName) issues.push({ check: "venueMissing", message: "Venue not found" });
    if (lessons.length === 0) issues.push({ check: "noLessons", message: "No lesson plan yet" });
    if (o.substituteInstructorId && !o.substitute?.trim()) {
        issues.push({ check: "substituteMissingName", message: "A substitute is set but has no name" });
    }

    const cardLessons: CardLesson[] = [];
    const lessonLines: string[] = [];
    const stepsheets: string[] = [];
    for (const l of lessons) {
        const dance = l.dance?.trim() || null;
        const label = lessonLabel(o, l.startAt, dance);
        if (!l.startAt) issues.push({ check: "lessonMissingTime", message: `${label}: no time set` });
        if (!dance) issues.push({ check: "lessonMissingDance", message: `${label}: no dance chosen` });
        else if (!l.danceId) issues.push({ check: "danceNotInCatalog", message: `${dance} isn't in the dance catalog` });
        if (!l.level?.trim()) issues.push({ check: "lessonMissingLevel", message: `${label}: no level` });
        if (!l.link?.trim()) issues.push({ check: "lessonMissingLink", message: `${label}: no link` });

        const time = l.startAt ? formatTime12(zonedParts(l.startAt, o.timeZone).hhmm) : "TBA";
        const level = l.level?.trim() || null;
        cardLessons.push({ time, dance: dance ?? "TBA", level });
        lessonLines.push(`${time}  ${dance ?? "TBA"}${level ? ` · ${level}` : ""}`);
        if (dance && l.link?.trim()) stepsheets.push(`${dance}: ${l.link.trim()}`);
    }

    const start = formatTime12(localStartTime(o));
    const when = Number(localStartTime(o).slice(0, 2)) >= 17 ? "tonight" : "today";
    const sub = o.substitute?.trim() || null;

    const message = join(
        fillStyleText(style.hook, when, o.venueName, o.title),
        `${o.title} · starts ${start}\n${[o.level, o.price, brand.welcome].filter(Boolean).join(" · ")}`,
        lessonLines.length > 0 && `🎶 What we're learning:\n${lessonLines.join("\n")}`,
        sub && `👋 ${sub} is teaching ${when}.`,
        o.specialNote?.trim() && `📣 ${o.specialNote.trim()}`,
        (o.venueName || o.venueAddress) && `📍 ${[o.venueName, o.venueAddress].filter(Boolean).join(", ")}`,
        stepsheets.length > 0 && `📄 Step sheets:\n${stepsheets.join("\n")}`,
        `📅 Full schedule: ${siteUrl}/calendar`,
        hashtags(style),
    );
    const card: CardData = {
        type: "lesson", when: when === "tonight" ? "Tonight" : "Today", date: cardDate(o.date),
        title: o.title, venue: o.venueName, startTime: start,
        level: o.level, price: o.price, lessons: cardLessons, substitute: sub,
        ymd: o.date, endTime: endTimeOf(o), address: o.venueAddress, note: o.specialNote?.trim() || null,
        style: { theme: style.theme, photo: style.photo, headline: fillStyleText(style.headline, when, o.venueName), cta: fillStyleText(style.cta, when, o.venueName) },
    };
    return finish("lesson", message, card, issues);
}

/**
 * A cancellation notice. Always held for approval (see posts.ts). The cancellation style sets the wording;
 * the look is the class's (classStyle) unless the cancellation style turns matchClass off.
 */
export function cancellationDraft(o: Occurrence, siteUrl: string, classStyle: PostStyle = DEFAULT_STYLE, style: PostStyle = TYPE_DEFAULTS.cancellation): Draft {
    const issues: Issue[] = [];
    if (!o.venueName) issues.push({ check: "venueMissing", message: "Venue not found" });
    const start = formatTime12(localStartTime(o));
    const note = o.cancelNote?.trim() || null;
    const when = Number(localStartTime(o).slice(0, 2)) >= 17 ? "tonight" : "today";
    const look = style.matchClass === false ? style : classStyle;
    const message = join(
        fillStyleText(style.hook, when, o.venueName, o.title),
        `${formatLongDate(o.date)} at ${start}`,
        note,
        "Sorry for the change, we'll see you at the next one! 💜",
        `📅 This week's other classes: ${siteUrl}/calendar`,
        hashtags(classStyle, style),
    );
    const card: CardData = {
        type: "cancellation", date: cardDate(o.date),
        title: o.title, venue: o.venueName, startTime: start, note,
        ymd: o.date, endTime: endTimeOf(o), address: o.venueAddress, level: o.level, price: o.price,
        style: { theme: look.theme, photo: look.photo, headline: "Cancelled", cta: fillStyleText(style.cta, when, o.venueName, o.title) },
    };
    return finish("cancellation", message, card, issues);
}

/** The Monday outline: times and places only, no lesson details. */
export function weeklyDraft(occurrences: Occurrence[], siteUrl: string, style: PostStyle = TYPE_DEFAULTS.weekly_outline): Draft {
    const issues: Issue[] = [];
    const byDay = new Map<string, Occurrence[]>();
    for (const o of occurrences) {
        if (!o.venueName) issues.push({ check: "venueMissing", message: `${o.title} on ${formatShortDate(o.date)}: venue not found` });
        byDay.set(o.date, [...(byDay.get(o.date) ?? []), o]);
    }

    const days = [...byDay.entries()].map(([date, list]) => ({
        day: formatShortDate(date).toUpperCase(),
        ymd: date,
        classes: list.map((o): CardClass => ({
            time: formatTime12(localStartTime(o)), title: o.title, venue: o.venueName,
            detail: [o.level, o.price].filter(Boolean).join(" · "),
            cancelled: o.isCancelled, substitute: o.substitute?.trim() || null,
        })),
    }));

    const blocks = days.map(({ day, classes }) => `${day}\n${classes.map((c) => {
        const line = `${c.time} · ${c.title}${c.venue ? ` @ ${c.venue}` : ""}`;
        if (c.cancelled) return `${line} · CANCELLED`;
        return `${line}${c.detail ? ` · ${c.detail}` : ""}${c.substitute ? ` · Sub: ${c.substitute}` : ""}`;
    }).join("\n")}`);

    const dates = occurrences.map((o) => o.date).sort();
    const range = dates.length ? `${formatLongDate(dates[0], true)} – ${formatLongDate(dates[dates.length - 1], true)}` : "";
    const message = join(
        style.hook,
        blocks.length ? blocks.join("\n\n") : "No classes this week.",
        `${brand.welcome}, everyone is welcome! Lesson plans post a few hours before each class.`,
        `📅 Full schedule: ${siteUrl}/calendar`,
        hashtags(style),
    );
    const card: CardData = {
        type: "weekly", eyebrow: "THIS WEEK", range, days,
        style: { theme: style.theme, photo: style.photo, headline: style.headline, cta: style.cta },
    };
    return finish("weekly_outline", message, card, issues);
}
