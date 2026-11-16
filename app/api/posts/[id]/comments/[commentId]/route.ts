import { and, eq, sql } from "drizzle-orm";
import { route } from "@/lib/api";
import { ApiError, requireSession } from "@/lib/auth";
import { getPostDetail } from "@/lib/data";
import { getDb, schema } from "@/lib/db";

export const runtime = "nodejs";

export const DELETE = route<{ id: string; commentId: string }>(async (_req, { params }) => {
  const { user, family } = await requireSession();
  const db = await getDb();
  const deleted = await db
    .delete(schema.comments)
    .where(and(eq(schema.comments.id, params.commentId), eq(schema.comments.postId, params.id), eq(schema.comments.userId, user.id)))
    .returning({ id: schema.comments.id });
  if (deleted.length === 0) throw new ApiError(404, "Not your comment");
  await db.update(schema.posts).set({ commentsCount: sql`greatest(${schema.posts.commentsCount} - 1, 0)` }).where(eq(schema.posts.id, params.id));
  return getPostDetail({ familyId: family.id, userId: user.id }, params.id);
});
