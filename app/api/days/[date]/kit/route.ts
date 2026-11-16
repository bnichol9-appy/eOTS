import { eq } from "drizzle-orm";
import { body, route, bad, DATE_RE } from "@/lib/api";
import { requireSession } from "@/lib/auth";
import { getOrCreateDay, hydrateDay } from "@/lib/data";
import { getDb, schema } from "@/lib/db";

export const runtime = "nodejs";

/** Mark a kit item as at home or to buy for one night. */
export const PUT = route<{ date: string }>(async (req, { params }) => {
  const { family } = await requireSession();
  if (!DATE_RE.test(params.date)) bad("Bad date");
  const b = await body<{ key?: string; have?: boolean }>(req);
  const key = String(b.key ?? "").trim().toLowerCase();
  if (!key) bad("No item");
  const row = await getOrCreateDay(family.id, params.date);
  const db = await getDb();
  await db.update(schema.days).set({ kitState: { ...(row.kitState ?? {}), [key]: Boolean(b.have) } }).where(eq(schema.days.id, row.id));
  return { day: await hydrateDay(family.id, await getOrCreateDay(family.id, params.date)) };
});
