import { and, eq, gte, sql } from "drizzle-orm";
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
  // Ideas copied in from the community or the saved list (slot 3+) only exist as "the plan"; drop them unless favourited.
  await db.delete(schema.ideas).where(and(eq(schema.ideas.dayId, row.id), gte(sql`coalesce(${schema.ideas.slot}, 0)`, 3), eq(schema.ideas.favourite, false)));
  await db.update(schema.days).set({ chosenIdeaId: null, status: "open" }).where(eq(schema.days.id, row.id));
  return { day: await hydrateDay(family.id, (await getOrCreateDay(family.id, params.date))!) };
});
