import { NextResponse } from "next/server";
import { hasBearer } from "@/lib/auth";
import { getBldDb } from "@/lib/db";
import { tick } from "@/lib/posts";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

// Vercel Cron calls this with "Authorization: Bearer $CRON_SECRET".
export async function GET(req: Request) {
    if (!hasBearer(req, "CRON_SECRET")) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    // Vercel's scheduler identifies itself as "vercel-cron/1.0"; anything else is a manual run.
    const scheduled = req.headers.get("user-agent")?.startsWith("vercel-cron") ?? false;
    try {
        const report = await tick();
        await recordRun(scheduled, report.errors.length ? `${report.errors.length} error(s)` : null);
        return NextResponse.json(report, { status: report.errors.length ? 207 : 200 });
    } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : String(e);
        console.error("tick failed", e);
        await recordRun(scheduled, msg).catch(() => {});
        return NextResponse.json({ error: msg }, { status: 500 });
    }
}

/** bld.poster_runs: when the last scheduled and manual runs happened, shown on the admin's Social Posts. */
async function recordRun(scheduled: boolean, error: string | null) {
    const now = new Date();
    await (await getBldDb()).collection<{ _id: string }>("poster_runs").updateOne(
        { _id: scheduled ? "scheduled" : "manual" },
        { $set: { lastRunAt: now, error } },
        { upsert: true },
    );
}
