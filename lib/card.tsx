// The branded image posted with each post: 1080×1350 (4:5 portrait, the largest the Facebook feed shows).
// Drawn with next/og (Satori): flexbox only, no emoji, fonts and images loaded from assets/.

import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { ImageResponse } from "next/og";
import { brand } from "./config";
import type { CardData, CardClass, CardLesson } from "./drafts";

export const CARD_WIDTH = 1080;
export const CARD_HEIGHT = 1350;

const C = {
    night: "#140B2B",
    plum: "#24124D",
    purple: "#8A5CFF",
    lavender: "#C9B6FF",
    sunset: "#FFA24C",
    rose: "#FF5E7E",
    white: "#FFFFFF",
    muted: "rgba(255,255,255,0.72)",
    line: "rgba(255,255,255,0.14)",
};

const asset = (...p: string[]) => readFile(join(process.cwd(), "assets", ...p));

type Fonts = NonNullable<NonNullable<ConstructorParameters<typeof ImageResponse>[1]>["fonts"]>;

let loaded: Promise<{ fonts: Fonts; logo: string; photo: string }> | null = null;
function loadAssets() {
    loaded ??= (async () => {
        const [medium, semi, extra, script, logo, photo] = await Promise.all([
            asset("fonts", "Montserrat-Medium.ttf"), asset("fonts", "Montserrat-SemiBold.ttf"),
            asset("fonts", "Montserrat-ExtraBold.ttf"), asset("fonts", "GreatVibes-Regular.ttf"),
            asset("brand", "Logo_white.png"), asset("brand", "dance-sunset.jpg"),
        ]);
        return {
            fonts: [
                { name: "Montserrat", data: medium, weight: 500 as const, style: "normal" as const },
                { name: "Montserrat", data: semi, weight: 600 as const, style: "normal" as const },
                { name: "Montserrat", data: extra, weight: 800 as const, style: "normal" as const },
                { name: "Great Vibes", data: script, weight: 400 as const, style: "normal" as const },
            ],
            logo: `data:image/png;base64,${logo.toString("base64")}`,
            photo: `data:image/jpeg;base64,${photo.toString("base64")}`,
        };
    })();
    return loaded;
}

// ── Pieces ───────────────────────────────────────────────────────────────────

function Hero({ logo, photo, height }: { logo: string; photo: string; height: number }) {
    return (
        <div style={{ position: "relative", display: "flex", width: CARD_WIDTH, height }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={photo} width={CARD_WIDTH} height={height} style={{ position: "absolute", objectFit: "cover", objectPosition: "50% 35%" }} alt="" />
            <div style={{ position: "absolute", display: "flex", width: CARD_WIDTH, height, background: `linear-gradient(180deg, rgba(20,11,43,0.80) 0%, rgba(20,11,43,0.15) 32%, rgba(20,11,43,0.35) 60%, ${C.night} 100%)` }} />
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={logo} width={300} height={113} style={{ position: "absolute", left: 64, top: 56 }} alt="" />
        </div>
    );
}

function Eyebrow({ text, color = C.sunset }: { text: string; color?: string }) {
    return (
        <div style={{ display: "flex", alignSelf: "flex-start", padding: "10px 22px", borderRadius: 999, border: `2px solid ${color}`, color, fontSize: 26, fontWeight: 600, letterSpacing: 4 }}>
            {text}
        </div>
    );
}

function Chip({ text, color = C.lavender }: { text: string; color?: string }) {
    return (
        <div style={{ display: "flex", padding: "8px 18px", borderRadius: 999, background: "rgba(138,92,255,0.22)", color, fontSize: 24, fontWeight: 600 }}>
            {text}
        </div>
    );
}

function Footer() {
    return (
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: "auto", padding: "28px 64px", borderTop: `1px solid ${C.line}`, color: C.muted, fontSize: 26, fontWeight: 500 }}>
            <div style={{ display: "flex" }}>{brand.welcome} · All are welcome</div>
            <div style={{ display: "flex", color: C.white, fontWeight: 600 }}>beyondlinedance.com</div>
        </div>
    );
}

