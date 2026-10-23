import { NextResponse } from "next/server";
import { hasBearer } from "@/lib/auth";
import { previewStyle } from "@/lib/styleAdmin";

export const dynamic = "force-dynamic";
export const maxDuration = 30;

// Draws a class's next post with an unsaved style, for the admin's live preview.
export async function POST(req: Request) {
    if (!hasBearer(req, "INTERNAL_API_SECRET")) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const body = await req.json().catch(() => ({}));
    if (typeof body.eventTypeId !== "string") return NextResponse.json({ error: "eventTypeId is required" }, { status: 400 });
    try {
        return NextResponse.json(await previewStyle(body.eventTypeId, body.style ?? {}));
    } catch (e: unknown) {
        return NextResponse.json({ error: e instanceof Error ? e.message : String(e) }, { status: 422 });
    }
}
