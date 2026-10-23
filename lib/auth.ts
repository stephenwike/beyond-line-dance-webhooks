import { timingSafeEqual } from "node:crypto";

/** True when the request carries `Authorization: Bearer <secret>` for the named env var. */
export function hasBearer(req: Request, envName: "CRON_SECRET" | "INTERNAL_API_SECRET"): boolean {
    const secret = process.env[envName];
    if (!secret) return false;
    const got = Buffer.from(req.headers.get("authorization") ?? "");
    const want = Buffer.from(`Bearer ${secret}`);
    return got.length === want.length && timingSafeEqual(got, want);
}
