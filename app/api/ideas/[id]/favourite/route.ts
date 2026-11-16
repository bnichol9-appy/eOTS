import { and, eq } from "drizzle-orm";
import { route } from "@/lib/api";
import { ApiError, requireUser } from "@/lib/auth";
import { toIdea } from "@/lib/data";
import { getDb, schema } from "@/lib/db";

export const runtime = "nodejs";

export const POST = route<{ id: string }>(async (_req, { params }) => {
  const user = await requireUser();
  const db = await getDb();
  const [idea] = await db.select().from(schema.ideas).where(and(eq(schema.ideas.id, params.id), eq(schema.ideas.userId, user.id))).limit(1);
  if (!idea) throw new ApiError(404, "No such idea");
  const [updated] = await db.update(schema.ideas).set({ favourite: !idea.favourite }).where(eq(schema.ideas.id, idea.id)).returning();
  return toIdea(updated);
});
