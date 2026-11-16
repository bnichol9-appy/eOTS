import { and, eq, sql } from "drizzle-orm";
import { route } from "@/lib/api";
import { ApiError, requireSession } from "@/lib/auth";
import { refreshBadges } from "@/lib/data";
import { getDb, schema } from "@/lib/db";
import { notifyFamily, UPVOTE_MILESTONES } from "@/lib/notify";

export const runtime = "nodejs";

/** Toggle an upvote. Milestones notify the poster's family. */
export const POST = route<{ id: string }>(async (_req, { params }) => {
  const { user, family } = await requireSession();
  const db = await getDb();
  const [post] = await db.select({ id: schema.posts.id, familyId: schema.posts.familyId, title: schema.posts.title }).from(schema.posts).where(and(eq(schema.posts.id, params.id), eq(schema.posts.status, "published"))).limit(1);
  if (!post) throw new ApiError(404, "That setup isn't available");
  const [existing] = await db.select().from(schema.votes).where(and(eq(schema.votes.userId, user.id), eq(schema.votes.postId, post.id))).limit(1);
  if (existing) {
    await db.delete(schema.votes).where(and(eq(schema.votes.userId, user.id), eq(schema.votes.postId, post.id)));
    const [u] = await db.update(schema.posts).set({ upvotes: sql`greatest(${schema.posts.upvotes} - 1, 0)` }).where(eq(schema.posts.id, post.id)).returning({ upvotes: schema.posts.upvotes });
    return { voted: false, upvotes: u.upvotes };
  }
  await db.insert(schema.votes).values({ userId: user.id, postId: post.id });
  const [u] = await db.update(schema.posts).set({ upvotes: sql`${schema.posts.upvotes} + 1` }).where(eq(schema.posts.id, post.id)).returning({ upvotes: schema.posts.upvotes });
  if (post.familyId !== family.id && UPVOTE_MILESTONES.includes(u.upvotes)) {
    await notifyFamily(post.familyId, { type: "upvotes", title: `${u.upvotes} upvote${u.upvotes === 1 ? "" : "s"} on "${post.title}"`, body: u.upvotes === 1 ? "Someone liked your setup." : "Other parents are into it.", url: `/ideas/${post.id}` });
    await refreshBadges(post.familyId);
  }
  return { voted: true, upvotes: u.upvotes };
});
