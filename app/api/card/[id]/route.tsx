import { NextResponse } from "next/server";
import { renderCard } from "@/lib/card";
import { getBldDb } from "@/lib/db";
import { posts } from "@/lib/posts";

export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ id: string }> };

// A post's image. Public on purpose: Facebook downloads it when publishing, and the admin shows it as
// the preview. Post ids are random, and the image only shows what the post itself will make public.
export async function GET(_req: Request, { params }: Ctx) {
    const { id } = await params;
    if (!/^[0-9a-f]{24}$/.test(id)) return NextResponse.json({ error: "Not found" }, { status: 404 });
    const post = await posts(await getBldDb()).findOne({ _id: id }, { projection: { card: 1 } });
    if (!post?.card) return NextResponse.json({ error: "Not found" }, { status: 404 });

    const image = await renderCard(post.card);
    // The URL carries ?v=<planHash>, so a changed plan is a new URL and the image can be cached.
    image.headers.set("Cache-Control", "public, max-age=86400, immutable");
    return image;
}
