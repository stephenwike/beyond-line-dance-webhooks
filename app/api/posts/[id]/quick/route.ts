import { getBldDb } from "@/lib/db";
import { posts, publishPost } from "@/lib/posts";
import { verifyQuick, type QuickAction } from "@/lib/quickAction";

export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ id: string }> };

const APPROVABLE = ["pending", "failed", "expired"] as const;
const SKIPPABLE = ["pending", "approved", "failed", "expired"] as const;

// The phone alert's buttons POST here (ntfy "http" actions). The signed token covers this post, its
// current plan and the action, so a button stops working once the plan changes.
// Plain-text replies: the ntfy app shows them if the request fails.
export async function POST(req: Request, { params }: Ctx) {
    const { id } = await params;
    const url = new URL(req.url);
    const action = url.searchParams.get("a") as QuickAction | null;
    const token = url.searchParams.get("t") ?? "";
    if (action !== "approve" && action !== "skip") return text("Unknown action", 400);

    const col = posts(await getBldDb());
    const post = await col.findOne({ _id: id });
    if (!post) return text("Post not found", 404);
    if (!verifyQuick(id, post.planHash, action, token)) return text("This post changed since the alert. Open it to review.", 409);

    const now = new Date();
    if (action === "skip") {
        const r = await col.updateOne({ _id: id, status: { $in: [...SKIPPABLE] } }, {
            $set: { status: "skipped", note: "Skipped from your phone", decidedBy: "phone", decidedAt: now, updatedAt: now },
        });
        return r.modifiedCount ? text("Skipped") : text(`Already ${post.status}`, 409);
    }

    if (post.startAt && now >= post.startAt) return text("The class already started, so it wasn't posted", 409);
    const r = await col.updateOne({ _id: id, status: { $in: [...APPROVABLE] }, planHash: post.planHash }, {
        $set: { status: "approved", approvedPlanHash: post.planHash, error: null, decidedBy: "phone", decidedAt: now, updatedAt: now },
    });
    if (!r.modifiedCount) return text(`Already ${post.status}`, 409);
    const done = await publishPost(col, id, ["approved"]);
    return done?.status === "published" ? text("Posted") : text(`Couldn't post: ${done?.error ?? "unknown error"}`, 502);
}

function text(body: string, status = 200) {
    return new Response(body, { status, headers: { "Content-Type": "text/plain; charset=utf-8" } });
}
