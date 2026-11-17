import { and, eq, inArray } from "drizzle-orm";
import { NextResponse, type NextRequest } from "next/server";
import { closeEndedChallenges } from "@/lib/challenges";
import { refreshBadges } from "@/lib/data";
import { getDb, schema } from "@/lib/db";
import { notifyFamily, notifyUsers } from "@/lib/notify";
import { notices } from "@/lib/notices";

export const runtime = "nodejs";
export const maxDuration = 120;

/**
 * Runs every 15 minutes (vercel.json). For each parent: an evening nudge if tonight isn't planned or done,
 * a morning nudge if last night was planned but never logged, and challenge wrap-up once a day.
 * Vercel sends `Authorization: Bearer $CRON_SECRET`; anything else is refused.
 */
export async function GET(req: NextRequest) {
  const expected = process.env.CRON_SECRET;
  if (!expected || req.headers.get("authorization") !== `Bearer ${expected}`) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const db = await getDb();
  const now = new Date();
  const users = await db.select().from(schema.users);
  const sent = { evening: 0, morning: 0, winners: 0 };

  for (const u of users) {
    const s = u.settings;
    if (!s.eveningReminder && !s.morningReminder) continue;
    const local = localParts(now, s.timezone || "UTC");
    if (!local) continue;
    const nudges = { ...(s.nudges ?? {}) };
    let changed = false;

    if (s.eveningReminder && nudges.eveningSentOn !== local.date && withinWindow(local.minutes, s.eveningReminder)) {
      const [day] = await db.select().from(schema.days).where(and(eq(schema.days.familyId, u.familyId), eq(schema.days.date, local.date))).limit(1);
      if (!day || day.status === "open") {
        await notifyUsers([u.id], notices.eveningUnplanned());
        sent.evening++;
      } else if (day.status === "planned") {
        const [idea] = day.chosenIdeaId ? await db.select({ title: schema.ideas.title }).from(schema.ideas).where(eq(schema.ideas.id, day.chosenIdeaId)).limit(1) : [];
        await notifyUsers([u.id], notices.eveningPlanned(idea?.title ?? null));
        sent.evening++;
      }
      nudges.eveningSentOn = local.date;
      changed = true;
    }

    if (s.morningReminder && nudges.morningSentOn !== local.date && withinWindow(local.minutes, s.morningReminder)) {
      const yesterday = shift(local.date, -1);
      const [day] = await db.select().from(schema.days).where(and(eq(schema.days.familyId, u.familyId), eq(schema.days.date, yesterday))).limit(1);
      if (day && day.status === "planned") {
        await notifyUsers([u.id], notices.morningLog());
        sent.morning++;
      }
      nudges.morningSentOn = local.date;
      changed = true;
    }

    if (changed) await db.update(schema.users).set({ settings: { ...s, nudges } }).where(eq(schema.users.id, u.id));
  }

  // Challenge wrap-up (UTC date; fine for a weekly contest).
  const winners = await closeEndedChallenges(now.toISOString().slice(0, 10));
  for (const w of winners) {
    await notifyFamily(w.familyId, notices.challengeWon(w.challenge.title, w.title, w.challenge.id));
    await refreshBadges(w.familyId);
    sent.winners++;
    // Tell everyone who entered.
    const entrants = await db.select({ familyId: schema.posts.familyId }).from(schema.posts).where(eq(schema.posts.challengeId, w.challenge.id));
    const others = [...new Set(entrants.map((e) => e.familyId))].filter((f) => f !== w.familyId);
    if (others.length) {
      const members = await db.select({ id: schema.users.id }).from(schema.users).where(inArray(schema.users.familyId, others));
      await notifyUsers(members.map((m) => m.id), notices.challengeEnded(w.challenge.title, w.title, w.challenge.id));
    }
  }
  return NextResponse.json({ ok: true, sent });
}

function localParts(now: Date, tz: string): { date: string; minutes: number } | null {
  try {
    const parts = new Intl.DateTimeFormat("en-CA", { timeZone: tz, year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", hour12: false }).formatToParts(now);
    const get = (t: string) => parts.find((p) => p.type === t)?.value ?? "00";
    const hour = Number(get("hour")) % 24;
    return { date: `${get("year")}-${get("month")}-${get("day")}`, minutes: hour * 60 + Number(get("minute")) };
  } catch {
    return null;
  }
}

/** True once local time has passed the target (within the same day), so a missed tick still fires on the next run. */
function withinWindow(localMinutes: number, hhmm: string) {
  const [h, m] = hhmm.split(":").map(Number);
  const target = h * 60 + m;
  return localMinutes >= target && localMinutes < target + 180;
}

function shift(date: string, days: number) {
  const d = new Date(`${date}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}
