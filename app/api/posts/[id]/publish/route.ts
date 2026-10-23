import { NextResponse } from "next/server";
import { hasBearer } from "@/lib/auth";
import { getBldDb } from "@/lib/db";
import { nextStep, posts, publishPost } from "@/lib/posts";

export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ id: string }> };

// The admin calls this right after you approve, so the post doesn't wait for the next tick.
// It still re-checks the rules: only an approved post whose plan hasn't changed is published.
export async function POST(req: Request, { params }: Ctx) {
    if (!hasBearer(req, "INTERNAL_API_SECRET")) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const { id } = await params;
    const col = posts(await getBldDb());
    const post = await col.findOne({ _id: id });
    if (!post) return NextResponse.json({ error: "Not found" }, { status: 404 });
    if (post.status !== "approved" || nextStep(post, new Date()) !== "publish") {
        return NextResponse.json({ status: post.status, published: false });
    }
    const done = await publishPost(col, id, ["approved"]);
    return NextResponse.json({ status: done?.status, published: done?.status === "published", error: done?.error ?? null });
}
