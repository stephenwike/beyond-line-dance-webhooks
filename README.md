# beyond-line-dance-webhooks

Automation for the Beyond Line Dance Facebook Page. It reads Stephen's schedule from `ldco-lessons` (see `../ldco-database`, decision 18) and posts:

- **Lesson plans**, 6 hours before each class: the night's dances, times, levels and links.
- **A weekly outline**, Mondays at 9:00: each class's day, time, venue, level and price. No lesson details.
- **Cancellations**, when an event is marked cancelled. These always wait for your OK.

Facebook Events aren't created. Meta's Graph API doesn't allow creating, updating or deleting events except for Marketing Partners ([Event reference](https://developers.facebook.com/docs/graph-api/reference/event/)). `pnpm fb:check-events -- --yes` confirms this against the Page.

## What a post looks like

Each post is a branded 1080×1350 image ([lib/card.tsx](lib/card.tsx), in the style of the Intermediate Social poster: your logo, the purple dance-floor photo, Montserrat with a Kaushan brush script, a neon price badge) with the text as its caption ([lib/drafts.ts](lib/drafts.ts)). Facebook downloads the image from `/api/card/<post id>`, which is also the preview on the admin's Social Posts page. Hashtags and the "No partner needed" line are in `brand` in [lib/config.ts](lib/config.ts).

## Class styles

Each class has its own style ([lib/styles.ts](lib/styles.ts)): a color theme, a background photo from `assets/photos`, the headline and call to action on the image, and the caption's first line and extra hashtags. Classes start from a suggested style (`SUGGESTED_STYLES`), and the admin's **Post Styles** page overrides it field by field, with a live preview; saved styles live in `bld.post_styles` (one document per event type). Weekly outlines use the default style. To add a photo, put a 1080px-wide JPEG in `assets/photos` and list it in `PHOTOS`.

## Safety rails

Every 30 minutes `/api/cron/tick` drafts the posts that are due and runs the checks in [lib/config.ts](lib/config.ts):

| Result | When | What happens |
|---|---|---|
| Publishes | Every check passes | Posts to the Page |
| Waits for you | No lesson plan; a lesson with no time, dance, level or link; a dance not in the catalog; a substitute with no name; venue not found; the plan changed after you approved it; any cancellation | Shows on the admin's **Social Posts** page. You approve (optionally editing the text) or skip it. |
| Phone alert | Still waiting 3 hours before class | One push notification (Pushover or ntfy) linking to the post |
| Dropped | Still waiting 1 hour before class, or the class was cancelled, switched off or removed | Never posted |

If you fix the plan in Plan Lesson, the draft updates on the next tick. If the fixed plan passes every check, it posts on its own. Nothing reaches Facebook unless `FACEBOOK_PUBLISH=live`. Until then, every publish is a dry run, logged and marked "dry run" in the admin.

Posts are stored in `bld.social_posts` (decision 19), one document per post with a unique `key`. The comment at the top of [lib/posts.ts](lib/posts.ts) shows the status flow.

## Setup

### 1. Facebook app and Page token
1. At [developers.facebook.com](https://developers.facebook.com/apps), create an app with the use case for managing a Page (Pages API), linked to your business portfolio.
2. In [Graph API Explorer](https://developers.facebook.com/tools/explorer/), pick the app and choose **Get User Access Token** with `pages_show_list`, `pages_read_engagement` and `pages_manage_posts`. Select the Beyond Line Dance Page when asked.
3. Put `FB_APP_ID` and `FB_APP_SECRET` (App settings → Basic) in `.env.local`, then run `pnpm fb:page-token -- <that token>`. It prints `FB_PAGE_ID` and a Page token that doesn't expire (`FB_PAGE_TOKEN`).
4. Run `pnpm fb:check-events -- --yes` once to confirm events are off-limits.
5. Before going live, check whether posts are public: posts from an app in Development mode may only be visible to people with a role on the app. After the first live post, open it in a logged-out browser. If it's hidden, switch the app to Live mode (it needs a privacy policy URL).

### 2. Phone alerts
Choose one:
- **Pushover** (one-time $5 per platform): create an application at pushover.net. Set `PUSHOVER_APP_TOKEN` and `PUSHOVER_USER_KEY`.
- **ntfy** (free): install the ntfy app and subscribe to a long, unguessable topic name. Set `NTFY_TOPIC`. Anyone who knows the topic can read the alerts, so don't make it guessable.

### 3. Environment
Copy [.env.example](.env.example) to `.env.local` and fill it in. `INSTRUCTOR_ID` is your `ldco.instructors` id; your classes are found through `ldco-lessons.event_instructors`. Generate `CRON_SECRET` and `INTERNAL_API_SECRET` with `openssl rand -hex 32`.

In **line-dance-manager-admin** (local and on Vercel), add:
```
WEBHOOKS_URL=https://<this app>.vercel.app
WEBHOOKS_INTERNAL_SECRET=<same value as INTERNAL_API_SECRET>
LESSONS_DB_NAME=ldco-lessons
BLD_DB_NAME=bld
```

### 4. Deploy (Vercel)
[vercel.json](vercel.json) runs the tick every 30 minutes. A tick with nothing due is a couple of small reads, and approving a post in the admin publishes it immediately, so posts go out 5½–6 hours before class and alerts arrive 2½–3 hours before. The rules in [lib/config.ts](lib/config.ts) decide when posts are due; the tick only decides how promptly they go out.

## Going live checklist
1. Deploy with `FACEBOOK_PUBLISH=dry-run`. Watch Social Posts for a few days: are the right classes picked up, and is the text right?
2. Run `pnpm tick -- --at <ISO time>` locally to simulate a time, for example 6 hours before a planned class.
3. Set `FACEBOOK_PUBLISH=live`. Check the first real post from a logged-out browser (see step 1.5).

## Commands
- `pnpm dev`: local server on port 3300
- `pnpm test`: unit tests (schedule projection, drafts and checks, publishing rules)
- `pnpm tick`: one tick against `MONGODB_URI` from `.env.local`
- `pnpm test-alert`: send a sample phone alert
- `pnpm preview`: read-only list of the next 7 days of classes and what will happen to each post (`MONGODB_URI=<live> pnpm preview` for live)
- `MONGODB_URI=<live> pnpm e2e`: end-to-end test of production. Creates a held TEST post (shows on Social Posts, sends a phone alert); approving it publishes a hidden Facebook post. `-- --auto` publishes without approval; `-- --cleanup` deletes the hidden posts and test documents.
- `pnpm render-cards [dir]`: render sample post images (lesson, cancellation, weekly) to PNG without posting anything
- `pnpm typecheck`

## Not done yet
- **Intermediate Line Dance Social (quarterly):** it lives in the registration system (`ldco-events`), not the class schedule, so it isn't posted. It needs its own job: promo posts weeks ahead plus a reminder, with the registration link.
- **Photo uploads:** new photos are added as files in `assets/photos` for now; an upload on the Post Styles page would need file storage (for example Vercel Blob).
- **Hidden posts:** a viewer in the admin listing every hidden test post with one-click cleanup (see the admin's `docs/TODO.md`). Until then, `pnpm e2e -- --cleanup` deletes them.
- **Contract:** `bld.social_posts`, `bld.post_styles` and `bld.poster_runs` aren't in `@ldco/database` yet. Add it in `../ldco-database` (insert a document locally, `contract:infer`, add it to `purposes.ts` and `descriptions.ts`, bump the version, `contract:lock`, `package:build`).
