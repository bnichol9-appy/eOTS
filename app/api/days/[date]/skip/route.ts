import { eq } from "drizzle-orm";
import { route, bad, DATE_RE } from "@/lib/api";
import { requireUser } from "@/lib/auth";
import { getOrCreateDay, hydrateDay } from "@/lib/data";
import { getDb, schema } from "@/lib/db";

export const runtime = "nodejs";

export const POST = route<{ date: string }>(async (_req, { params }) => {
  const user = await requireUser();
  if (!DATE_RE.test(params.date)) bad("Bad date");
  const row = await getOrCreateDay(user.id, params.date);
  const db = await getDb();
  await db.update(schema.days).set({ status: "skipped" }).where(eq(schema.days.id, row.id));
  return { day: await hydrateDay(user.id, (await getOrCreateDay(user.id, params.date))!) };
});
