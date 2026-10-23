// Sends a sample "needs your OK" alert in the real format, to check the phone setup and layout.
// Its buttons point at a made-up post, so tapping them just reports "Post not found".
// Usage: pnpm test-alert

import { waitingAlert } from "../lib/alerts";
import { sendPhoneAlert } from "../lib/notify";

process.env.PUBLIC_URL ||= "https://beyond-line-dance-webhooks.vercel.app";

const sample = {
    _id: "000000000000000000000000", kind: "lesson" as const, planHash: "sample",
    label: "TEST · Charlies Country at Charlie's Denver, Mon 10/26 5:00 PM",
    issues: [
        { check: "danceNotInCatalog" as const, message: "Guillotine isn't in the dance catalog" },
        { check: "lessonMissingLink" as const, message: "Lesson at 6:00 PM: no link" },
    ],
    expireAt: new Date(Date.now() + 2 * 3_600_000),
};

sendPhoneAlert(waitingAlert(sample, process.env.DEFAULT_TIME_ZONE || "America/Denver"))
    .then((sent) => console.log(sent ? "Test alert sent" : "No phone alert channel configured"))
    .catch((e) => { console.error(e.message); process.exit(1); });
