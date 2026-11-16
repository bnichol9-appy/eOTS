import { and, eq, sql } from "drizzle-orm";
import { route } from "@/lib/api";
import { ApiError, requireUser } from "@/lib/auth";
import { getDb, schema } from "@/lib/db";

export const runtime = "nodejs";

/** Toggle an upvote. */
export const POST = route<{ id: string }>(async (_req, { params }) => {
  const user = await requireUser();
  const db = await getDb();
  const [post] = await db.select({ id: schema.posts.id }).from(schema.posts).where(and(eq(schema.posts.id, params.id), eq(schema.posts.status, "published"))).limit(1);
  if (!post) throw new ApiError(404, "That setup isn't available");
  const [existing] = await db.select().from(schema.votes).where(and(eq(schema.votes.userId, user.id), eq(schema.votes.postId, post.id))).limit(1);
  if (existing) {
    await db.delete(schema.votes).where(and(eq(schema.votes.userId, user.id), eq(schema.votes.postId, post.id)));
    const [u] = await db.update(schema.posts).set({ upvotes: sql`greatest(${schema.posts.upvotes} - 1, 0)` }).where(eq(schema.posts.id, post.id)).returning({ upvotes: schema.posts.upvotes });
    return { voted: false, upvotes: u.upvotes };
  }
  await db.insert(schema.votes).values({ userId: user.id, postId: post.id });
  const [u] = await db.update(schema.posts).set({ upvotes: sql`${schema.posts.upvotes} + 1` }).where(eq(schema.posts.id, post.id)).returning({ upvotes: schema.posts.upvotes });
  return { voted: true, upvotes: u.upvotes };
});
