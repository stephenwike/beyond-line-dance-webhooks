import { NextResponse } from "next/server";
import { hasBearer } from "@/lib/auth";
import { getBldDb } from "@/lib/db";
import { readStoredPost } from "@/lib/facebook";
import { posts } from "@/lib/posts";

export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ id: string }> };

// What Facebook stored for a published post. Hidden test posts can't be opened on Facebook, so the
// admin shows this instead.
export async function GET(req: Request, { params }: Ctx) {
    if (!hasBearer(req, "INTERNAL_API_SECRET")) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const { id } = await params;
    const post = await posts(await getBldDb()).findOne({ _id: id }, { projection: { fbPostId: 1 } });
    if (!post?.fbPostId || post.fbPostId.startsWith("dry-run")) return NextResponse.json({ error: "This post isn't on Facebook" }, { status: 404 });
    try {
        return NextResponse.json(await readStoredPost(post.fbPostId));
    } catch (e: unknown) {
        return NextResponse.json({ error: e instanceof Error ? e.message : String(e) }, { status: 502 });
    }
}
