// Post text and the checks that decide whether it may publish on its own. Pure: no I/O.

import { createHash } from "node:crypto";
import { rules, type CheckId } from "./config";
import { localStartTime, type Occurrence } from "./schedule";
import { formatShortDate, formatTime12, zonedParts } from "./time";

export type PostKind = "lesson" | "cancellation" | "weekly_outline";

/** "planChanged" is added by posts.ts when the plan changes after you approved it. */
export interface Issue { check: CheckId | "planChanged"; message: string }

export interface Draft {
    kind: PostKind;
    message: string;
    /** Failed, enabled checks. Any issue holds the post for approval. */
    issues: Issue[];
    /** Changes whenever the post text changes; approval is tied to it. */
    planHash: string;
}

function hash(s: string): string {
    return createHash("sha1").update(s).digest("hex").slice(0, 16);
}

function finish(kind: PostKind, message: string, all: Issue[]): Draft {
    const issues = all.filter((i) => i.check === "planChanged" || rules.checks[i.check]);
    return { kind, message, issues, planHash: hash(message) };
}

function lessonLabel(o: Occurrence, startAt: Date | null, dance: string | null): string {
    const at = startAt ? formatTime12(zonedParts(startAt, o.timeZone).hhmm) : "(no time)";
    return dance ? `${dance} at ${at}` : `Lesson at ${at}`;
}

/** The pre-class post with the night's lesson plan. */
export function lessonDraft(o: Occurrence, siteUrl: string): Draft {
    const issues: Issue[] = [];
    const lessons = (o.lessons ?? [])
        .filter((l) => !l.skipped)
        .sort((a, b) => (a.startAt?.getTime() ?? Infinity) - (b.startAt?.getTime() ?? Infinity));

    if (!o.venueName) issues.push({ check: "venueMissing", message: "Venue not found" });
    if (lessons.length === 0) issues.push({ check: "noLessons", message: "No lesson plan yet" });
    if (o.substituteInstructorId && !o.substitute?.trim()) {
        issues.push({ check: "substituteMissingName", message: "A substitute is set but has no name" });
    }

    const lines: string[] = [];
    for (const l of lessons) {
        const dance = l.dance?.trim() || null;
        const label = lessonLabel(o, l.startAt, dance);
        if (!l.startAt) issues.push({ check: "lessonMissingTime", message: `${label}: no time set` });
        if (!dance) issues.push({ check: "lessonMissingDance", message: `${label}: no dance chosen` });
        else if (!l.danceId) issues.push({ check: "danceNotInCatalog", message: `${dance} isn't in the dance catalog` });
        if (!l.level?.trim()) issues.push({ check: "lessonMissingLevel", message: `${label}: no level` });
        if (!l.link?.trim()) issues.push({ check: "lessonMissingLink", message: `${label}: no link` });

        const time = l.startAt ? formatTime12(zonedParts(l.startAt, o.timeZone).hhmm) : "TBA";
        const level = l.level?.trim() ? ` (${l.level.trim()})` : "";
        lines.push(`${time} · ${dance ?? "TBA"}${level}`);
        if (l.link?.trim()) lines.push(`   ${l.link.trim()}`);
    }

    const start = localStartTime(o);
    const when = Number(start.slice(0, 2)) >= 17 ? "Tonight" : "Today";
    const where = o.venueName ? ` at ${o.venueName}` : "";
    const details = [o.title, o.level, o.price].filter(Boolean).join(" · ");

    const parts = [
        `${when}'s line dance lessons${where}, starting ${formatTime12(start)} 🤠`,
        details,
        lines.join("\n"),
        o.substitute?.trim() ? `${o.substitute.trim()} is teaching ${when.toLowerCase()}.` : "",
        o.specialNote?.trim() ?? "",
        `Full schedule: ${siteUrl}/calendar`,
    ];
    return finish("lesson", parts.filter(Boolean).join("\n\n"), issues);
}

/** A cancellation notice. Always held for approval (see posts.ts). */
export function cancellationDraft(o: Occurrence, siteUrl: string): Draft {
    const issues: Issue[] = [];
    if (!o.venueName) issues.push({ check: "venueMissing", message: "Venue not found" });
    const where = o.venueName ? ` at ${o.venueName}` : "";
    const parts = [
        `Cancelled: ${o.title}${where} on ${formatShortDate(o.date)} at ${formatTime12(localStartTime(o))}.`,
        o.cancelNote?.trim() ?? "",
        `Sorry for the change! See the rest of this week's classes: ${siteUrl}/calendar`,
    ];
    return finish("cancellation", parts.filter(Boolean).join("\n\n"), issues);
}

/** The Monday outline: times and places only, no lesson details. */
export function weeklyDraft(occurrences: Occurrence[], siteUrl: string): Draft {
    const issues: Issue[] = [];
    const lines = occurrences.map((o) => {
        if (!o.venueName) issues.push({ check: "venueMissing", message: `${o.title} on ${formatShortDate(o.date)}: venue not found` });
        const head = `${formatShortDate(o.date)} · ${formatTime12(localStartTime(o))} · ${o.title}${o.venueName ? ` at ${o.venueName}` : ""}`;
        if (o.isCancelled) return `${head} · CANCELLED${o.cancelNote?.trim() ? ` (${o.cancelNote.trim()})` : ""}`;
        const extras = [o.level, o.price].filter(Boolean).join(" · ");
        const sub = o.substitute?.trim() ? ` · Sub: ${o.substitute.trim()}` : "";
        return `${head}${extras ? ` (${extras})` : ""}${sub}`;
    });
    const message = [
        "This week's line dance classes 🤠",
        lines.length ? lines.join("\n") : "No classes this week.",
        "Lesson plans go up a few hours before each class.",
        `Full schedule: ${siteUrl}/calendar`,
    ].join("\n\n");
    return finish("weekly_outline", message, issues);
}
