import { and, eq, gte, sql } from "drizzle-orm";
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
  // Ideas copied in from the community or the saved list (slot 3+) only exist as "the plan"; drop them unless favourited.
  await db.delete(schema.ideas).where(and(eq(schema.ideas.dayId, row.id), gte(sql`coalesce(${schema.ideas.slot}, 0)`, 3), eq(schema.ideas.favourite, false)));
  await db.update(schema.days).set({ chosenIdeaId: null, status: "open" }).where(eq(schema.days.id, row.id));
  return { day: await hydrateDay(user.id, (await getOrCreateDay(user.id, params.date))!) };
});
