import { and, eq } from "drizzle-orm";
import { body, route, bad, DATE_RE } from "@/lib/api";
import { ApiError, requireUser } from "@/lib/auth";
import { getOrCreateDay, hydrateDay } from "@/lib/data";
import { getDb, schema } from "@/lib/db";

export const runtime = "nodejs";

export const POST = route<{ date: string }>(async (req, { params }) => {
  const user = await requireUser();
  if (!DATE_RE.test(params.date)) bad("Bad date");
  const b = await body<{ ideaId?: string }>(req);
  const row = await getOrCreateDay(user.id, params.date);
  const db = await getDb();
  const [idea] = await db.select({ id: schema.ideas.id }).from(schema.ideas).where(and(eq(schema.ideas.id, String(b.ideaId ?? "")), eq(schema.ideas.dayId, row.id))).limit(1);
  if (!idea) throw new ApiError(404, "No such idea");
  await db.update(schema.days).set({ chosenIdeaId: idea.id, status: "planned" }).where(eq(schema.days.id, row.id));
  return { day: await hydrateDay(user.id, (await getOrCreateDay(user.id, params.date))!) };
});
