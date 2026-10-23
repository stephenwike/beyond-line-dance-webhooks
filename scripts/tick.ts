// Run one tick locally against MONGODB_URI. Stays a dry run unless FACEBOOK_PUBLISH=live.
// Usage: npm run tick  [-- --at 2026-10-20T18:30:00Z]   (pretend it's a different time)

import { closeDb } from "../lib/db";
import { tick } from "../lib/posts";

async function main() {
    const i = process.argv.indexOf("--at");
    const now = i > 0 ? new Date(process.argv[i + 1]) : new Date();
    console.log(`Tick at ${now.toISOString()} (${process.env.FACEBOOK_PUBLISH === "live" ? "LIVE" : "dry run"})`);
    console.log(await tick(now));
    await closeDb();
}

main().catch(async (e) => { console.error(e); await closeDb(); process.exit(1); });
