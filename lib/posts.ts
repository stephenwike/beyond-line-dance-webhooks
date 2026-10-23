// The social_posts lifecycle. Every cron tick: draft posts that are due, keep held ones in step with
// the plan, then publish, alert or expire. The admin's Social Posts page approves or skips held posts.
//
//   pending ──(no issues, not a cancellation)──▶ publishing ──▶ published | failed
//      │  └──(you approve)──▶ approved ──────────────▲
//      │                        └─(plan changed since)─▶ back to pending
//      ├──(alertAt, still pending)──▶ phone alert (once)
//      └──(expireAt, still pending)──▶ expired      (you can also skip it: skipped)

import { ObjectId, type Collection, type Db } from "mongodb";
import { rules } from "./config";
import { cancellationDraft, lessonDraft, weeklyDraft, type Draft, type Issue, type PostKind } from "./drafts";
import { getBldDb, getLessonsDb, getMainDb } from "./db";
import { env } from "./env";
import { publishToPage } from "./facebook";
import { sendPhoneAlert } from "./notify";
import { loadOccurrences, localStartTime, type Occurrence } from "./schedule";
import { addDays, formatShortDate, formatTime12, mondayOf, zonedParts } from "./time";

export type PostStatus = "pending" | "approved" | "publishing" | "published" | "skipped" | "expired" | "failed";

export interface SocialPost {
    _id: string;
    /** Unique: `lesson:<occurrence key>`, `cancellation:<occurrence key>` or `weekly_outline:<monday>`. */
    key: string;
    kind: PostKind;
    eventTypeId: string | null;
    eventId: string | null;
    /** Local YYYY-MM-DD of the class, or the Monday of the week. */
    date: string;
    /** Class start; null for the weekly outline. */
    startAt: Date | null;
    /** Short label for lists and alerts. */
    label: string;
    status: PostStatus;
    message: string;
    /** Your edited text, set when you approve; published instead of message. */
    editedMessage: string | null;
    issues: Issue[];
    planHash: string;
    approvedPlanHash: string | null;
    alertAt: Date;
    expireAt: Date;
    alertedAt: Date | null;
    fbPostId: string | null;
    publishedAt: Date | null;
    error: string | null;
    note: string | null;
    /** Publish unpublished (e2e test posts). */
    hidden?: boolean;
    decidedBy: string | null;
    decidedAt: Date | null;
    createdAt: Date;
    updatedAt: Date;
}

const OPEN: PostStatus[] = ["pending", "approved"];
const HOUR = 3_600_000;

export type Step = "publish" | "alert" | "expire" | "reopen" | "none";

/** What a tick should do with an open post. Pure, so the rules are easy to test. */
export function nextStep(p: Pick<SocialPost, "kind" | "status" | "issues" | "planHash" | "approvedPlanHash" | "alertAt" | "expireAt" | "alertedAt" | "startAt">, now: Date): Step {
    if (p.status === "approved") {
        if (p.planHash !== p.approvedPlanHash) return "reopen";
        if (p.startAt && now >= p.startAt) return "expire";
        return "publish";
    }
    if (p.status !== "pending") return "none";
    if (now >= p.expireAt) return "expire";
    if (p.issues.length === 0 && p.kind !== "cancellation") return "publish";
    if (now >= p.alertAt && !p.alertedAt) return "alert";
    return "none";
}

export function posts(db: Db): Collection<SocialPost> {
    return db.collection<SocialPost>("social_posts");
}

let indexesReady = false;
async function ensureIndexes(col: Collection<SocialPost>) {
    if (indexesReady) return;
    await col.createIndex({ key: 1 }, { unique: true });
    await col.createIndex({ status: 1, expireAt: 1 });
    indexesReady = true;
}

function occurrenceLabel(o: Occurrence): string {
    return `${o.title}${o.venueName ? ` at ${o.venueName}` : ""}, ${formatShortDate(o.date)} ${formatTime12(localStartTime(o))}`;
}

