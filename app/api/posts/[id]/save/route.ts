import { and, eq } from "drizzle-orm";
import { route } from "@/lib/api";
import { ApiError, requireSession } from "@/lib/auth";
import { getDb, schema } from "@/lib/db";
import { newId } from "@/lib/id";

export const runtime = "nodejs";

/** Toggle "saved": a saved community post becomes a favourite idea in the family's list. */
export const POST = route<{ id: string }>(async (_req, { params }) => {
  const { family } = await requireSession();
  const db = await getDb();
  const [existing] = await db
    .select({ id: schema.ideas.id })
    .from(schema.ideas)
    .where(and(eq(schema.ideas.familyId, family.id), eq(schema.ideas.sourcePostId, params.id), eq(schema.ideas.favourite, true)))
    .limit(1);
  if (existing) {
    await db.update(schema.ideas).set({ favourite: false }).where(eq(schema.ideas.id, existing.id));
    return { saved: false };
  }
  const [post] = await db.select().from(schema.posts).where(and(eq(schema.posts.id, params.id), eq(schema.posts.status, "published"))).limit(1);
  if (!post) throw new ApiError(404, "That setup isn't available");
  await db.insert(schema.ideas).values({
    id: newId(),
    familyId: family.id,
    dayId: null,
    slot: null,
    source: "community",
    sourcePostId: post.id,
    favourite: true,
    title: post.title,
    pitch: post.pitch,
    roomName: post.roomType,
    whatKidsSee: post.whatKidsSee,
    steps: post.steps,
    supplies: post.supplies,
    setupMinutes: post.setupMinutes,
    chaos: post.chaos,
    mess: post.mess,
    elfNote: "",
    tags: post.tags,
  });
  return { saved: true };
});
