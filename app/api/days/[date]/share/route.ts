import { eq } from "drizzle-orm";
import { body, route, bad, DATE_RE } from "@/lib/api";
import { ApiError, requireUser } from "@/lib/auth";
import { packagePost } from "@/lib/claude";
import { getOrCreateDay, getPostDetail, hydrateDay, toIdea } from "@/lib/data";
import { getDb, schema } from "@/lib/db";
import { newId } from "@/lib/id";
import { loadPhotoBase64 } from "@/lib/storage";

export const runtime = "nodejs";
export const maxDuration = 300;

/** Package a finished night into a community post. Claude writes it from the photo and the plan. */
export const POST = route<{ date: string }>(async (req, { params }) => {
  const user = await requireUser();
  if (!DATE_RE.test(params.date)) bad("Bad date");
  const b = await body<{ description?: string }>(req);
  const row = await getOrCreateDay(user.id, params.date);
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
    elfName: user.profile.elfName,
  });
  const id = newId();
  await db.insert(schema.posts).values({
    id,
    userId: user.id,
    dayId: row.id,
    remakeOfPostId: ideaRow?.sourcePostId ?? null,
    elfName: user.profile.elfName || "an elf",
    title: draft.title,
    pitch: draft.pitch,
    roomType: draft.roomType,
    whatKidsSee: draft.whatKidsSee,
    steps: draft.steps,
    supplies: draft.supplies,
    setupMinutes: draft.setupMinutes,
    chaos: draft.chaos,
    mess: draft.mess,
    tags: draft.tags.map((t) => t.toLowerCase().slice(0, 30)),
    parentTip: draft.parentTip,
    photoUrl: row.result.photoUrl,
    reaction: row.result.reaction,
    status: draft.safetyOk ? "published" : "review",
    moderation: { ok: draft.safetyOk, concern: draft.safetyConcern },
  });
  await db.update(schema.days).set({ postId: id }).where(eq(schema.days.id, row.id));
  return { day: await hydrateDay(user.id, (await getOrCreateDay(user.id, params.date))!), post: await getPostDetail(user.id, id) };
});