/** Create the post if it's new; refresh its text and checks if it's still open. */
async function upsertDraft(
    col: Collection<SocialPost>, now: Date,
    base: Pick<SocialPost, "key" | "eventTypeId" | "eventId" | "date" | "startAt" | "label" | "alertAt" | "expireAt">,
    draft: Draft,
): Promise<"created" | "refreshed" | "unchanged"> {
    const existing = await col.findOne({ key: base.key });
    if (!existing) {
        try {
            await col.insertOne({
                _id: new ObjectId().toHexString(), ...base,
                kind: draft.kind, status: "pending", message: draft.message, editedMessage: null,
                issues: draft.issues, planHash: draft.planHash, approvedPlanHash: null,
                alertedAt: null, fbPostId: null, publishedAt: null, error: null, note: null,
                decidedBy: null, decidedAt: null, createdAt: now, updatedAt: now,
            });
            return "created";
        } catch (e) {
            if ((e as { code?: number }).code === 11000) return "unchanged"; // another tick won the race
            throw e;
        }
    }
    if (!OPEN.includes(existing.status) || existing.planHash === draft.planHash) return "unchanged";
    await col.updateOne({ _id: existing._id, status: { $in: OPEN } }, {
        $set: { message: draft.message, issues: draft.issues, planHash: draft.planHash, label: base.label, startAt: base.startAt, updatedAt: now },
    });
    return "refreshed";
}

async function closeOpen(col: Collection<SocialPost>, filter: object, status: PostStatus, note: string, now: Date) {
    await col.updateMany({ ...filter, status: { $in: OPEN } }, { $set: { status, note, updatedAt: now } });
}

/** Claim and publish one post. Only posts in `from` are claimed, so two callers can't both publish it. */
export async function publishPost(col: Collection<SocialPost>, id: string, from: PostStatus[], now = new Date()): Promise<SocialPost | null> {
    const claimed = await col.findOneAndUpdate(
        { _id: id, status: { $in: from } },
        { $set: { status: "publishing", updatedAt: now } },
        { returnDocument: "after" },
    );
    if (!claimed) return null;
    try {
        const fbPostId = await publishToPage(claimed.editedMessage ?? claimed.message, { hidden: claimed.hidden });
        await col.updateOne({ _id: id }, { $set: { status: "published", fbPostId, publishedAt: new Date(), error: null, updatedAt: new Date() } });
    } catch (e) {
        const error = e instanceof Error ? e.message : String(e);
        await col.updateOne({ _id: id }, { $set: { status: "failed", error, updatedAt: new Date() } });
        await sendPhoneAlert({
            title: "Facebook post failed",
            message: `${claimed.label}: ${error}`,
            url: adminLink(id), urlTitle: "Open Social Posts", urgent: true,
        }).catch((err) => console.error("Alert failed", err));
    }
    return col.findOne({ _id: id });
}

function adminLink(id: string): string | undefined {
    const base = env.adminUrl();
    return base ? `${base}/social-posts?id=${id}` : undefined;
}

export interface TickReport { created: number; refreshed: number; published: number; alerted: number; expired: number; reopened: number; skipped: number; errors: string[] }

