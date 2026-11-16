import { eq } from "drizzle-orm";
import { body, route, bad } from "@/lib/api";
import { requireSession } from "@/lib/auth";
import { getDb, schema } from "@/lib/db";
import type { UserSettings } from "@/lib/types";

export const runtime = "nodejs";

const TIME_RE = /^([01]\d|2[0-3]):[0-5]\d$/;

export const PUT = route(async (req) => {
  const { user } = await requireSession();
  const b = await body<Partial<UserSettings>>(req);
  const cur = user.settings;
  const time = (v: unknown, fallback: string | null) => (v === null ? null : typeof v === "string" && TIME_RE.test(v) ? v : fallback);
  const next: UserSettings = {
    timezone: typeof b.timezone === "string" && b.timezone.length < 60 ? b.timezone : cur.timezone,
    eveningReminder: b.eveningReminder === undefined ? cur.eveningReminder : time(b.eveningReminder, cur.eveningReminder),
    morningReminder: b.morningReminder === undefined ? cur.morningReminder : time(b.morningReminder, cur.morningReminder),
    nudges: cur.nudges ?? {},
  };
  if (next.timezone) {
    try {
      new Intl.DateTimeFormat("en", { timeZone: next.timezone });
    } catch {
      bad("Unknown timezone");
    }
  }
  const db = await getDb();
  await db.update(schema.users).set({ settings: next }).where(eq(schema.users.id, user.id));
  return next;
});
