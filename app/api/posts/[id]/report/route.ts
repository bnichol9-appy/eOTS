import { eq, sql } from "drizzle-orm";
import { body, route } from "@/lib/api";
import { requireSession } from "@/lib/auth";
import { getDb, schema } from "@/lib/db";
import { newId } from "@/lib/id";

export const runtime = "nodejs";

/** Report a post. Three reports from different parents pull it into review automatically. */
export const POST = route<{ id: string }>(async (req, { params }) => {
  const { user } = await requireSession();
  const b = await body<{ reason?: string }>(req);
  const db = await getDb();
  await db.insert(schema.reports).values({ id: newId(), postId: params.id, userId: user.id, reason: String(b.reason ?? "").slice(0, 300) });
  const [{ n }] = await db.select({ n: sql<number>`count(distinct ${schema.reports.userId})::int` }).from(schema.reports).where(eq(schema.reports.postId, params.id));
  if (n >= 3) await db.update(schema.posts).set({ status: "review" }).where(eq(schema.posts.id, params.id));
  return { ok: true };
});
