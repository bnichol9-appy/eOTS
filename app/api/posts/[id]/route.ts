import { and, eq } from "drizzle-orm";
import { route } from "@/lib/api";
import { ApiError, requireUser } from "@/lib/auth";
import { getPostDetail } from "@/lib/data";
import { getDb, schema } from "@/lib/db";

export const runtime = "nodejs";

export const GET = route<{ id: string }>(async (_req, { params }) => {
  const user = await requireUser();
  const post = await getPostDetail(user.id, params.id);
  if (!post) throw new ApiError(404, "That setup isn't available");
  return post;
});

export const DELETE = route<{ id: string }>(async (_req, { params }) => {
  const user = await requireUser();
  const db = await getDb();
  const deleted = await db.delete(schema.posts).where(and(eq(schema.posts.id, params.id), eq(schema.posts.userId, user.id))).returning({ id: schema.posts.id, dayId: schema.posts.dayId });
  if (deleted.length === 0) throw new ApiError(404, "Not your post");
  if (deleted[0].dayId) await db.update(schema.days).set({ postId: null }).where(eq(schema.days.id, deleted[0].dayId));
  return { ok: true };
});
