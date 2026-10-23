// The WhatsApp version of a post's image: 1080×1350, styled after the event cards on beyondlinedance.com
// (dance-folly-website, src/components/event-card): a white card on lavender with a calendar badge,
// title, level and time range, price and venue, and lessons colored by level. Light on purpose, so it
// reads differently from the dark Facebook card (lib/card.tsx). Same card data, different look.

import { ImageResponse } from "next/og";
import { brand } from "./config";
import { asset, CARD_WIDTH, loadShared } from "./card";
import type { CardClass, CardData, CardLesson } from "./drafts";

const PURPLE = "#8A5CFF";
const INK = "#111111";
const MUTED = "#555555";

/** The website's lesson colors (lesson-list.module.css), by level. */
function levelColors(level: string | null): { bg: string; border: string } {
    const l = (level ?? "").toLowerCase();
    if (l.includes("absolute")) return { bg: "#ffcef2", border: "#e9c3df" };
    if (l.includes("beginner")) return { bg: "#d9e3ff", border: "#aabfff" };
    if (l.includes("improver") || l.includes("novice") || l.includes("easy")) return { bg: "#d2ffd4", border: "#83ff88" };
    if (l.includes("intermediate")) return { bg: "#fff6d4", border: "#ffeb9a" };
    if (l.includes("advanced")) return { bg: "#ffcece", border: "#ffa8a8" };
    return { bg: "#dddddd", border: "#aaaaaa" };
}

let logo: Promise<string> | null = null;
function loadLogo() {
    logo ??= asset("brand", "Logo.png").then((b) => `data:image/png;base64,${b.toString("base64")}`);
    return logo;
}

/** "2026-10-26" → weekday / 26 / month, for the calendar badge. Falls back to the card's date text. */
function badgeParts(ymd: string | undefined, fallback: string) {
    if (ymd) {
        const d = new Date(`${ymd}T12:00:00Z`);
        const fmt = (o: Intl.DateTimeFormatOptions) => d.toLocaleDateString("en-US", { timeZone: "UTC", ...o });
        return { week: fmt({ weekday: "long" }), day: fmt({ day: "2-digit" }), month: fmt({ month: "long" }) };
    }
    const [week = "", month = "", day = ""] = fallback.split(" ");
    return { week, day, month };
}

// ── Pieces ───────────────────────────────────────────────────────────────────

function CalendarBadge({ week, day, month, small = false }: { week: string; day: string; month: string; small?: boolean }) {
    return (
        <div style={{
            display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
            width: small ? 124 : 220, minHeight: small ? 108 : 230, padding: small ? 8 : 18,
            background: "rgba(153,171,255,0.25)", border: "4px solid rgba(153,171,255,0.5)", borderRadius: small ? 20 : 30,
        }}>
            <div style={{ display: "flex", color: PURPLE, fontSize: small ? 15 : 22, fontWeight: 800, letterSpacing: 1, textTransform: "uppercase" }}>{week}</div>
            <div style={{ display: "flex", color: INK, fontSize: small ? 48 : 92, fontWeight: 800, lineHeight: 1 }}>{day}</div>
            <div style={{ display: "flex", color: INK, fontSize: small ? 18 : 26, fontWeight: 600 }}>{month}</div>
        </div>
    );
}

function Header({ logoSrc, subtitle }: { logoSrc: string; subtitle: string }) {
    return (
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", paddingTop: 44 }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={logoSrc} width={440} height={165} alt="" />
            <div style={{ display: "flex", marginTop: 6, color: PURPLE, fontSize: 30, fontWeight: 800, letterSpacing: 4, textTransform: "uppercase" }}>{subtitle}</div>
        </div>
    );
}

function Footer() {
    return (
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: "auto", padding: "26px 60px 34px", color: MUTED, fontSize: 26, fontWeight: 600 }}>
            <div style={{ display: "flex" }}>{brand.welcome} · All are welcome</div>
            <div style={{ display: "flex", color: PURPLE, fontWeight: 800 }}>beyondlinedance.com</div>
        </div>
    );
}

/** The white card, with an optional red "cancelled" overlay like the website's. */
function Card({ children, cancelled, cancelNote }: { children: React.ReactNode; cancelled?: boolean; cancelNote?: string | null }) {
    return (
        <div style={{
            position: "relative", display: "flex", flexDirection: "column", gap: 26, margin: "28px 48px 0", padding: 40,
            background: "#ffffff", border: "3px solid #e5e7eb", borderRadius: 40, boxShadow: "0 6px 24px rgba(60,40,120,0.12)", overflow: "hidden",
        }}>
            {children}
            {cancelled && (
                <div style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 14, padding: 40, background: "rgba(217,19,19,0.85)" }}>
                    <div style={{ display: "flex", color: "#ffe0e0", fontSize: 76, fontWeight: 800 }}>Event is Cancelled</div>
                    {cancelNote && <div style={{ display: "flex", marginTop: 8, color: "#ffe0e0", fontSize: 34, fontWeight: 600, lineHeight: 1.35, textAlign: "center", maxWidth: 780 }}>{cancelNote}</div>}
                </div>
            )}
        </div>
    );
}

