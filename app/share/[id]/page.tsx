import type { Metadata } from "next";
import { getBldDb } from "@/lib/db";
import { posts } from "@/lib/posts";
import { verifyShare, whatsappCaption } from "@/lib/whatsapp";
import { ShareActions } from "./ShareActions";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Share to WhatsApp", robots: { index: false, follow: false } };

type Props = { params: Promise<{ id: string }>; searchParams: Promise<{ t?: string }> };

// Opened from the "Share to WhatsApp" phone alert. The signed link is the only way in.
export default async function SharePage({ params, searchParams }: Props) {
    const { id } = await params;
    const { t = "" } = await searchParams;
    const post = /^[0-9a-f]{24}$/.test(id) ? await posts(await getBldDb()).findOne({ _id: id }) : null;
    if (!post || !verifyShare(post, t)) {
        return <main style={page}><p>This share link isn&apos;t valid anymore.</p></main>;
    }
    return (
        <main style={page}>
            <h1 style={{ fontSize: 20, margin: "0 0 4px" }}>Share to WhatsApp</h1>
            <p style={{ margin: "0 0 16px", color: "#9a8fb5", fontSize: 14 }}>
                {post.label}{post.kind === "test" ? " (test post)" : ""}
            </p>
            <ShareActions
                imageUrl={post.card ? `/api/card/${post._id}?v=${post.planHash}` : null}
                caption={whatsappCaption(post.editedMessage ?? post.message)}
            />
        </main>
    );
}

const page: React.CSSProperties = {
    maxWidth: 520, margin: "0 auto", padding: "20px 16px 40px", minHeight: "100vh", boxSizing: "border-box",
    fontFamily: "system-ui, -apple-system, sans-serif", background: "#0B0614", color: "#fff",
};
