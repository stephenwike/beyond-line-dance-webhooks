import { NextResponse } from "next/server";
import { hasBearer } from "@/lib/auth";
import { listStyles } from "@/lib/styleAdmin";

export const dynamic = "force-dynamic";

// The admin's Ads page: each class's style and the cancellation and weekly-schedule styles, plus the
// themes and photos to choose from.
export async function GET(req: Request) {
    if (!hasBearer(req, "INTERNAL_API_SECRET")) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    try {
        return NextResponse.json(await listStyles());
    } catch (e: unknown) {
        return NextResponse.json({ error: e instanceof Error ? e.message : String(e) }, { status: 500 });
    }
}
