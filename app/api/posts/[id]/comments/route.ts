import { and, eq, sql } from "drizzle-orm";
import { body, route, bad } from "@/lib/api";
import { ApiError, requireSession } from "@/lib/auth";
import { getPostDetail } from "@/lib/data";
import { getDb, schema } from "@/lib/db";
import { newId } from "@/lib/id";
import { notifyFamily } from "@/lib/notify";

export const runtime = "nodejs";

export const POST = route<{ id: string }>(async (req, { params }) => {
  const { user, family } = await requireSession();
  const b = await body<{ body?: string }>(req);
  const text = String(b.body ?? "").trim().slice(0, 600);
  if (!text) bad("Say something");
  const db = await getDb();
  const [post] = await db.select({ id: schema.posts.id, familyId: schema.posts.familyId, title: schema.posts.title }).from(schema.posts).where(and(eq(schema.posts.id, params.id), eq(schema.posts.status, "published"))).limit(1);
  if (!post) throw new ApiError(404, "That setup isn't available");
  await db.insert(schema.comments).values({ id: newId(), postId: post.id, userId: user.id, body: text });
  await db.update(schema.posts).set({ commentsCount: sql`${schema.posts.commentsCount} + 1` }).where(eq(schema.posts.id, post.id));
  if (post.familyId !== family.id) {
    await notifyFamily(post.familyId, { type: "comment", title: `💬 ${user.displayName} on "${post.title}"`, body: text.slice(0, 120), url: `/community/${post.id}#comments` });
  }
  return getPostDetail({ familyId: family.id, userId: user.id }, post.id);
});
