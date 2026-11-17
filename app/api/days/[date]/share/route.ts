import { eq, sql } from "drizzle-orm";
import { body, route, bad, DATE_RE } from "@/lib/api";
import { ApiError, requireSession } from "@/lib/auth";
import { activeChallenge } from "@/lib/challenges";
import { packagePost } from "@/lib/claude";
import { getOrCreateDay, getPostDetail, hydrateDay, refreshBadges, toIdea } from "@/lib/data";
import { getDb, schema } from "@/lib/db";
import { newId } from "@/lib/id";
import { notifyFamily } from "@/lib/notify";
import { notices } from "@/lib/notices";
import { loadPhotoBase64 } from "@/lib/storage";
import { elfNames } from "@/lib/types";

export const runtime = "nodejs";
export const maxDuration = 300;

/** Package a finished night into a community post. Claude writes it from the photo and the plan. */
export const POST = route<{ date: string }>(async (req, { params }) => {
  const { user, family } = await requireSession();
  if (!DATE_RE.test(params.date)) bad("Bad date");
  const b = await body<{ description?: string; visibility?: string; enterChallenge?: boolean }>(req);
  const row = await getOrCreateDay(family.id, params.date);
  if (row.status !== "done" || !row.result) throw new ApiError(400, "Finish the night first");
  if (!row.result.photoUrl) throw new ApiError(400, "A photo of the real setup is needed to share it");
  if (row.postId) throw new ApiError(409, "Already shared");
  const db = await getDb();
  const ideaRow = row.chosenIdeaId ? (await db.select().from(schema.ideas).where(eq(schema.ideas.id, row.chosenIdeaId)).limit(1))[0] : null;
  const draft = await packagePost({
    photoBase64: await loadPhotoBase64(row.result.photoUrl),
    idea: ideaRow ? toIdea(ideaRow) : null,
    result: row.result,
    ownDescription: String(b.description ?? "").slice(0, 600),
    profile: family.profile,
  });
  const visibility = b.visibility === "circles" ? "circles" : "public";
  const challenge = b.enterChallenge ? await activeChallenge(params.date) : null;
  const id = newId();
  const remakeOfPostId = ideaRow?.sourcePostId ?? null;
  await db.insert(schema.posts).values({
    id,
    familyId: family.id,
    userId: user.id,
    dayId: row.id,
    remakeOfPostId,
    challengeId: challenge?.id ?? null,
    visibility,
    elfName: elfNames(family.profile),
    title: draft.title,
    pitch: draft.pitch,
    roomType: draft.roomType,
    format: draft.format,
    whatKidsSee: draft.whatKidsSee,
    steps: draft.steps,
    kit: draft.kit,
    setupMinutes: draft.setupMinutes,
    chaos: draft.chaos,
    mess: draft.mess,
    spook: draft.spook,
    tags: [...new Set([...draft.tags.map((t) => t.toLowerCase().slice(0, 30)), ...(challenge ? [challenge.tag] : [])])],
    parentTip: draft.parentTip,
    photoUrl: row.result.photoUrl,
    reaction: row.result.reaction,
    status: draft.safetyOk ? "published" : "review",
    moderation: { ok: draft.safetyOk, concern: draft.safetyConcern },
  });
  await db.update(schema.days).set({ postId: id }).where(eq(schema.days.id, row.id));

  if (remakeOfPostId && draft.safetyOk) {
    const [orig] = await db
      .update(schema.posts)
      .set({ remakes: sql`${schema.posts.remakes} + 1` })
      .where(eq(schema.posts.id, remakeOfPostId))
      .returning({ familyId: schema.posts.familyId, title: schema.posts.title });
    if (orig && orig.familyId !== family.id) {
      await notifyFamily(orig.familyId, notices.remake(elfNames(family.profile), orig.title, id));
      await refreshBadges(orig.familyId);
    }
  }
  await refreshBadges(family.id);
  return { day: await hydrateDay(family.id, await getOrCreateDay(family.id, params.date)), post: await getPostDetail({ familyId: family.id, userId: user.id }, id) };
});
