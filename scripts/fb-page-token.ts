// Turns a short-lived user token (from Graph API Explorer) into a Page token that doesn't expire.
// Usage: npm run fb:page-token -- <short-lived user token>
// Needs FB_APP_ID and FB_APP_SECRET in .env.local. Prints the token; put it in FB_PAGE_TOKEN.

const [userToken] = process.argv.slice(2).filter((a) => a !== "--");
const version = process.env.FB_GRAPH_VERSION || "v25.0";
const appId = process.env.FB_APP_ID;
const appSecret = process.env.FB_APP_SECRET;

async function get(path: string, params: Record<string, string>) {
    const res = await fetch(`https://graph.facebook.com/${version}/${path}?${new URLSearchParams(params)}`);
    const body = await res.json();
    if (body.error) throw new Error(`${path}: ${body.error.message}`);
    return body;
}

async function main() {
    if (!userToken || !appId || !appSecret) {
        console.error("Usage: npm run fb:page-token -- <short-lived user token>  (with FB_APP_ID and FB_APP_SECRET set)");
        process.exit(1);
    }
    const long = await get("oauth/access_token", {
        grant_type: "fb_exchange_token", client_id: appId, client_secret: appSecret, fb_exchange_token: userToken,
    });
    const pages = await get("me/accounts", { access_token: long.access_token, fields: "id,name,access_token,tasks" });
    for (const p of pages.data ?? []) {
        console.log(`\n${p.name}\n  FB_PAGE_ID=${p.id}\n  FB_PAGE_TOKEN=${p.access_token}\n  tasks: ${(p.tasks ?? []).join(", ")}`);
    }
    if (!pages.data?.length) console.log("No Pages found. Did you grant pages_show_list and pick the Page when logging in?");
}

main().catch((e) => { console.error(e.message); process.exit(1); });
