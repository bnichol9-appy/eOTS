import { eq } from "drizzle-orm";
import { body, route, bad, DATE_RE } from "@/lib/api";
import { requireUser } from "@/lib/auth";
import { analyseSetup, updateTaste } from "@/lib/claude";
import { getOrCreateDay, getTaste, hydrateDay, saveTaste, toIdea } from "@/lib/data";
import { bumpPostUses } from "@/lib/days";
import { getDb, schema } from "@/lib/db";
import { savePhoto } from "@/lib/storage";
import type { DayResult } from "@/lib/types";

export const runtime = "nodejs";
export const maxDuration = 300;

export const POST = route<{ date: string }>(async (req, { params }) => {
  const user = await requireUser();
  if (!DATE_RE.test(params.date)) bad("Bad date");
  const b = await body<{ photo?: string | null; reaction?: number; feedbackTags?: string[]; notes?: string }>(req);
  const row = await getOrCreateDay(user.id, params.date);
  const db = await getDb();
  const ideaRows = await db.select().from(schema.ideas).where(eq(schema.ideas.dayId, row.id));
  const idea = ideaRows.find((i) => i.id === row.chosenIdeaId) ?? null;
  const reaction = Math.min(5, Math.max(1, Number(b.reaction) || 3));
  const feedbackTags = Array.isArray(b.feedbackTags) ? b.feedbackTags.map((t) => String(t).slice(0, 40)).slice(0, 12) : [];
  const notes = String(b.notes ?? "").slice(0, 1000);

  let photoUrl: string | null = null;
  let analysis: { description: string; styleSignals: string[] } | null = null;
  if (b.photo) {
    const base64 = String(b.photo).replace(/^data:image\/\w+;base64,/, "");
    photoUrl = await savePhoto(base64, `results/${user.id}`);
    analysis = await analyseSetup(base64, idea ? toIdea(idea) : null, notes);
  }
  const current = await getTaste(user.id);
  const taste = await updateTaste(current, {
    date: params.date,
    idea: idea ? toIdea(idea) : null,
    reaction,
    feedbackTags,
    notes,
    analysis,
    rejectedTitles: ideaRows.filter((i) => i.id !== row.chosenIdeaId).map((i) => i.title),
  });
  await saveTaste(user.id, taste.profile, { date: params.date, summary: taste.summary });

  const result: DayResult = { photoUrl, reaction, feedbackTags, notes, analysis: analysis?.description ?? null, learned: taste.summary, completedAt: new Date().toISOString() };
  await db.update(schema.days).set({ status: "done", result }).where(eq(schema.days.id, row.id));
  if (idea?.sourcePostId && row.status !== "done") await bumpPostUses(idea.sourcePostId);
  return { day: await hydrateDay(user.id, (await getOrCreateDay(user.id, params.date))!), taste: await getTaste(user.id) };
});
