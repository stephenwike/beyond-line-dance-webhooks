// Renders sample cards to PNG files so the design can be checked without posting anything.
// Usage: pnpm render-cards [outDir]   (default: ./card-previews)

import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { renderCard } from "../lib/card";
import { renderEventCard } from "../lib/eventCard";
import { cancellationDraft, lessonDraft, weeklyDraft } from "../lib/drafts";
import { lesson, occurrence } from "../lib/fixtures";
import { resolveStyle, SUGGESTED_STYLES } from "../lib/styles";

const SITE = "https://beyondlinedance.com";
const at = (iso: string) => new Date(iso);

async function main() {
    const out = process.argv.slice(2).find((a) => a !== "--") ?? "card-previews";
    await mkdir(out, { recursive: true });

    const planned = occurrence({
        title: "Charlies Country", level: "All Levels", price: "FREE", startAt: at("2026-10-26T23:00:00Z"), date: "2026-10-26",
        lessons: [
            lesson({ _id: "a", startAt: at("2026-10-26T23:30:00Z"), dance: "Guillotine", level: "Advanced Phrased" }),
            lesson({ _id: "b", startAt: at("2026-10-27T00:00:00Z"), dance: "Copperhead Road", level: "Beginner" }),
            lesson({ _id: "c", startAt: at("2026-10-27T00:30:00Z"), dance: "Cowboy Cha Cha", level: "Improver" }),
        ],
    });
    const week = [
        planned,
        occurrence({ title: "Glenarm Line Dance Class", venueName: "Glenarm Recreation Center", level: "Beginner & Improver", price: "$5", date: "2026-10-27", startAt: at("2026-10-27T23:30:00Z") }),
        occurrence({ title: "Barnum Line Dance", venueName: "Barnum Rec Center", level: "Intermediate to Advanced", price: "$5", date: "2026-10-28", startAt: at("2026-10-29T00:30:00Z"), substitute: "Jane" }),
        occurrence({ title: "Charlies Country", level: "All Levels", price: "FREE", date: "2026-10-29", startAt: at("2026-10-29T23:00:00Z"), isCancelled: true }),
        occurrence({ title: "Alternative Line Dance", level: "Improver to Intermediate", price: "$5-$10", date: "2026-10-31", startAt: at("2026-10-31T20:00:00Z") }),
        occurrence({ title: "Charlies Country", level: "All Levels", price: "FREE", date: "2026-10-31", startAt: at("2026-10-31T23:00:00Z") }),
    ];
    const drafts = {
        lesson: lessonDraft(planned, SITE),
        cancellation: cancellationDraft({ ...planned, isCancelled: true, cancelNote: "Charlie's is closed for a private event tonight." }, SITE),
        weekly: weeklyDraft(week, SITE),
    };
    // One lesson card per class style, titled like the real classes.
    const titles: Record<string, [string, string, string, string]> = {
        "694f56089fad7f908b6be167": ["country", "Charlies Country", "Charlie's Denver", "All Levels"],
        "6adbc9571ee36b88df899dbd": ["popular", "Popular Line Dance", "Charlie's Denver", "All Levels"],
        "694f56089fad7f908b6be168": ["alternative", "Alternative Line Dance", "Charlie's Denver", "Improver to Intermediate"],
        "69aa4c690a7750f056e60746": ["glenarm", "Glenarm Line Dance Class", "Glenarm Recreation Center", "Beginner & Improver"],
        "694f56089fad7f908b6be169": ["barnum", "Barnum Line Dance", "Barnum Rec Center", "Intermediate to Advanced"],
    };
    for (const id of Object.keys(SUGGESTED_STYLES)) {
        const [slug, title, venueName, level] = titles[id] ?? [id, "Class", "Venue", "All Levels"];
        (drafts as Record<string, ReturnType<typeof lessonDraft>>)[`lesson-${slug}`] = lessonDraft({ ...planned, eventTypeId: id, title, venueName, level }, SITE, resolveStyle(id));
    }

    // The WhatsApp event-card versions of the three base posts.
    for (const name of ["lesson", "cancellation", "weekly"] as const) {
        const png = Buffer.from(await (await renderEventCard(drafts[name].card)).arrayBuffer());
        await writeFile(join(out, `wa-${name}.png`), png);
        console.log(`wa-${name}: ${join(out, "wa-" + name)}.png (${Math.round(png.length / 1024)} KB)`);
    }

    for (const [name, d] of Object.entries(drafts)) {
        const png = Buffer.from(await (await renderCard(d.card)).arrayBuffer());
        await writeFile(join(out, `${name}.png`), png);
        await writeFile(join(out, `${name}.txt`), d.message);
        console.log(`${name}: ${join(out, name)}.png (${Math.round(png.length / 1024)} KB)`);
    }
}

main().catch((e) => { console.error(e); process.exit(1); });
