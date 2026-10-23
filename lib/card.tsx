// The branded image posted with each post: 1080×1350 (4:5 portrait, the largest the Facebook feed shows).
// Styled after the Intermediate Social poster: photo fading into a dark page, heavy italic white type, a
// brush script with a swoosh, highlighted dates and a neon price badge. Colors and photo come from the
// class's style (lib/styles.ts); the layout is shared.
// Drawn with next/og (Satori): flexbox only, no emoji, fonts and images loaded from assets/.

import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { ImageResponse } from "next/og";
import { brand } from "./config";
import type { CardClass, CardData, CardLesson, CardStyle } from "./drafts";
import { PHOTOS, THEMES, type PhotoId, type Theme } from "./styles";

export const CARD_WIDTH = 1080;
export const CARD_HEIGHT = 1350;
const PAD = 64;

/** Hex color with an alpha, for glows and translucent panels. */
function alpha(hex: string, a: number): string {
    const n = parseInt(hex.slice(1), 16);
    return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${a})`;
}

function palette(t: Theme) {
    return {
        ink: t.ink, deep: t.deep, accent: t.accent, swoosh: t.swoosh, highlight: t.highlight, brushFrom: t.brushFrom,
        brush: `linear-gradient(90deg, ${t.brushFrom} 0%, ${t.brushTo} 100%)`,
        white: "#FFFFFF",
        muted: "rgba(255,255,255,0.74)",
        line: "rgba(255,255,255,0.12)",
        panel: alpha(t.ink, 0.8),
        edge: alpha(t.accent, 0.55),
        glow: alpha(t.accent, 0.25),
    };
}
type Palette = ReturnType<typeof palette>;

/** Everything a layout needs to draw: colors, the logo and the photo. */
interface Look { c: Palette; logo: string; photo: string }

type Fonts = NonNullable<NonNullable<ConstructorParameters<typeof ImageResponse>[1]>["fonts"]>;

const asset = (...p: string[]) => readFile(join(process.cwd(), "assets", ...p));

let shared: Promise<{ fonts: Fonts; logo: string }> | null = null;
function loadShared() {
    shared ??= (async () => {
        const [medium, semi, extra, blackItalic, brush, logo] = await Promise.all([
            asset("fonts", "Montserrat-Medium.ttf"), asset("fonts", "Montserrat-SemiBold.ttf"),
            asset("fonts", "Montserrat-ExtraBold.ttf"), asset("fonts", "Montserrat-BlackItalic.ttf"),
            asset("fonts", "KaushanScript-Regular.ttf"), asset("brand", "Logo_white.png"),
        ]);
        const fonts: Fonts = [
            { name: "Montserrat", data: medium, weight: 500, style: "normal" },
            { name: "Montserrat", data: semi, weight: 600, style: "normal" },
            { name: "Montserrat", data: extra, weight: 800, style: "normal" },
            { name: "Montserrat", data: blackItalic, weight: 900, style: "italic" },
            { name: "Brush", data: brush, weight: 400, style: "normal" },
        ];
        return { fonts, logo: `data:image/png;base64,${logo.toString("base64")}` };
    })();
    return shared;
}

const photos = new Map<PhotoId, Promise<string>>();
function loadPhoto(id: PhotoId): Promise<string> {
    if (!photos.has(id)) photos.set(id, asset("photos", PHOTOS[id].file).then((b) => `data:image/jpeg;base64,${b.toString("base64")}`));
    return photos.get(id)!;
}

// ── Pieces ───────────────────────────────────────────────────────────────────

/** The photo fading into the page, with the logo on top. */
function Backdrop({ k, height }: { k: Look; height: number }) {
    return (
        <div style={{ position: "absolute", top: 0, left: 0, display: "flex", width: CARD_WIDTH, height }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={k.photo} width={CARD_WIDTH} height={height} style={{ position: "absolute", objectFit: "cover", objectPosition: "50% 40%" }} alt="" />
            <div style={{ position: "absolute", display: "flex", width: CARD_WIDTH, height, background: `linear-gradient(180deg, ${alpha(k.c.ink, 0.7)} 0%, ${alpha(k.c.ink, 0.1)} 30%, ${alpha(k.c.ink, 0.45)} 65%, ${k.c.ink} 100%)` }} />
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={k.logo} width={430} height={162} style={{ position: "absolute", left: PAD - 8, top: 44 }} alt="" />
        </div>
    );
}

/** Brush script in the theme's gradient, with a swoosh under it. */
function Brush({ k, text, size = 120, rotate = -5 }: { k: Look; text: string; size?: number; rotate?: number }) {
    const width = Math.round(text.length * size * 0.42);
    return (
        <div style={{ display: "flex", flexDirection: "column", alignSelf: "flex-start", transform: `rotate(${rotate}deg)` }}>
            <div style={{ display: "flex", fontFamily: "Brush", fontSize: size, lineHeight: 1.1, paddingRight: 24, backgroundImage: k.c.brush, backgroundClip: "text", color: "transparent" }}>{text}</div>
            <svg width={width} height={34} viewBox={`0 0 ${width} 34`} style={{ marginTop: -18, marginLeft: 18 }}>
                <path d={`M6 26 C ${width * 0.3} 6, ${width * 0.7} 4, ${width - 6} 14`} stroke={k.c.swoosh} strokeWidth={10} strokeLinecap="round" fill="none" />
            </svg>
        </div>
    );
}

/** A tilted neon disc with the price, like the poster's admission stamp. */
function PriceBadge({ k, price }: { k: Look; price: string }) {
    const big = price.length <= 4;
    return (
        <div style={{
            position: "absolute", top: 40, right: PAD - 10, width: 196, height: 196, borderRadius: 999,
            display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
            background: `radial-gradient(circle, ${alpha(k.c.deep, 0.95)} 55%, ${alpha(k.c.accent, 0.9)} 100%)`,
            border: `5px solid ${k.c.brushFrom}`, boxShadow: `0 0 34px ${k.c.brushFrom}`, transform: "rotate(-10deg)",
        }}>
            <div style={{ display: "flex", color: k.c.white, fontWeight: 900, fontStyle: "italic", fontSize: big ? 58 : 40, lineHeight: 1 }}>{price}</div>
            <div style={{ display: "flex", marginTop: 6, color: k.c.swoosh, fontSize: 18, fontWeight: 800, letterSpacing: 3 }}>ADMISSION</div>
        </div>
    );
}

/** "MONDAY OCT 26 · 5:00 PM" with the date highlighted. */
function DateLine({ k, day, date, time }: { k: Look; day: string; date: string; time?: string }) {
    return (
        <div style={{ display: "flex", alignItems: "baseline", gap: 14, fontSize: 40, fontWeight: 800, letterSpacing: 1 }}>
            <span style={{ color: k.c.white }}>{day}</span>
            <span style={{ color: k.c.highlight }}>{date}</span>
            {time && <span style={{ color: k.c.white }}>· {time}</span>}
        </div>
    );
}

/** Headline size for a line of heavy italic caps: as big as fits on one line, down to 70px (then it wraps). */
function headlineSize(text: string): number {
    return text.length <= 16 ? 92 : text.length <= 18 ? 80 : 70;
}

/** True when the headline needs two lines even at its smallest size. */
const headlineWraps = (text: string) => text.length > 21;

function Headline({ k, text }: { k: Look; text: string }) {
    const size = headlineSize(text);
    return (
        <div style={{ display: "flex", color: k.c.white, fontWeight: 900, fontStyle: "italic", fontSize: size, lineHeight: 0.98, letterSpacing: -1, textTransform: "uppercase" }}>
            {text}
        </div>
    );
}

/** Brush-script invitation sitting just above the footer. */
function Cta({ k, text }: { k: Look; text: string }) {
    return (
        <div style={{ display: "flex", justifyContent: "center", marginTop: "auto", paddingBottom: 26 }}>
            <div style={{ display: "flex", fontFamily: "Brush", fontSize: 64, color: k.c.swoosh, transform: "rotate(-2deg)" }}>{text}</div>
        </div>
    );
}

function Footer({ k }: { k: Look }) {
    return (
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: `26px ${PAD}px`, background: "rgba(0,0,0,0.35)", borderTop: `2px solid ${k.c.edge}`, color: k.c.muted, fontSize: 26, fontWeight: 600 }}>
            <div style={{ display: "flex" }}>{brand.welcome.toUpperCase()} · ALL ARE WELCOME</div>
            <div style={{ display: "flex", color: k.c.white, fontWeight: 800 }}>beyondlinedance.com</div>
        </div>
    );
}

function Panel({ k, title, children }: { k: Look; title: string; children: React.ReactNode }) {
    return (
        <div style={{ display: "flex", flexDirection: "column", padding: "22px 30px 10px", borderRadius: 22, background: k.c.panel, border: `2px solid ${k.c.edge}`, boxShadow: `0 0 40px ${k.c.glow}` }}>
            <div style={{ display: "flex", color: k.c.swoosh, fontSize: 22, fontWeight: 800, letterSpacing: 5 }}>{title}</div>
            {children}
        </div>
    );
}

function LessonRow({ k, l, last, compact }: { k: Look; l: CardLesson; last: boolean; compact: boolean }) {
    return (
        <div style={{ display: "flex", alignItems: "center", gap: 24, padding: compact ? "15px 0" : "20px 0", borderBottom: last ? "none" : `1px solid ${k.c.line}` }}>
            <div style={{ display: "flex", width: 150, color: k.c.highlight, fontSize: 30, fontWeight: 800 }}>{l.time}</div>
            <div style={{ display: "block", flex: 1, color: k.c.white, fontSize: 38, fontWeight: 800, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{l.dance}</div>
            {l.level && (
                <div style={{ display: "flex", padding: "6px 16px", borderRadius: 999, border: `2px solid ${k.c.accent}`, color: k.c.white, fontSize: 21, fontWeight: 600 }}>{l.level}</div>
            )}
        </div>
    );
}

function ClassRow({ k, c, compact }: { k: Look; c: CardClass; compact: boolean }) {
    return (
        <div style={{ display: "flex", alignItems: "flex-start", gap: 22, padding: compact ? "5px 0" : "8px 0", opacity: c.cancelled ? 0.5 : 1 }}>
            <div style={{ display: "flex", width: 140, paddingTop: 4, color: k.c.highlight, fontSize: compact ? 25 : 27, fontWeight: 800 }}>{c.time}</div>
            <div style={{ display: "flex", flexDirection: "column", flex: 1, overflow: "hidden" }}>
                <div style={{ display: "flex", color: k.c.white, fontSize: compact ? 29 : 32, fontWeight: 800, textDecoration: c.cancelled ? "line-through" : "none" }}>
                    {c.title}
                    {c.substitute && !c.cancelled && <span style={{ marginLeft: 12, color: k.c.swoosh, fontWeight: 600 }}>with {c.substitute}</span>}
                </div>
                <div style={{ display: "block", color: k.c.muted, fontSize: compact ? 21 : 23, fontWeight: 500, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                    {[c.venue, c.cancelled ? "Cancelled" : c.detail].filter(Boolean).join(" · ")}
                </div>
            </div>
        </div>
    );
}

// ── Layouts ──────────────────────────────────────────────────────────────────

function LessonCard({ k, card, style }: { k: Look; card: Extract<CardData, { type: "lesson" }>; style: CardStyle }) {
    // Posts drafted before this layout have no when/date; their next redraft adds them.
    const when = card.when ?? "Tonight";
    const shown = card.lessons.slice(0, 4);
    const more = card.lessons.length - shown.length;
    const [day, ...rest] = (card.date ?? "").split(" ");
    // A venue name that wraps, or a long headline, takes room: start higher and tighten the rows.
    const longVenue = headlineWraps(card.venue ?? card.title);
    const longHeadline = style.headline.length > 12;
    const compact = longVenue || longHeadline;
    return (
        <div style={{ position: "relative", display: "flex", flexDirection: "column", width: CARD_WIDTH, height: CARD_HEIGHT }}>
            <Backdrop k={k} height={740} />
            {card.price && <PriceBadge k={k} price={card.price} />}
            <div style={{ display: "flex", flexDirection: "column", padding: `0 ${PAD}px`, marginTop: longVenue ? 330 : 380 }}>
                <DateLine k={k} day={day} date={rest.join(" ")} time={card.startTime} />
                <div style={{ display: "flex", marginTop: 10 }}><Headline k={k} text={card.venue ?? card.title} /></div>
                <div style={{ display: "flex", marginTop: -6, marginLeft: -6 }}><Brush k={k} text={style.headline} size={longHeadline ? 88 : 112} rotate={longHeadline ? -3 : -5} /></div>
                <div style={{ display: "flex", marginTop: longHeadline ? 22 : 14, color: k.c.muted, fontSize: 28, fontWeight: 600, letterSpacing: 1 }}>
                    {[card.venue ? card.title : null, card.level, card.substitute ? `With ${card.substitute}` : null].filter(Boolean).join("  ·  ")}
                </div>
                {shown.length > 0 && (
                    <div style={{ display: "flex", flexDirection: "column", marginTop: compact ? 20 : 26 }}>
                        <Panel k={k} title={`${when.toUpperCase()}'S DANCES`}>
                            {shown.map((l, i) => <LessonRow key={i} k={k} l={l} last={i === shown.length - 1 && more === 0} compact={compact} />)}
                            {more > 0 && <div style={{ display: "flex", padding: "12px 0", color: k.c.muted, fontSize: 24 }}>+ {more} more</div>}
                        </Panel>
                    </div>
                )}
            </div>
            <Cta k={k} text={style.cta} />
            <Footer k={k} />
        </div>
    );
}