function EventInfo({ ymd, date, title, level, timeRange, substitute }: { ymd?: string; date: string; title: string; level: string | null; timeRange: string; substitute: string | null }) {
    const b = badgeParts(ymd, date);
    return (
        <div style={{ display: "flex", alignItems: "center", gap: 34 }}>
            <CalendarBadge {...b} />
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", flex: 1, textAlign: "center" }}>
                <div style={{ display: "flex", color: INK, fontSize: title.length > 22 ? 44 : 54, fontWeight: 800, lineHeight: 1.1, textAlign: "center" }}>{title}</div>
                {level && <div style={{ display: "flex", marginTop: 6, color: "#333", fontSize: 28, fontWeight: 500 }}>{level}</div>}
                <div style={{ display: "flex", marginTop: 16, color: "#333", fontSize: 36, fontWeight: 800 }}>{timeRange}</div>
                {substitute && (
                    <div style={{ display: "flex", marginTop: 14, paddingTop: 12, borderTop: "2px solid #e5e7eb", gap: 10, color: MUTED, fontSize: 26, fontWeight: 600 }}>
                        <span style={{ color: PURPLE, fontWeight: 800, letterSpacing: 2 }}>SUB:</span> {substitute}
                    </div>
                )}
            </div>
        </div>
    );
}

function PriceAndVenue({ price, venue, address }: { price: string | null; venue: string | null; address: string | null }) {
    return (
        <div style={{ display: "flex", alignItems: "center", gap: 30, paddingTop: 22, borderTop: "2px solid #f0f0f4" }}>
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", width: 220 }}>
                <div style={{ display: "flex", color: MUTED, fontSize: 22, fontWeight: 600 }}>Price</div>
                <div style={{ display: "flex", color: INK, fontSize: 48, fontWeight: 900, fontStyle: "italic" }}>{price ?? "-"}</div>
            </div>
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", flex: 1, textAlign: "center" }}>
                <div style={{ display: "flex", color: INK, fontSize: 34, fontWeight: 600 }}>{venue ?? "Venue TBA"}</div>
                {address && <div style={{ display: "flex", color: MUTED, fontSize: 24, fontWeight: 500, textAlign: "center" }}>{address}</div>}
            </div>
        </div>
    );
}

function SpecialNote({ text }: { text: string }) {
    return (
        <div style={{ display: "flex", margin: "0 -40px", padding: "20px 40px", background: "linear-gradient(135deg, #f97316, #ea580c)", color: "#ffffff", fontSize: 28, fontWeight: 700, lineHeight: 1.4 }}>
            {text}
        </div>
    );
}