function LessonRow({ l }: { l: CardLesson }) {
    return (
        <div style={{ display: "flex", alignItems: "center", gap: 28, padding: "20px 0", borderBottom: `1px solid ${C.line}` }}>
            <div style={{ display: "flex", width: 170, color: C.sunset, fontSize: 32, fontWeight: 800 }}>{l.time}</div>
            <div style={{ display: "flex", flex: 1, color: C.white, fontSize: 40, fontWeight: 600, overflow: "hidden", whiteSpace: "nowrap", textOverflow: "ellipsis" }}>{l.dance}</div>
            {l.level && <Chip text={l.level} />}
        </div>
    );
}

function ClassRow({ c, compact }: { c: CardClass; compact: boolean }) {
    return (
        <div style={{ display: "flex", alignItems: "flex-start", gap: 24, padding: compact ? "6px 0" : "10px 0", opacity: c.cancelled ? 0.55 : 1 }}>
            <div style={{ display: "flex", width: 150, paddingTop: 3, color: C.sunset, fontSize: compact ? 26 : 28, fontWeight: 800 }}>{c.time}</div>
            <div style={{ display: "flex", flexDirection: "column", flex: 1, overflow: "hidden" }}>
                <div style={{ display: "flex", color: C.white, fontSize: compact ? 29 : 32, fontWeight: 600, textDecoration: c.cancelled ? "line-through" : "none" }}>
                    {c.title}
                    {c.substitute && !c.cancelled && <span style={{ marginLeft: 12, color: C.lavender, fontWeight: 500 }}>with {c.substitute}</span>}
                </div>
                <div style={{ display: "block", color: C.muted, fontSize: compact ? 22 : 24, fontWeight: 500, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                    {[c.venue, c.cancelled ? "Cancelled" : c.detail].filter(Boolean).join(" · ")}
                </div>
            </div>
        </div>
    );
}

// ── Layouts ──────────────────────────────────────────────────────────────────

function LessonCard({ card, logo, photo }: { card: Extract<CardData, { type: "lesson" }>; logo: string; photo: string }) {
    const shown = card.lessons.slice(0, 5);
    const more = card.lessons.length - shown.length;
    return (
        <div style={{ display: "flex", flexDirection: "column", width: CARD_WIDTH, height: CARD_HEIGHT }}>
            <Hero logo={logo} photo={photo} height={430} />
            <div style={{ display: "flex", flexDirection: "column", padding: "0 64px", marginTop: -70 }}>
                <Eyebrow text={card.eyebrow} />
                <div style={{ display: "flex", marginTop: 18, color: C.lavender, fontFamily: "Great Vibes", fontSize: 92 }}>Line Dancing at</div>
                <div style={{ display: "flex", marginTop: -6, color: C.white, fontSize: 76, fontWeight: 800, lineHeight: 1.05 }}>{card.venue ?? card.title}</div>
                <div style={{ display: "flex", marginTop: 14, color: C.muted, fontSize: 32, fontWeight: 500 }}>
                    {card.venue ? `${card.title} · ` : ""}Starts {card.startTime}
                </div>
                <div style={{ display: "flex", gap: 12, marginTop: 22 }}>
                    {card.level && <Chip text={card.level} />}
                    {card.price && <Chip text={card.price} color={C.sunset} />}
                    {card.substitute && <Chip text={`With ${card.substitute}`} color={C.white} />}
                </div>
                {shown.length > 0 && (
                    <div style={{ display: "flex", flexDirection: "column", marginTop: 34 }}>
                        <div style={{ display: "flex", color: C.lavender, fontSize: 24, fontWeight: 600, letterSpacing: 4 }}>WHAT WE&apos;RE LEARNING</div>
                        {shown.map((l, i) => <LessonRow key={i} l={l} />)}
                        {more > 0 && <div style={{ display: "flex", paddingTop: 16, color: C.muted, fontSize: 26 }}>+ {more} more</div>}
                    </div>
                )}
            </div>
            <Footer />
        </div>
    );
}

function CancellationCard({ card, logo, photo }: { card: Extract<CardData, { type: "cancellation" }>; logo: string; photo: string }) {
    return (
        <div style={{ display: "flex", flexDirection: "column", width: CARD_WIDTH, height: CARD_HEIGHT }}>
            <Hero logo={logo} photo={photo} height={520} />
            <div style={{ display: "flex", flexDirection: "column", padding: "0 64px", marginTop: -60 }}>
                <Eyebrow text={card.eyebrow} color={C.rose} />
                <div style={{ display: "flex", marginTop: 26, color: C.rose, fontSize: 104, fontWeight: 800, letterSpacing: 2 }}>CANCELLED</div>
                <div style={{ display: "flex", marginTop: 10, color: C.white, fontSize: 52, fontWeight: 800 }}>{card.title}</div>
                <div style={{ display: "flex", marginTop: 12, color: C.muted, fontSize: 32, fontWeight: 500 }}>
                    {[card.venue, card.startTime].filter(Boolean).join(" · ")}
                </div>
                {card.note && <div style={{ display: "flex", marginTop: 36, color: C.white, fontSize: 34, fontWeight: 500, lineHeight: 1.35 }}>{card.note}</div>}
                <div style={{ display: "flex", marginTop: 40, color: C.lavender, fontFamily: "Great Vibes", fontSize: 72 }}>See you at the next one!</div>
            </div>
            <Footer />
        </div>
    );
}

function WeeklyCard({ card, logo, photo }: { card: Extract<CardData, { type: "weekly" }>; logo: string; photo: string }) {
    const rows = card.days.reduce((n, d) => n + d.classes.length, 0);
    const compact = rows > 5;
    return (
        <div style={{ display: "flex", flexDirection: "column", width: CARD_WIDTH, height: CARD_HEIGHT }}>
            <Hero logo={logo} photo={photo} height={compact ? 300 : 380} />
            <div style={{ display: "flex", flexDirection: "column", padding: "0 64px", marginTop: -60 }}>
                <Eyebrow text={card.eyebrow} />
                <div style={{ display: "flex", alignItems: "baseline", gap: 24, marginTop: 10 }}>
                    <div style={{ display: "flex", color: C.lavender, fontFamily: "Great Vibes", fontSize: 92 }}>Class Schedule</div>
                </div>
                <div style={{ display: "flex", marginTop: -4, color: C.muted, fontSize: 30, fontWeight: 600 }}>{card.range}</div>
                <div style={{ display: "flex", flexDirection: "column", marginTop: 20, gap: compact ? 4 : 10 }}>
                    {card.days.map((d) => (
                        <div key={d.day} style={{ display: "flex", gap: 24, paddingTop: compact ? 6 : 12, borderTop: `1px solid ${C.line}` }}>
                            <div style={{ display: "flex", width: 110, paddingTop: compact ? 9 : 13, color: C.white, fontSize: compact ? 26 : 28, fontWeight: 800, letterSpacing: 2 }}>{d.day.split(" ")[0]}</div>
                            <div style={{ display: "flex", flexDirection: "column", flex: 1 }}>
                                {d.classes.map((c, i) => <ClassRow key={i} c={c} compact={compact} />)}
                            </div>
                        </div>
                    ))}
                    {card.days.length === 0 && <div style={{ display: "flex", color: C.muted, fontSize: 32 }}>No classes this week.</div>}
                </div>
            </div>
            <Footer />
        </div>
    );
}

/** The PNG for a post's card. */
export async function renderCard(card: CardData): Promise<ImageResponse> {
    const { fonts, logo, photo } = await loadAssets();
    return new ImageResponse(
        (
            <div style={{ display: "flex", flexDirection: "column", width: CARD_WIDTH, height: CARD_HEIGHT, background: `linear-gradient(180deg, ${C.night} 0%, ${C.night} 40%, ${C.plum} 100%)`, fontFamily: "Montserrat" }}>
                {card.type === "lesson" && <LessonCard card={card} logo={logo} photo={photo} />}
                {card.type === "cancellation" && <CancellationCard card={card} logo={logo} photo={photo} />}
                {card.type === "weekly" && <WeeklyCard card={card} logo={logo} photo={photo} />}
            </div>
        ),
        { width: CARD_WIDTH, height: CARD_HEIGHT, fonts },
    );
}
