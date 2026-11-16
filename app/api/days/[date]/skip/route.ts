import { eq } from "drizzle-orm";
import { route, bad, DATE_RE } from "@/lib/api";
import { requireSession } from "@/lib/auth";
import { getOrCreateDay, hydrateDay } from "@/lib/data";
import { getDb, schema } from "@/lib/db";

export const runtime = "nodejs";

export const POST = route<{ date: string }>(async (_req, { params }) => {
  const { family } = await requireSession();
  if (!DATE_RE.test(params.date)) bad("Bad date");
  const row = await getOrCreateDay(family.id, params.date);
  const db = await getDb();
  await db.update(schema.days).set({ status: "skipped" }).where(eq(schema.days.id, row.id));
  return { day: await hydrateDay(family.id, (await getOrCreateDay(family.id, params.date))!) };
});
