// Sends a sample "waiting on you" alert to check the phone alert setup.
// Usage: npm run test-alert

import { sendPhoneAlert } from "../lib/notify";

sendPhoneAlert({
    title: "Facebook post waiting on you",
    message: "TEST ALERT\nCharlies Country at Charlie's Denver, Mon 10/26 5:00 PM\nGuillotine isn't in the dance catalog\nIt won't be posted unless you approve it by 4:00 PM.",
    url: `${process.env.ADMIN_URL}/social-posts`, urlTitle: "Review post", urgent: true,
}).then((sent) => console.log(sent ? "Test alert sent" : "No phone alert channel configured"))
    .catch((e) => { console.error(e.message); process.exit(1); });
