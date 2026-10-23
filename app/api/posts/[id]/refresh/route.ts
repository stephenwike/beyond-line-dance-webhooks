import { NextResponse } from "next/server";
import { hasBearer } from "@/lib/auth";
import { refreshPost } from "@/lib/posts";

export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ id: string }> };

// The admin calls this after you save a plan from Social Posts, so the preview updates right away.
export async function POST(req: Request, { params }: Ctx) {
    if (!hasBearer(req, "INTERNAL_API_SECRET")) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const { id } = await params;
    try {
        const post = await refreshPost(id);
        if (!post) return NextResponse.json({ error: "Not found" }, { status: 404 });
        return NextResponse.json({ status: post.status, planHash: post.planHash, issues: post.issues });
    } catch (e: unknown) {
        return NextResponse.json({ error: e instanceof Error ? e.message : String(e) }, { status: 500 });
    }
}
