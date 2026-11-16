import { and, eq } from "drizzle-orm";
import { body, route, bad, DATE_RE } from "@/lib/api";
import { ApiError, requireSession } from "@/lib/auth";
import { toIdea } from "@/lib/data";
import { attachIdeaToDay } from "@/lib/days";
import { getDb, schema } from "@/lib/db";

export const runtime = "nodejs";

/** Put a saved idea on a given night as the plan. */
export const POST = route<{ id: string }>(async (req, { params }) => {
  const { family } = await requireSession();
  const b = await body<{ date?: string }>(req);
  const date = String(b.date ?? "");
  if (!DATE_RE.test(date)) bad("Bad date");
  const db = await getDb();
  const [idea] = await db.select().from(schema.ideas).where(and(eq(schema.ideas.id, params.id), eq(schema.ideas.familyId, family.id))).limit(1);
  if (!idea) throw new ApiError(404, "No such idea");
  return { day: await attachIdeaToDay(family.id, date, toIdea(idea)) };
});
