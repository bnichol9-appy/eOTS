import { eq } from "drizzle-orm";
import { body, route, bad, DATE_RE } from "@/lib/api";
import { requireSession } from "@/lib/auth";
import { getOrCreateDay, hydrateDay } from "@/lib/data";
import { getDb, schema } from "@/lib/db";

export const runtime = "nodejs";

export const POST = route<{ date: string }>(async (req, { params }) => {
  const { family } = await requireSession();
  if (!DATE_RE.test(params.date)) bad("Bad date");
  const b = await body<{ busy?: boolean }>(req);
  const row = await getOrCreateDay(family.id, params.date);
  const db = await getDb();
  await db.update(schema.days).set({ isBusy: Boolean(b.busy) }).where(eq(schema.days.id, row.id));
  return { day: await hydrateDay(family.id, await getOrCreateDay(family.id, params.date)) };
});