function CancellationCard({ k, card, style }: { k: Look; card: Extract<CardData, { type: "cancellation" }>; style: CardStyle }) {
    const [day, ...rest] = (card.date ?? "").split(" ");
    return (
        <div style={{ position: "relative", display: "flex", flexDirection: "column", width: CARD_WIDTH, height: CARD_HEIGHT }}>
            <Backdrop k={k} height={800} />
            <div style={{ display: "flex", flexDirection: "column", padding: `0 ${PAD}px`, marginTop: 500 }}>
                <DateLine k={k} day={day} date={rest.join(" ")} time={card.startTime} />
                <div style={{ display: "flex", marginTop: 12, fontWeight: 900, fontStyle: "italic", fontSize: 128, lineHeight: 1, letterSpacing: -2, backgroundImage: k.c.brush, backgroundClip: "text", color: "transparent", paddingRight: 20 }}>CANCELLED</div>
                <div style={{ display: "flex", marginTop: 18 }}><Headline k={k} text={card.venue ?? card.title} /></div>
                <div style={{ display: "flex", marginTop: 10, color: k.c.muted, fontSize: 30, fontWeight: 600 }}>{card.venue ? card.title : ""}</div>
                {card.note && (
                    <div style={{ display: "flex", marginTop: 30, padding: "22px 28px", borderRadius: 18, background: k.c.panel, border: `2px solid ${k.c.edge}`, color: k.c.white, fontSize: 32, fontWeight: 600, lineHeight: 1.35 }}>{card.note}</div>
                )}
            </div>
            <Cta k={k} text={style.cta} />
            <Footer k={k} />
        </div>
    );
}

