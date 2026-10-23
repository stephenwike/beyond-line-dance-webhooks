import type { Metadata } from "next";
import { getBldDb } from "@/lib/db";
import { posts } from "@/lib/posts";
import { cardPath } from "@/lib/urls";
import { verifyShare, whatsappCaption } from "@/lib/whatsapp";
import { ShareActions } from "./ShareActions";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Share to WhatsApp", robots: { index: false, follow: false } };

type Props = { params: Promise<{ id: string }>; searchParams: Promise<{ t?: string }> };

/** WhatsApp's own colors, so this page can't be mistaken for the Facebook steps. */
const WA = { green: "#25D366", header: "#075E54", chat: "#0B141A", bubble: "#005C4B", text: "#E9EDEF", muted: "#8696A0" };

// Opened from the "WhatsApp: share this post" phone alert. The signed link is the only way in.
export default async function SharePage({ params, searchParams }: Props) {
    const { id } = await params;
    const { t = "" } = await searchParams;
    const post = /^[0-9a-f]{24}$/.test(id) ? await posts(await getBldDb()).findOne({ _id: id }) : null;
    const valid = !!post && verifyShare(post, t);

    return (
        <main style={{ minHeight: "100vh", background: WA.chat, color: WA.text, fontFamily: "system-ui, -apple-system, sans-serif" }}>
            <header style={{ background: WA.header, padding: "16px 16px 14px", display: "flex", alignItems: "center", gap: 12 }}>
                <div style={{ width: 40, height: 40, borderRadius: 99, background: WA.green, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22 }}>💬</div>
                <div>
                    <div style={{ fontSize: 18, fontWeight: 700 }}>Share to WhatsApp</div>
                    <div style={{ fontSize: 13, color: "#cfe9e4" }}>Facebook is done ✓ · this step is for WhatsApp</div>
                </div>
            </header>
            <div style={{ maxWidth: 520, margin: "0 auto", padding: "16px 16px 40px", boxSizing: "border-box" }}>
                {valid ? (
                    <>
                        <p style={{ margin: "0 0 12px", color: WA.muted, fontSize: 13 }}>
                            {post.label}{post.kind === "test" ? " (test post)" : ""}
                        </p>
                        <ShareActions
                            imageUrl={post.card ? cardPath(post, "whatsapp") : null}
                            caption={whatsappCaption(post.editedMessage ?? post.message)}
                        />
                    </>
                ) : (
                    <p>This share link isn&apos;t valid anymore.</p>
                )}
            </div>
        </main>
    );
}
