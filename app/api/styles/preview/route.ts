import { NextResponse } from "next/server";
import { hasBearer } from "@/lib/auth";
import { previewAd, type PreviewKind } from "@/lib/styleAdmin";

export const dynamic = "force-dynamic";
export const maxDuration = 30;

const KINDS: PreviewKind[] = ["lesson", "cancellation", "weekly_outline"];

// Draws an ad with an unsaved style, for the admin's live preview.
// body: { kind: "lesson" | "cancellation" | "weekly_outline", eventTypeId?, style }
export async function POST(req: Request) {
    if (!hasBearer(req, "INTERNAL_API_SECRET")) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const body = await req.json().catch(() => ({}));
    const kind: PreviewKind = KINDS.includes(body.kind) ? body.kind : "lesson";
    if (kind === "lesson" && typeof body.eventTypeId !== "string") return NextResponse.json({ error: "eventTypeId is required" }, { status: 400 });
    try {
        return NextResponse.json(await previewAd(kind, typeof body.eventTypeId === "string" ? body.eventTypeId : null, body.style ?? {}));
    } catch (e: unknown) {
        return NextResponse.json({ error: e instanceof Error ? e.message : String(e) }, { status: 422 });
    }
}
