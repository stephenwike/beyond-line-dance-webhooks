// The branded image posted with each post: 1080×1350 (4:5 portrait, the largest the Facebook feed shows).
// Styled after the Intermediate Social poster: night-club purple dance floor, heavy italic white type, a
// magenta brush script with a cyan swoosh, orange highlights and a neon price badge.
// Drawn with next/og (Satori): flexbox only, no emoji, fonts and images loaded from assets/.

import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { ImageResponse } from "next/og";
import { brand } from "./config";
import type { CardData, CardClass, CardLesson } from "./drafts";

export const CARD_WIDTH = 1080;
export const CARD_HEIGHT = 1350;
const PAD = 64;

const C = {
    ink: "#0B0614",
    violet: "#1B0B33",
    purple: "#8A5CFF",
    magenta: "#FF3EA5",
    cyan: "#2EE6F6",
    orange: "#FF8A1F",
    white: "#FFFFFF",
    muted: "rgba(255,255,255,0.74)",
    line: "rgba(255,255,255,0.12)",
    panel: "rgba(16,8,32,0.78)",
};
const neon = `linear-gradient(90deg, ${C.magenta} 0%, ${C.purple} 100%)`;

type Fonts = NonNullable<NonNullable<ConstructorParameters<typeof ImageResponse>[1]>["fonts"]>;

const asset = (...p: string[]) => readFile(join(process.cwd(), "assets", ...p));

let loaded: Promise<{ fonts: Fonts; logo: string; photo: string }> | null = null;
function loadAssets() {
    loaded ??= (async () => {
        const [medium, semi, extra, blackItalic, brush, logo, photo] = await Promise.all([
            asset("fonts", "Montserrat-Medium.ttf"), asset("fonts", "Montserrat-SemiBold.ttf"),
            asset("fonts", "Montserrat-ExtraBold.ttf"), asset("fonts", "Montserrat-BlackItalic.ttf"),
            asset("fonts", "KaushanScript-Regular.ttf"),
            asset("brand", "Logo_white.png"), asset("brand", "dance-floor.jpg"),
        ]);
        const fonts: Fonts = [
            { name: "Montserrat", data: medium, weight: 500, style: "normal" },
            { name: "Montserrat", data: semi, weight: 600, style: "normal" },
            { name: "Montserrat", data: extra, weight: 800, style: "normal" },
            { name: "Montserrat", data: blackItalic, weight: 900, style: "italic" },
            { name: "Brush", data: brush, weight: 400, style: "normal" },
        ];
        return {
            fonts,
            logo: `data:image/png;base64,${logo.toString("base64")}`,
            photo: `data:image/jpeg;base64,${photo.toString("base64")}`,
        };
    })();
    return loaded;
}

// ── Pieces ───────────────────────────────────────────────────────────────────