function WeeklyCard({ k, card, style }: { k: Look; card: Extract<CardData, { type: "weekly" }>; style: CardStyle }) {
    const rows = card.days.reduce((n, d) => n + d.classes.length, 0);
    const compact = rows > 5;
    return (
        <div style={{ position: "relative", display: "flex", flexDirection: "column", width: CARD_WIDTH, height: CARD_HEIGHT }}>
            <Backdrop k={k} height={compact ? 520 : 600} />
            <div style={{ display: "flex", flexDirection: "column", padding: `0 ${PAD}px`, marginTop: compact ? 236 : 286 }}>
                <div style={{ display: "flex", color: k.c.highlight, fontSize: 36, fontWeight: 800, letterSpacing: 1 }}>{card.range.toUpperCase()}</div>
                <div style={{ display: "flex", marginTop: 6 }}><Headline k={k} text="This Week" /></div>
                <div style={{ display: "flex", marginTop: -8, marginLeft: -6 }}><Brush k={k} text={style.headline} size={86} rotate={-3} /></div>
                <div style={{ display: "flex", flexDirection: "column", marginTop: 18 }}>
                    <Panel k={k} title="SCHEDULE">
                        <div style={{ display: "flex", flexDirection: "column", marginTop: 6 }}>
                            {card.days.map((d, i) => (
                                <div key={d.day} style={{ display: "flex", gap: 18, padding: compact ? "6px 0" : "10px 0", borderTop: i === 0 ? "none" : `1px solid ${k.c.line}` }}>
                                    <div style={{ display: "flex", width: 84, paddingTop: compact ? 9 : 12, color: k.c.swoosh, fontSize: compact ? 25 : 27, fontWeight: 800, letterSpacing: 2 }}>{d.day.split(" ")[0]}</div>
                                    <div style={{ display: "flex", flexDirection: "column", flex: 1 }}>
                                        {d.classes.map((c, j) => <ClassRow key={j} k={k} c={c} compact={compact} />)}
                                    </div>
                                </div>
                            ))}
                            {card.days.length === 0 && <div style={{ display: "flex", padding: "12px 0", color: k.c.muted, fontSize: 30 }}>No classes this week.</div>}
                        </div>
                    </Panel>
                </div>
            </div>
            <Cta k={k} text={style.cta} />
            <Footer k={k} />
        </div>
    );
}

