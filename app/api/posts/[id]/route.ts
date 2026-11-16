import { and, eq, sql } from "drizzle-orm";
import { route } from "@/lib/api";
import { ApiError, requireSession } from "@/lib/auth";
import { getPostDetail } from "@/lib/data";
import { getDb, schema } from "@/lib/db";

export const runtime = "nodejs";

export const GET = route<{ id: string }>(async (_req, { params }) => {
  const { user, family } = await requireSession();
  const post = await getPostDetail({ familyId: family.id, userId: user.id }, params.id);
  if (!post) throw new ApiError(404, "That setup isn't available");
  return post;
});

export const DELETE = route<{ id: string }>(async (_req, { params }) => {
  const { family } = await requireSession();
  const db = await getDb();
  const deleted = await db
    .delete(schema.posts)
    .where(and(eq(schema.posts.id, params.id), eq(schema.posts.familyId, family.id)))
    .returning({ id: schema.posts.id, dayId: schema.posts.dayId, remakeOfPostId: schema.posts.remakeOfPostId });
  if (deleted.length === 0) throw new ApiError(404, "Not your post");
  if (deleted[0].dayId) await db.update(schema.days).set({ postId: null }).where(eq(schema.days.id, deleted[0].dayId));
  if (deleted[0].remakeOfPostId) {
    await db
      .update(schema.posts)
      .set({ remakes: sql`greatest(${schema.posts.remakes} - 1, 0)` })
      .where(eq(schema.posts.id, deleted[0].remakeOfPostId));
  }
  return { ok: true };
});
