import { NextResponse } from "next/server";
import { hasBearer } from "@/lib/auth";
import { tick } from "@/lib/posts";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

// Vercel Cron calls this with "Authorization: Bearer $CRON_SECRET".
export async function GET(req: Request) {
    if (!hasBearer(req, "CRON_SECRET")) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    try {
        const report = await tick();
        return NextResponse.json(report, { status: report.errors.length ? 207 : 200 });
    } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : String(e);
        console.error("tick failed", e);
        return NextResponse.json({ error: msg }, { status: 500 });
    }
}
