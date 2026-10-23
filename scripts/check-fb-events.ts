// One-time check: can this app create a Page event? Meta's docs say no (Event reference:
// "You can't perform this operation on this endpoint"); this confirms it against your Page.
// If it unexpectedly works, it creates a far-future test event that you'll need to delete by hand.
// Usage: npm run fb:check-events -- --yes

import { graphPost, GraphError } from "../lib/facebook";

async function main() {
    if (!process.argv.includes("--yes")) {
        console.log("This tries to create a test event on your Page. Re-run with --yes to go ahead.");
        return;
    }
    const pageId = process.env.FB_PAGE_ID!;
    try {
        const body = await graphPost(`${pageId}/events`, {
            name: "API test (delete me)",
            start_time: "2030-01-01T19:00:00-0700",
            access_token: process.env.FB_PAGE_TOKEN!,
        });
        console.log("Unexpected: the event was created. Delete it on Facebook. Response:", body);
    } catch (e) {
        if (e instanceof GraphError) {
            console.log(`As expected, Facebook refused (HTTP ${e.status}): ${e.message}`);
            console.log(JSON.stringify(e.body, null, 2));
        } else throw e;
    }
}

main().catch((e) => { console.error(e); process.exit(1); });