export async function tick(now = new Date()): Promise<TickReport> {
    const [lessonsDb, mainDb, bldDb] = await Promise.all([getLessonsDb(), getMainDb(), getBldDb()]);
    const col = posts(bldDb);
    await ensureIndexes(col);

    const report: TickReport = { created: 0, refreshed: 0, published: 0, alerted: 0, expired: 0, reopened: 0, skipped: 0, errors: [] };
    const count = (r: "created" | "refreshed" | "unchanged") => { if (r !== "unchanged") report[r]++; };

    const tz = env.defaultTimeZone();
    const local = zonedParts(now, tz);
    const monday = mondayOf(local.ymd);
    const occurrences = await loadOccurrences(lessonsDb, mainDb, {
        instructorId: env.instructorId(), defaultTimeZone: tz,
        from: addDays(local.ymd, -1), to: addDays(monday, 7),
    });
    const siteUrl = env.siteUrl();

    // 1. Pre-class posts that are due.
    const leadMs = rules.lesson.leadHours * HOUR;
    const dueKeys = new Set<string>();
    for (const o of occurrences) {
        const start = o.startAt.getTime();
        if (start <= now.getTime() || start - leadMs > now.getTime()) continue;

        const kind: PostKind = o.isCancelled ? "cancellation" : "lesson";
        const r = kind === "lesson" ? rules.lesson : rules.cancellation;
        const expireAt = new Date(start - r.expireHoursBefore * HOUR);
        const key = `${kind}:${o.key}`;
        dueKeys.add(key);
        if (o.isCancelled) {
            await closeOpen(col, { key: `lesson:${o.key}` }, "skipped", "The class was cancelled", now);
        }
        if (now >= expireAt) continue;

        const draft = kind === "lesson" ? lessonDraft(o, siteUrl) : cancellationDraft(o, siteUrl);
        count(await upsertDraft(col, now, {
            key, eventTypeId: o.eventTypeId, eventId: o.eventId, date: o.date, startAt: o.startAt,
            label: occurrenceLabel(o), alertAt: new Date(start - r.alertHoursBefore * HOUR), expireAt,
        }, draft));
    }

    // 2. Open class posts whose class has left the schedule (switched off, moved, deleted).
    const gone = await col.find({
        kind: { $in: ["lesson", "cancellation"] }, status: { $in: OPEN },
        startAt: { $gt: now, $lte: new Date(now.getTime() + leadMs) },
    }).toArray();
    for (const p of gone.filter((p) => !dueKeys.has(p.key))) {
        await closeOpen(col, { _id: p._id }, "skipped", "No longer on the schedule", now);
        report.skipped++;
    }

    // 3. The weekly outline.
    if (local.dow === rules.weekly.day && local.hhmm >= rules.weekly.time) {
        const week = occurrences.filter((o) => o.date >= monday && o.date <= addDays(monday, 6));
        const createdAt = (await col.findOne({ key: `weekly_outline:${monday}` }))?.createdAt ?? now;
        count(await upsertDraft(col, now, {
            key: `weekly_outline:${monday}`, eventTypeId: null, eventId: null, date: monday, startAt: null,
            label: `Week of ${formatShortDate(monday)}`,
            alertAt: new Date(createdAt.getTime() + rules.weekly.alertAfterHours * HOUR),
            expireAt: new Date(createdAt.getTime() + rules.weekly.expireAfterHours * HOUR),
        }, weeklyDraft(week, siteUrl)));
    }

    // 4. Act on everything still open.
    for (const p of await col.find({ status: { $in: OPEN } }).toArray()) {
        try {
            const step = nextStep(p, now);
            if (step === "publish") {
                const done = await publishPost(col, p._id, [p.status], now);
                if (done?.status === "published") report.published++;
                else if (done?.status === "failed") report.errors.push(`${p.label}: ${done.error}`);
            } else if (step === "reopen") {
                await col.updateOne({ _id: p._id, status: "approved" }, {
                    $set: {
                        status: "pending", approvedPlanHash: null, editedMessage: null, updatedAt: now,
                        issues: [...p.issues, { check: "planChanged", message: "The plan changed after you approved it" }],
                    },
                });
                report.reopened++;
            } else if (step === "expire") {
                await closeOpen(col, { _id: p._id }, "expired", "Not approved in time, so it wasn't posted", now);
                report.expired++;
            } else if (step === "alert") {
                const reasons = p.kind === "cancellation" ? ["Cancellations always need your OK"] : p.issues.map((i) => i.message);
                const by = formatTime12(zonedParts(p.expireAt, tz).hhmm);
                const sent = await sendPhoneAlert({
                    title: "Facebook post waiting on you",
                    message: `${p.label}\n${reasons.join("\n")}\nIt won't be posted unless you approve it by ${by}.`,
                    url: adminLink(p._id), urlTitle: "Review post", urgent: true,
                });
                await col.updateOne({ _id: p._id }, { $set: { alertedAt: now, updatedAt: now, ...(sent ? {} : { note: "No phone alert channel configured" }) } });
                report.alerted++;
            }
        } catch (e) {
            report.errors.push(`${p.label}: ${e instanceof Error ? e.message : String(e)}`);
        }
    }

    return report;
}
