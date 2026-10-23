// What the admin's Post Styles page needs from the poster: the classes with their styles, and previews.

import { renderCard } from "./card";
import { getBldDb, getLessonsDb, getMainDb } from "./db";
import { lessonDraft } from "./drafts";
import { env } from "./env";
import { loadOccurrences, type Occurrence } from "./schedule";
import { DEFAULT_STYLE, loadSavedStyles, PHOTOS, resolveStyle, SUGGESTED_STYLES, THEMES, type PostStyle } from "./styles";
import { addDays, zonedParts } from "./time";

export async function listStyles() {
    const [lessonsDb, mainDb, bldDb] = await Promise.all([getLessonsDb(), getMainDb(), getBldDb()]);
    const links = await lessonsDb.collection("event_instructors").find({ instructorId: env.instructorId() }).toArray();
    const types = await lessonsDb.collection<{ _id: string; title: string; level?: string; venueId?: string; isActive?: boolean }>("event_types")
        .find({ _id: { $in: links.map((l) => l.eventTypeId).filter(Boolean) }, isActive: { $ne: false } }).sort({ title: 1 }).toArray();
    const venues = await mainDb.collection<{ _id: string; venuename?: string }>("venues")
        .find({ _id: { $in: types.map((t) => t.venueId).filter(Boolean) as string[] } }).project({ venuename: 1 }).toArray();
    const saved = await loadSavedStyles(bldDb);
    return {
        themes: Object.entries(THEMES).map(([id, t]) => ({ id, label: t.label, colors: [t.brushFrom, t.brushTo, t.swoosh, t.deep] })),
        photos: Object.entries(PHOTOS).map(([id, p]) => ({ id, label: p.label })),
        defaultStyle: DEFAULT_STYLE,
        eventTypes: types.map((t) => ({
            eventTypeId: t._id, title: t.title, level: t.level ?? null,
            venue: venues.find((v) => v._id === t.venueId)?.venuename ?? null,
            saved: saved.get(t._id) ?? null,
            suggested: SUGGESTED_STYLES[t._id] ?? null,
            effective: resolveStyle(t._id, saved),
        })),
    };
}

const SAMPLE_DANCES = [["Copperhead Road", "Beginner"], ["Cowboy Cha Cha", "Improver"], ["Guillotine", "Intermediate"]] as const;

/** The class's next post drawn with an unsaved style: its real next date, with a sample plan if none yet. */
export async function previewStyle(eventTypeId: string, style: Partial<PostStyle>) {
    const [lessonsDb, mainDb, bldDb] = await Promise.all([getLessonsDb(), getMainDb(), getBldDb()]);
    const tz = env.defaultTimeZone();
    const today = zonedParts(new Date(), tz).ymd;
    const next = (await loadOccurrences(lessonsDb, mainDb, { instructorId: env.instructorId(), defaultTimeZone: tz, from: today, to: addDays(today, 28) }))
        .find((o) => o.eventTypeId === eventTypeId && !o.isCancelled);
    if (!next) throw new Error("This class has nothing on the schedule in the next 4 weeks to preview");

    const planned = (next.lessons ?? []).some((l) => l.dance && !l.skipped);
    const o: Occurrence = planned ? next : {
        ...next,
        lessons: SAMPLE_DANCES.map(([dance, level], i) => ({
            _id: `sample${i}`, startAt: new Date(next.startAt.getTime() + (30 + i * 30) * 60_000),
            dance, danceId: `sample${i}`, level, link: null, committed: false, skipped: false,
        })),
    };
    const saved = await loadSavedStyles(bldDb);
    saved.set(eventTypeId, { ...saved.get(eventTypeId), ...style });
    const draft = lessonDraft(o, env.siteUrl(), resolveStyle(eventTypeId, saved));
    const png = Buffer.from(await (await renderCard(draft.card)).arrayBuffer());
    return { image: `data:image/png;base64,${png.toString("base64")}`, caption: draft.message, samplePlan: !planned };
}
