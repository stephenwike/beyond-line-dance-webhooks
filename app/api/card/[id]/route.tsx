import { NextResponse } from "next/server";
import { renderCard } from "@/lib/card";
import { renderEventCard } from "@/lib/eventCard";
import { getBldDb } from "@/lib/db";
import { posts } from "@/lib/posts";

export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ id: string }> };

// A post's image. Public on purpose: Facebook downloads it when publishing, and the admin shows it as
// the preview. Post ids are random, and the image only shows what the post itself will make public.
export async function GET(req: Request, { params }: Ctx) {
    const { id } = await params;
    if (!/^[0-9a-f]{24}$/.test(id)) return NextResponse.json({ error: "Not found" }, { status: 404 });
    const post = await posts(await getBldDb()).findOne({ _id: id }, { projection: { card: 1 } });
    if (!post?.card) return NextResponse.json({ error: "Not found" }, { status: 404 });

    try {
        // ?variant=whatsapp: the light event card used for WhatsApp shares.
        const whatsapp = new URL(req.url).searchParams.get("variant") === "whatsapp";
        const image = whatsapp ? await renderEventCard(post.card) : await renderCard(post.card);
        // Render now so a drawing error is caught here rather than mid-stream.
        const png = await image.arrayBuffer();
        // The URL carries ?v=<planHash>, so a changed plan is a new URL and the image can be cached.
        return new Response(png, { headers: { "Content-Type": "image/png", "Cache-Control": "public, max-age=86400, immutable" } });
    } catch (e: unknown) {
        console.error(`card ${id} failed`, e);
        return NextResponse.json({ error: "Couldn't draw this post's image" }, { status: 500 });
    }
}
