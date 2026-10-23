// Read-only: the next 7 days of classes and what the poster will do with each. Writes nothing.
// Usage: pnpm preview            (against MONGODB_URI in .env.local)
//        MONGODB_URI=<live uri> pnpm preview   (against live; a set variable wins over .env.local)

import { rules } from "../lib/config";
import { closeDb, getLessonsDb, getMainDb } from "../lib/db";
import { lessonDraft } from "../lib/drafts";
import { env } from "../lib/env";
import { loadOccurrences, localStartTime } from "../lib/schedule";
import { addDays, formatShortDate, formatTime12, zonedParts } from "../lib/time";

async function main() {
    const tz = env.defaultTimeZone();
    const today = zonedParts(new Date(), tz).ymd;
    const occurrences = await loadOccurrences(await getLessonsDb(), await getMainDb(), {
        instructorId: env.instructorId(), defaultTimeZone: tz, from: today, to: addDays(today, 7),
    });

    for (const o of occurrences) {
        const postAt = zonedParts(new Date(o.startAt.getTime() - rules.lesson.leadHours * 3_600_000), o.timeZone);
        const issues = lessonDraft(o, env.siteUrl()).issues;
        const fate = o.isCancelled ? "cancellation, waits for your OK"
            : issues.length ? `held: ${issues.map((i) => i.message).join("; ")}`
            : "posts on its own";
        console.log(`${formatShortDate(o.date)} ${formatTime12(localStartTime(o))}  ${o.title} at ${o.venueName ?? "?"}`);
        console.log(`    drafted ${formatShortDate(postAt.ymd)} ${formatTime12(postAt.hhmm)} → ${fate}`);
    }
    console.log(`\n${occurrences.length} classes in the next 7 days`);
    await closeDb();
}

main().catch(async (e) => { console.error(e); await closeDb(); process.exit(1); });
