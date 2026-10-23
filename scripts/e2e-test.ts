// End-to-end test of the deployed poster, against live data. Test posts publish to Facebook *hidden*
// (unpublished: never on the Page or in feeds), even while FACEBOOK_PUBLISH is dry-run.
//
//   MONGODB_URI=<live> pnpm e2e              held test post → phone alert → shows on Social Posts →
//                                            you click Approve & publish → hidden Facebook post
//   MONGODB_URI=<live> pnpm e2e -- --auto    test post with nothing missing → production publishes it hidden
//   MONGODB_URI=<live> pnpm e2e -- --cleanup delete the hidden Facebook posts and the test documents
//
// Uses CRON_SECRET from .env.local (same value as in Vercel). PROD_URL defaults to the Vercel URL.

import { ObjectId } from "mongodb";
import { closeDb, getBldDb, getLessonsDb, getMainDb } from "../lib/db";
import { lessonDraft } from "../lib/drafts";
import { env } from "../lib/env";
import { deletePost } from "../lib/facebook";
import { posts, type SocialPost } from "../lib/posts";
import { loadOccurrences, type Occurrence } from "../lib/schedule";
import { loadSavedStyles, resolveStyle } from "../lib/styles";
import { addDays, formatShortDate, formatTime12, zonedParts } from "../lib/time";

const PROD_URL = (process.env.PROD_URL || "https://beyond-line-dance-webhooks.vercel.app").replace(/\/$/, "");
const args = process.argv.slice(2);

/** The next class, with a sample plan if it has none, so the preview looks like a real post. */
async function sampleOccurrence(): Promise<Occurrence> {
    const tz = env.defaultTimeZone();
    const today = zonedParts(new Date(), tz).ymd;
    const all = await loadOccurrences(await getLessonsDb(), await getMainDb(), {
        instructorId: env.instructorId(), defaultTimeZone: tz, from: today, to: addDays(today, 14),
    });
    const upcoming = all.filter((o) => o.startAt > new Date() && !o.isCancelled);
    const planned = upcoming.find((o) => (o.lessons ?? []).some((l) => l.dance && !l.skipped));
    if (planned) return planned;
    const o = upcoming[0];
    if (!o) throw new Error("No upcoming classes in the next 14 days");
    const at = (min: number) => new Date(o.startAt.getTime() + min * 60_000);
    const sample = (i: number, dance: string, level: string, link: string) => ({
        _id: `sample${i}`, startAt: at(i * 30), dance, danceId: `sample${i}`, level, link, committed: false, skipped: false,
    });
    return {
        ...o, lessons: [
            sample(0, "Copperhead Road", "Beginner", "https://www.copperknob.co.uk/stepsheets/50358/copperhead-road"),
            sample(1, "Cowboy Cha Cha", "Beginner", "https://www.copperknob.co.uk/stepsheets/35427/cowboy-cha-cha"),
        ],
    };
}

async function tickProduction() {
    const res = await fetch(`${PROD_URL}/api/cron/tick`, { headers: { Authorization: `Bearer ${process.env.CRON_SECRET}` } });
    console.log(`Production tick: HTTP ${res.status}`, await res.text());
}

async function create(auto: boolean) {
    const col = posts(await getBldDb());
    const o = await sampleOccurrence();
    const draft = lessonDraft(o, env.siteUrl(), resolveStyle(o.eventTypeId, await loadSavedStyles(await getBldDb())));
    const now = new Date();
    const id = new ObjectId().toHexString();
    const doc: SocialPost = {
        _id: id, key: `test:${id}`, kind: "test", eventTypeId: o.eventTypeId, eventId: o.eventId, date: o.date,
        startAt: null,
        label: `TEST · ${o.title}${o.venueName ? ` at ${o.venueName}` : ""}, ${formatShortDate(o.date)} ${formatTime12(zonedParts(o.startAt, o.timeZone).hhmm)}`,
        status: "pending", message: draft.message, card: draft.card, editedMessage: null,
        issues: auto ? [] : [{ check: "test", message: "Test post: Approve & publish creates a hidden Facebook post (not on your Page or in feeds)" }],
        planHash: draft.planHash, approvedPlanHash: null,
        alertAt: now, expireAt: new Date(now.getTime() + 2 * 3_600_000), alertedAt: null,
        fbPostId: null, publishedAt: null, error: null, note: null, hidden: true,
        decidedBy: null, decidedAt: null, createdAt: now, updatedAt: now,
    };
    await col.insertOne(doc);
    console.log(`Created ${auto ? "auto" : "held"} test post ${id}:\n\n${draft.message}\n`);

    await tickProduction();
    const after = await col.findOne({ _id: id });
    console.log(`\nStatus now: ${after?.status}` +
        (after?.alertedAt ? " · phone alert sent" : "") +
        (after?.fbPostId ? ` · Facebook post ${after.fbPostId}` : "") +
        (after?.error ? ` · error: ${after.error}` : ""));
    if (env.adminUrl()) console.log(`Admin: ${env.adminUrl()}/social-posts?id=${id}`);
    if (after?.fbPostId) console.log(`Hidden post: https://www.facebook.com/${after.fbPostId}`);
}

async function cleanup() {
    const col = posts(await getBldDb());
    const tests = await col.find({ kind: "test" }).toArray();
    for (const t of tests) {
        if (t.fbPostId && !t.fbPostId.startsWith("dry-run")) {
            try { await deletePost(t.fbPostId); console.log(`Deleted Facebook post ${t.fbPostId}`); }
            catch (e) { console.log(`Couldn't delete Facebook post ${t.fbPostId}: ${e instanceof Error ? e.message : e}`); }
        }
    }
    const r = await col.deleteMany({ kind: "test" });
    console.log(`Deleted ${r.deletedCount} test post document(s)`);
}

async function main() {
    if (!process.env.CRON_SECRET) throw new Error("CRON_SECRET is not set");
    if (args.includes("--cleanup")) await cleanup();
    else await create(args.includes("--auto"));
    await closeDb();
}

main().catch(async (e) => { console.error(e); await closeDb(); process.exit(1); });
