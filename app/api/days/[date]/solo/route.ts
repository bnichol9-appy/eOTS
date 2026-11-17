import { eq } from "drizzle-orm";
import { body, route, bad, DATE_RE } from "@/lib/api";
import { requireSession } from "@/lib/auth";
import { analyseSetup, updateTaste } from "@/lib/claude";
import { getOrCreateDay, getTaste, hydrateDay, refreshBadges, saveTaste, toIdea } from "@/lib/data";
import { getDb, schema } from "@/lib/db";
import { newId } from "@/lib/id";
import { savePhoto } from "@/lib/storage";
import type { DayResult, Role } from "@/lib/types";

export const runtime = "nodejs";
export const maxDuration = 300;

/** Tags the parent can pick, and what they mean for the idea's dials. */
const TAG_DIALS: Record<string, Partial<{ mess: number; spook: number; chaos: number; setupMinutes: number }>> = {
  messy: { mess: 4 },
  tidy: { mess: 1 },
  spooky: { spook: 4 },
  "big build": { chaos: 4, setupMinutes: 30 },
  quick: { setupMinutes: 5 },
  chaos: { chaos: 5 },
};

/**
 * "I went solo": log a night the parent did their own way. Clears any plan for that night, stores the photo,
 * lets Claude name and describe it if the parent didn't, and feeds it into the taste profile like any logged night.
 */
export const POST = route<{ date: string }>(async (req, { params }) => {
  const { family } = await requireSession();
  if (!DATE_RE.test(params.date)) bad("Bad date");
  const b = await body<{ photo?: string; title?: string; roomName?: string; elves?: string[]; tags?: string[]; reaction?: number; notes?: string }>(req);
  if (!b.photo) bad("Add a photo of what you built");
  const row = await getOrCreateDay(family.id, params.date);
  if (row.postId) bad("This night is already shared. Delete the post first to replace it.");

  const reaction = Math.min(5, Math.max(1, Number(b.reaction) || 4));
  const notes = String(b.notes ?? "").slice(0, 1000);
  const tags = Array.isArray(b.tags) ? [...new Set(b.tags.map((t) => String(t).trim().toLowerCase().slice(0, 30)).filter(Boolean))].slice(0, 10) : [];
  const roomName =
    String(b.roomName ?? "")
      .trim()
      .slice(0, 60) || "Somewhere in the house";
  const familyElves = family.profile.elves.map((e) => e.name);
  const elves = (Array.isArray(b.elves) ? b.elves.map(String).filter((n) => familyElves.includes(n)) : []).slice(0, 3);
  const cast = elves.length ? elves : familyElves.slice(0, 1);

  const base64 = String(b.photo).replace(/^data:image\/\w+;base64,/, "");
  const photoUrl = await savePhoto(base64, `results/${family.id}`);
  const analysis = await analyseSetup(base64, null, [notes, tags.length ? `Tags: ${tags.join(", ")}` : "", `Room: ${roomName}`].filter(Boolean).join("\n"));

  const dials = { mess: 2, spook: 1, chaos: 3, setupMinutes: 10 };
  for (const t of tags) Object.assign(dials, TAG_DIALS[t] ?? {});
  const roles: Role[] = cast.map((elf) => ({ elf, roomName, spotLabel: "", action: "" }));
  const title =
    String(b.title ?? "")
      .trim()
      .slice(0, 80) ||
    analysis.suggestedTitle.slice(0, 80) ||
    "A solo night";

  const db = await getDb();
  const ideaId = newId();
  await db.insert(schema.ideas).values({
    id: ideaId,
    familyId: family.id,
    dayId: row.id,
    slot: 4,
    source: "own",
    title,
    pitch: notes || analysis.description,
    roomName,
    format: cast.length > 1 ? "duo" : "single",
    roles,
    whatKidsSee: analysis.whatKidsSee,
    steps: [],
    kit: [],
    setupMinutes: dials.setupMinutes,
    chaos: dials.chaos,
    mess: dials.mess,
    spook: dials.spook,
    tags: ["solo", ...tags],
  });
  const [ideaRow] = await db.select().from(schema.ideas).where(eq(schema.ideas.id, ideaId)).limit(1);

  const current = await getTaste(family.id);
  const taste = await updateTaste(current, { date: params.date, idea: toIdea(ideaRow), reaction, feedbackTags: ["went solo", ...tags], notes, analysis, rejectedTitles: [] });
  await saveTaste(family.id, taste.profile, { date: params.date, summary: taste.summary });

  const result: DayResult = { photoUrl, reaction, feedbackTags: tags, notes, analysis: analysis.description, learned: taste.summary, completedAt: new Date().toISOString() };
  await db.update(schema.days).set({ status: "done", isBusy: false, chosenIdeaId: ideaId, result }).where(eq(schema.days.id, row.id));
  const newBadges = await refreshBadges(family.id);
  return { day: await hydrateDay(family.id, await getOrCreateDay(family.id, params.date)), taste: await getTaste(family.id), newBadges };
});