function LessonRows({ lessons }: { lessons: CardLesson[] }) {
    const shown = lessons.slice(0, 5);
    return (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {shown.map((l, i) => {
                const c = levelColors(l.level);
                return (
                    <div key={i} style={{ display: "flex", gap: 10 }}>
                        <div style={{ display: "flex", alignItems: "center", justifyContent: "flex-end", width: 210, padding: "0 20px", borderRadius: 24, border: "4px solid #aaaaaa", background: "#dddddd", color: INK, fontSize: 32, fontWeight: 800 }}>{l.time}</div>
                        <div style={{ display: "flex", flexDirection: "column", flex: 1, padding: "8px 22px 10px", borderRadius: 24, border: `4px solid ${c.border}`, background: c.bg, overflow: "hidden" }}>
                            <div style={{ display: "flex", color: MUTED, fontSize: 19, fontWeight: 800 }}>{l.level ?? "Unknown level"}</div>
                            <div style={{ display: "block", color: INK, fontSize: 36, fontWeight: 600, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{l.dance}</div>
                        </div>
                    </div>
                );
            })}
            {lessons.length > shown.length && <div style={{ display: "flex", color: MUTED, fontSize: 26 }}>+ {lessons.length - shown.length} more</div>}
        </div>
    );
}

function WeeklyRow({ ymd, day, c }: { ymd?: string; day: string; c: CardClass }) {
    const b = badgeParts(ymd, day);
    return (
        <div style={{ display: "flex", alignItems: "center", gap: 22, padding: "6px 0", opacity: c.cancelled ? 0.45 : 1 }}>
            <CalendarBadge {...b} small />
            <div style={{ display: "flex", flexDirection: "column", flex: 1, overflow: "hidden" }}>
                <div style={{ display: "flex", color: INK, fontSize: 30, fontWeight: 800, textDecoration: c.cancelled ? "line-through" : "none" }}>{c.title}</div>
                <div style={{ display: "flex", color: "#333", fontSize: 26, fontWeight: 700 }}>
                    {c.time}{c.cancelled ? " · Cancelled" : c.substitute ? ` · Sub: ${c.substitute}` : ""}
                </div>
                <div style={{ display: "block", color: MUTED, fontSize: 22, fontWeight: 500, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                    {[c.venue, c.detail].filter(Boolean).join(" · ")}
                </div>
            </div>
        </div>
    );
}

// ── Layouts ──────────────────────────────────────────────────────────────────

const range = (start: string, end?: string | null) => (end ? `${start} – ${end}` : start);

const column: React.CSSProperties = { display: "flex", flexDirection: "column" };

const MAX_WEEKLY_ROWS = 7;
function weeklyRows(card: Extract<CardData, { type: "weekly" }>) {
    return card.days.flatMap((d) => d.classes.map((c) => ({ ymd: d.ymd, day: d.day, c }))).slice(0, MAX_WEEKLY_ROWS);
}

/** Image height for the content: header, the card's parts, and the footer (estimates, in px). */
function heightFor(card: CardData): number {
    const HEADER = 300, CARD_PAD = 80 + 28, FOOTER = 110, GAP = 26;
    const INFO = 230 + (card.type !== "weekly" && card.title.length > 22 ? 50 : 0), PRICE_VENUE = 112;
    let h: number;
    if (card.type === "weekly") h = HEADER + CARD_PAD + Math.max(1, weeklyRows(card).length) * 152 + FOOTER;
    else if (card.type === "cancellation") h = HEADER + CARD_PAD + INFO + GAP + PRICE_VENUE + FOOTER;
    else {
        const lessons = Math.min(card.lessons.length, 5);
        h = HEADER + CARD_PAD + INFO + GAP + PRICE_VENUE
            + (card.note ? GAP + 110 : 0)
            + (lessons ? GAP + lessons * 102 + (card.lessons.length > 5 ? 40 : 0) : 0)
            + FOOTER;
    }
    return Math.min(1700, Math.max(900, Math.round(h)));
}

function body(card: CardData, logoSrc: string) {
    if (card.type === "weekly") {
        const rows = weeklyRows(card);
        return (
            <div style={column}>
                <Header logoSrc={logoSrc} subtitle={`This week · ${card.range}`} />
                <Card>
                    {rows.length === 0 && <div style={{ display: "flex", color: MUTED, fontSize: 32 }}>No classes this week.</div>}
                    {rows.map((r, i) => <WeeklyRow key={i} ymd={r.ymd} day={r.day} c={r.c} />)}
                </Card>
            </div>
        );
    }
    if (card.type === "cancellation") {
        return (
            <div style={column}>
                <Header logoSrc={logoSrc} subtitle="Class cancelled" />
                <Card cancelled cancelNote={card.note}>
                    <EventInfo ymd={card.ymd} date={card.date} title={card.title} level={card.level ?? null} timeRange={range(card.startTime, card.endTime)} substitute={null} />
                    <PriceAndVenue price={card.price ?? null} venue={card.venue} address={card.address ?? null} />
                </Card>
            </div>
        );
    }
    const when = card.when ?? "Tonight";
    return (
        <div style={column}>
            <Header logoSrc={logoSrc} subtitle={`Line dancing ${when.toLowerCase()}`} />
            <Card>
                <EventInfo ymd={card.ymd} date={card.date} title={card.title} level={card.level} timeRange={range(card.startTime, card.endTime)} substitute={card.substitute} />
                <PriceAndVenue price={card.price} venue={card.venue} address={card.address ?? null} />
                {card.note && <SpecialNote text={card.note} />}
                {card.lessons.length > 0 && <LessonRows lessons={card.lessons} />}
            </Card>
        </div>
    );
}

/** The PNG of a post's WhatsApp event card. */
export async function renderEventCard(card: CardData): Promise<ImageResponse> {
    const [{ fonts }, logoSrc] = await Promise.all([loadShared(), loadLogo()]);
    const height = heightFor(card);
    return new ImageResponse(
        (
            <div style={{ display: "flex", flexDirection: "column", width: CARD_WIDTH, height, fontFamily: "Montserrat", background: "linear-gradient(180deg, #F6F3FF 0%, #ECE6FF 100%)" }}>
                {body(card, logoSrc)}
                <Footer />
            </div>
        ),
        { width: CARD_WIDTH, height, fonts },
    );
}

