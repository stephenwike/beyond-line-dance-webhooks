// What the admin's Ads page needs from the poster: every style (per class and per ad type), and previews.

import { renderCard } from "./card";
import { getBldDb, getLessonsDb, getMainDb } from "./db";
import { cancellationDraft, lessonDraft, weeklyDraft } from "./drafts";
import { env } from "./env";
import { loadOccurrences, type Occurrence } from "./schedule";
import {
    DEFAULT_STYLE, loadSavedStyles, PHOTOS, resolveStyle, resolveTypeStyle, SUGGESTED_STYLES, THEMES, TYPE_DEFAULTS,
    type AdType, type PostStyle,
} from "./styles";
import { addDays, mondayOf, zonedParts } from "./time";

export async function listStyles() {
    const [lessonsDb, mainDb, bldDb] = await Promise.all([getLessonsDb(), getMainDb(), getBldDb()]);
    const links = await lessonsDb.collection("event_instructors").find({ instructorId: env.instructorId() }).toArray();
    const types = await lessonsDb.collection<{ _id: string; title: string; level?: string; venueId?: string; isActive?: boolean }>("event_types")
        .find({ _id: { $in: links.map((l) => l.eventTypeId).filter(Boolean) }, isActive: { $ne: false } }).sort({ title: 1 }).toArray();
    const venues = await mainDb.collection<{ _id: string; venuename?: string }>("venues")
        .find({ _id: { $in: types.map((t) => t.venueId).filter(Boolean) as string[] } }).project({ venuename: 1 }).toArray();
    const saved = await loadSavedStyles(bldDb);
    const adType = (type: AdType) => ({ saved: saved.get(`type:${type}`) ?? null, defaults: TYPE_DEFAULTS[type], effective: resolveTypeStyle(type, saved) });
    return {
        // palette lets the admin draw a small sample card per theme.
        themes: Object.entries(THEMES).map(([id, t]) => ({ id, label: t.label, colors: [t.brushFrom, t.brushTo, t.swoosh, t.deep], palette: t })),
        photos: Object.entries(PHOTOS).map(([id, p]) => ({ id, label: p.label })),
        defaultStyle: DEFAULT_STYLE,
        eventTypes: types.map((t) => ({
            eventTypeId: t._id, title: t.title, level: t.level ?? null,
            venue: venues.find((v) => v._id === t.venueId)?.venuename ?? null,
            saved: saved.get(t._id) ?? null,
            suggested: SUGGESTED_STYLES[t._id] ?? null,
            effective: resolveStyle(t._id, saved),
        })),
        adTypes: { cancellation: adType("cancellation"), weekly_outline: adType("weekly_outline") },
    };
}

const SAMPLE_DANCES = [["Copperhead Road", "Beginner"], ["Cowboy Cha Cha", "Improver"], ["Guillotine", "Intermediate"]] as const;

export type PreviewKind = "lesson" | AdType;

/**
 * An ad drawn with an unsaved style, from real schedule data: a class's next post (with sample dances
 * if it has no plan yet), that class cancelled (with a sample note), or this week's schedule.
 */
export async function previewAd(kind: PreviewKind, eventTypeId: string | null, style: Partial<PostStyle>) {
    const [lessonsDb, mainDb, bldDb] = await Promise.all([getLessonsDb(), getMainDb(), getBldDb()]);
    const tz = env.defaultTimeZone();
    const today = zonedParts(new Date(), tz).ymd;
    const saved = await loadSavedStyles(bldDb);
    const siteUrl = env.siteUrl();
    const render = async (draft: ReturnType<typeof lessonDraft>, note: string | null) => ({
        image: `data:image/png;base64,${Buffer.from(await (await renderCard(draft.card)).arrayBuffer()).toString("base64")}`,
        caption: draft.message, note,
    });

    if (kind === "weekly_outline") {
        const monday = mondayOf(today);
        const week = await loadOccurrences(lessonsDb, mainDb, { instructorId: env.instructorId(), defaultTimeZone: tz, from: monday, to: addDays(monday, 6) });
        saved.set("type:weekly_outline", { ...saved.get("type:weekly_outline"), ...style });
        return render(weeklyDraft(week, siteUrl, resolveTypeStyle("weekly_outline", saved)), "This week's real schedule.");
    }

    const upcoming = (await loadOccurrences(lessonsDb, mainDb, { instructorId: env.instructorId(), defaultTimeZone: tz, from: today, to: addDays(today, 28) }))
        .filter((o) => !o.isCancelled && o.eventTypeId);
    const next = eventTypeId ? upcoming.find((o) => o.eventTypeId === eventTypeId) : upcoming[0];
    if (!next) throw new Error("Nothing on the schedule in the next 4 weeks to preview");

    if (kind === "cancellation") {
        saved.set("type:cancellation", { ...saved.get("type:cancellation"), ...style });
        const o: Occurrence = { ...next, isCancelled: true, cancelNote: next.cancelNote ?? "Sample note: the venue is closed for a private event." };
        return render(cancellationDraft(o, siteUrl, resolveStyle(next.eventTypeId, saved), resolveTypeStyle("cancellation", saved)), `Sample cancellation of ${next.title}.`);
    }

    const planned = (next.lessons ?? []).some((l) => l.dance && !l.skipped);
    const o: Occurrence = planned ? next : {
        ...next,
        lessons: SAMPLE_DANCES.map(([dance, level], i) => ({
            _id: `sample${i}`, startAt: new Date(next.startAt.getTime() + (30 + i * 30) * 60_000),
            dance, danceId: `sample${i}`, level, link: null, committed: false, skipped: false,
        })),
    };
    saved.set(next.eventTypeId!, { ...saved.get(next.eventTypeId!), ...style });
    return render(lessonDraft(o, siteUrl, resolveStyle(next.eventTypeId, saved)), planned ? null : "The next class has no plan yet, so this uses sample dances.");
}
