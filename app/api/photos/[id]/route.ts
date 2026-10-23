import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { NextResponse } from "next/server";
import { PHOTOS } from "@/lib/styles";

type Ctx = { params: Promise<{ id: string }> };

// A library photo, for the admin's photo picker. Public: these are the website's own images.
export async function GET(_req: Request, { params }: Ctx) {
    const { id } = await params;
    const photo = PHOTOS[id as keyof typeof PHOTOS];
    if (!photo) return NextResponse.json({ error: "Not found" }, { status: 404 });
    const data = await readFile(join(process.cwd(), "assets", "photos", photo.file));
    return new Response(data, { headers: { "Content-Type": "image/jpeg", "Cache-Control": "public, max-age=86400" } });
}