/** The dance-floor photo fading into the page, with the logo on top. */
function Backdrop({ logo, photo, height }: { logo: string; photo: string; height: number }) {
    return (
        <div style={{ position: "absolute", top: 0, left: 0, display: "flex", width: CARD_WIDTH, height }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={photo} width={CARD_WIDTH} height={height} style={{ position: "absolute", objectFit: "cover", objectPosition: "50% 40%" }} alt="" />
            <div style={{ position: "absolute", display: "flex", width: CARD_WIDTH, height, background: `linear-gradient(180deg, rgba(11,6,20,0.70) 0%, rgba(11,6,20,0.10) 30%, rgba(11,6,20,0.45) 65%, ${C.ink} 100%)` }} />
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={logo} width={430} height={162} style={{ position: "absolute", left: PAD - 8, top: 44 }} alt="" />
        </div>
    );
}

/** Magenta brush script with a cyan swoosh under it. */
function Brush({ text, size = 120, rotate = -5 }: { text: string; size?: number; rotate?: number }) {
    const width = Math.round(text.length * size * 0.42);
    return (
        <div style={{ display: "flex", flexDirection: "column", alignSelf: "flex-start", transform: `rotate(${rotate}deg)` }}>
            <div style={{ display: "flex", fontFamily: "Brush", fontSize: size, lineHeight: 1.1, paddingRight: 24, backgroundImage: neon, backgroundClip: "text", color: "transparent" }}>{text}</div>
            <svg width={width} height={34} viewBox={`0 0 ${width} 34`} style={{ marginTop: -18, marginLeft: 18 }}>
                <path d={`M6 26 C ${width * 0.3} 6, ${width * 0.7} 4, ${width - 6} 14`} stroke={C.cyan} strokeWidth={10} strokeLinecap="round" fill="none" />
            </svg>
        </div>
    );
}

/** A tilted neon disc with the price, like the poster's admission stamp. */
function PriceBadge({ price }: { price: string }) {
    const big = price.length <= 4;
    return (
        <div style={{
            position: "absolute", top: 40, right: PAD - 10, width: 196, height: 196, borderRadius: 999,
            display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
            background: "radial-gradient(circle, rgba(27,11,51,0.95) 55%, rgba(138,92,255,0.9) 100%)",
            border: `5px solid ${C.magenta}`, boxShadow: `0 0 34px ${C.magenta}`, transform: "rotate(-10deg)",
        }}>
            <div style={{ display: "flex", color: C.white, fontWeight: 900, fontStyle: "italic", fontSize: big ? 58 : 40, lineHeight: 1 }}>{price}</div>
            <div style={{ display: "flex", marginTop: 6, color: C.cyan, fontSize: 18, fontWeight: 800, letterSpacing: 3 }}>ADMISSION</div>
        </div>
    );
}

/** "MONDAY OCT 26 · 5:00 PM" with the poster's orange highlights. */
function DateLine({ day, date, time }: { day: string; date: string; time?: string }) {
    return (
        <div style={{ display: "flex", alignItems: "baseline", gap: 14, fontSize: 40, fontWeight: 800, letterSpacing: 1 }}>
            <span style={{ color: C.white }}>{day}</span>
            <span style={{ color: C.orange }}>{date}</span>
            {time && <span style={{ color: C.white }}>· {time}</span>}
        </div>
    );
}

function Headline({ text }: { text: string }) {
    const size = text.length > 18 ? 74 : 92;
    return (
        <div style={{ display: "flex", color: C.white, fontWeight: 900, fontStyle: "italic", fontSize: size, lineHeight: 0.98, letterSpacing: -1, textTransform: "uppercase" }}>
            {text}
        </div>
    );
}

/** Brush-script invitation sitting just above the footer. */
function Cta({ text }: { text: string }) {
    return (
        <div style={{ display: "flex", justifyContent: "center", marginTop: "auto", paddingBottom: 26 }}>
            <div style={{ display: "flex", fontFamily: "Brush", fontSize: 64, color: C.cyan, transform: "rotate(-2deg)" }}>{text}</div>
        </div>
    );
}

function Footer() {
    return (
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: `26px ${PAD}px`, background: "rgba(0,0,0,0.35)", borderTop: "2px solid rgba(138,92,255,0.5)", color: C.muted, fontSize: 26, fontWeight: 600 }}>
            <div style={{ display: "flex" }}>{brand.welcome.toUpperCase()} · ALL ARE WELCOME</div>
            <div style={{ display: "flex", color: C.white, fontWeight: 800 }}>beyondlinedance.com</div>
        </div>
    );
}

function Panel({ title, children }: { title: string; children: React.ReactNode }) {
    return (
        <div style={{ display: "flex", flexDirection: "column", padding: "22px 30px 10px", borderRadius: 22, background: C.panel, border: "2px solid rgba(138,92,255,0.55)", boxShadow: "0 0 40px rgba(138,92,255,0.25)" }}>
            <div style={{ display: "flex", color: C.cyan, fontSize: 22, fontWeight: 800, letterSpacing: 5 }}>{title}</div>
            {children}
        </div>
    );
}