/** Cards drafted before styles existed draw with the original look. */
function styleOf(card: CardData): CardStyle {
    const fallback: CardStyle = {
        theme: "neon", photo: "dance-floor",
        headline: card.type === "lesson" ? `${card.when ?? "Tonight"}!` : card.type === "weekly" ? "Line Dance Classes" : "Cancelled",
        cta: card.type === "cancellation" ? "See you next time!" : "Come dance with us!",
    };
    const s = { ...fallback, ...card.style };
    return { ...s, theme: s.theme in THEMES ? s.theme : "neon", photo: s.photo in PHOTOS ? s.photo : "dance-floor" };
}

/** The PNG for a post's card. */
export async function renderCard(card: CardData): Promise<ImageResponse> {
    const style = styleOf(card);
    const [{ fonts, logo }, photo] = await Promise.all([loadShared(), loadPhoto(style.photo)]);
    const k: Look = { c: palette(THEMES[style.theme]), logo, photo };
    return new ImageResponse(
        (
            <div style={{ display: "flex", width: CARD_WIDTH, height: CARD_HEIGHT, fontFamily: "Montserrat", background: `radial-gradient(circle at 85% 95%, ${alpha(k.c.brushFrom, 0.28)} 0%, ${alpha(k.c.ink, 0)} 45%), linear-gradient(180deg, ${k.c.ink} 0%, ${k.c.ink} 60%, ${k.c.deep} 100%)` }}>
                {card.type === "lesson" && <LessonCard k={k} card={card} style={style} />}
                {card.type === "cancellation" && <CancellationCard k={k} card={card} style={style} />}
                {card.type === "weekly" && <WeeklyCard k={k} card={card} style={style} />}
            </div>
        ),
        { width: CARD_WIDTH, height: CARD_HEIGHT, fonts },
    );
}