function LessonRow({ l, last }: { l: CardLesson; last: boolean }) {
    return (
        <div style={{ display: "flex", alignItems: "center", gap: 24, padding: "20px 0", borderBottom: last ? "none" : `1px solid ${C.line}` }}>
            <div style={{ display: "flex", width: 150, color: C.orange, fontSize: 30, fontWeight: 800 }}>{l.time}</div>
            <div style={{ display: "block", flex: 1, color: C.white, fontSize: 38, fontWeight: 800, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{l.dance}</div>
            {l.level && (
                <div style={{ display: "flex", padding: "6px 16px", borderRadius: 999, border: `2px solid ${C.purple}`, color: C.white, fontSize: 21, fontWeight: 600 }}>{l.level}</div>
            )}
        </div>
    );
}

function ClassRow({ c, compact }: { c: CardClass; compact: boolean }) {
    return (
        <div style={{ display: "flex", alignItems: "flex-start", gap: 22, padding: compact ? "5px 0" : "8px 0", opacity: c.cancelled ? 0.5 : 1 }}>
            <div style={{ display: "flex", width: 140, paddingTop: 4, color: C.orange, fontSize: compact ? 25 : 27, fontWeight: 800 }}>{c.time}</div>
            <div style={{ display: "flex", flexDirection: "column", flex: 1, overflow: "hidden" }}>
                <div style={{ display: "flex", color: C.white, fontSize: compact ? 29 : 32, fontWeight: 800, textDecoration: c.cancelled ? "line-through" : "none" }}>
                    {c.title}
                    {c.substitute && !c.cancelled && <span style={{ marginLeft: 12, color: C.cyan, fontWeight: 600 }}>with {c.substitute}</span>}
                </div>
                <div style={{ display: "block", color: C.muted, fontSize: compact ? 21 : 23, fontWeight: 500, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                    {[c.venue, c.cancelled ? "Cancelled" : c.detail].filter(Boolean).join(" · ")}
                </div>
            </div>
        </div>
    );
}

// ── Layouts ──────────────────────────────────────────────────────────────────

function LessonCard({ card, logo, photo }: { card: Extract<CardData, { type: "lesson" }>; logo: string; photo: string }) {
    const shown = card.lessons.slice(0, 4);
    const more = card.lessons.length - shown.length;
    const [day, ...rest] = card.date.split(" ");
    return (
        <div style={{ position: "relative", display: "flex", flexDirection: "column", width: CARD_WIDTH, height: CARD_HEIGHT }}>
            <Backdrop logo={logo} photo={photo} height={740} />
            {card.price && <PriceBadge price={card.price} />}
            <div style={{ display: "flex", flexDirection: "column", padding: `0 ${PAD}px`, marginTop: 380 }}>
                <DateLine day={day} date={rest.join(" ")} time={card.startTime} />
                <div style={{ display: "flex", marginTop: 10 }}><Headline text={card.venue ?? card.title} /></div>
                <div style={{ display: "flex", marginTop: -6, marginLeft: -6 }}><Brush text={`${card.when}!`} size={112} /></div>
                <div style={{ display: "flex", marginTop: 14, color: C.muted, fontSize: 28, fontWeight: 600, letterSpacing: 1 }}>
                    {[card.venue ? card.title : null, card.level, card.substitute ? `With ${card.substitute}` : null].filter(Boolean).join("  ·  ")}
                </div>
                {shown.length > 0 && (
                    <div style={{ display: "flex", flexDirection: "column", marginTop: 26 }}>
                        <Panel title={`${card.when.toUpperCase()}'S DANCES`}>
                            {shown.map((l, i) => <LessonRow key={i} l={l} last={i === shown.length - 1 && more === 0} />)}
                            {more > 0 && <div style={{ display: "flex", padding: "12px 0", color: C.muted, fontSize: 24 }}>+ {more} more</div>}
                        </Panel>
                    </div>
                )}
            </div>
            <Cta text="Come dance with us!" />
            <Footer />
        </div>
    );
}

function CancellationCard({ card, logo, photo }: { card: Extract<CardData, { type: "cancellation" }>; logo: string; photo: string }) {
    const [day, ...rest] = card.date.split(" ");
    return (
        <div style={{ position: "relative", display: "flex", flexDirection: "column", width: CARD_WIDTH, height: CARD_HEIGHT }}>
            <Backdrop logo={logo} photo={photo} height={800} />
            <div style={{ display: "flex", flexDirection: "column", padding: `0 ${PAD}px`, marginTop: 500 }}>
                <DateLine day={day} date={rest.join(" ")} time={card.startTime} />
                <div style={{ display: "flex", marginTop: 12, fontWeight: 900, fontStyle: "italic", fontSize: 128, lineHeight: 1, letterSpacing: -2, backgroundImage: neon, backgroundClip: "text", color: "transparent", paddingRight: 20 }}>CANCELLED</div>
                <div style={{ display: "flex", marginTop: 18 }}><Headline text={card.venue ?? card.title} /></div>
                <div style={{ display: "flex", marginTop: 10, color: C.muted, fontSize: 30, fontWeight: 600 }}>{card.venue ? card.title : ""}</div>
                {card.note && (
                    <div style={{ display: "flex", marginTop: 30, padding: "22px 28px", borderRadius: 18, background: C.panel, border: "2px solid rgba(138,92,255,0.55)", color: C.white, fontSize: 32, fontWeight: 600, lineHeight: 1.35 }}>{card.note}</div>
                )}
            </div>
            <Cta text="See you next time!" />
            <Footer />
        </div>
    );
}

function WeeklyCard({ card, logo, photo }: { card: Extract<CardData, { type: "weekly" }>; logo: string; photo: string }) {
    const rows = card.days.reduce((n, d) => n + d.classes.length, 0);
    const compact = rows > 5;
    return (
        <div style={{ position: "relative", display: "flex", flexDirection: "column", width: CARD_WIDTH, height: CARD_HEIGHT }}>
            <Backdrop logo={logo} photo={photo} height={compact ? 520 : 600} />
            <div style={{ display: "flex", flexDirection: "column", padding: `0 ${PAD}px`, marginTop: compact ? 236 : 286 }}>
                <div style={{ display: "flex", color: C.orange, fontSize: 36, fontWeight: 800, letterSpacing: 1 }}>{card.range.toUpperCase()}</div>
                <div style={{ display: "flex", marginTop: 6 }}><Headline text="This Week" /></div>
                <div style={{ display: "flex", marginTop: -8, marginLeft: -6 }}><Brush text="Line Dance Classes" size={86} rotate={-3} /></div>
                <div style={{ display: "flex", flexDirection: "column", marginTop: 18 }}>
                    <Panel title="SCHEDULE">
                        <div style={{ display: "flex", flexDirection: "column", marginTop: 6 }}>
                            {card.days.map((d, i) => (
                                <div key={d.day} style={{ display: "flex", gap: 18, padding: compact ? "6px 0" : "10px 0", borderTop: i === 0 ? "none" : `1px solid ${C.line}` }}>
                                    <div style={{ display: "flex", width: 84, paddingTop: compact ? 9 : 12, color: C.cyan, fontSize: compact ? 25 : 27, fontWeight: 800, letterSpacing: 2 }}>{d.day.split(" ")[0]}</div>
                                    <div style={{ display: "flex", flexDirection: "column", flex: 1 }}>
                                        {d.classes.map((c, j) => <ClassRow key={j} c={c} compact={compact} />)}
                                    </div>
                                </div>
                            ))}
                            {card.days.length === 0 && <div style={{ display: "flex", padding: "12px 0", color: C.muted, fontSize: 30 }}>No classes this week.</div>}
                        </div>
                    </Panel>
                </div>
            </div>
            <Cta text="Come dance with us!" />
            <Footer />
        </div>
    );
}

/** The PNG for a post's card. */
export async function renderCard(card: CardData): Promise<ImageResponse> {
    const { fonts, logo, photo } = await loadAssets();
    return new ImageResponse(
        (
            <div style={{ display: "flex", width: CARD_WIDTH, height: CARD_HEIGHT, fontFamily: "Montserrat", background: `radial-gradient(circle at 85% 95%, rgba(255,62,165,0.28) 0%, rgba(11,6,20,0) 45%), linear-gradient(180deg, ${C.ink} 0%, ${C.ink} 60%, ${C.violet} 100%)` }}>
                {card.type === "lesson" && <LessonCard card={card} logo={logo} photo={photo} />}
                {card.type === "cancellation" && <CancellationCard card={card} logo={logo} photo={photo} />}
                {card.type === "weekly" && <WeeklyCard card={card} logo={logo} photo={photo} />}
            </div>
        ),
        { width: CARD_WIDTH, height: CARD_HEIGHT, fonts },
    );
}
