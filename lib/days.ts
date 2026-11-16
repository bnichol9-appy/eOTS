import { and, eq, sql } from "drizzle-orm";
import { getDb, schema } from "./db";
import type { UserRow } from "./db/schema";
import { ApiError } from "./auth";
import { newId } from "./id";
import { generateIdeas, THREE_SLOTS, type GeneratedIdea } from "./claude";
import { getOrCreateDay, getRoom, getTaste, historyDays, hydrateDay, listPosts, listRooms, usedPostIds } from "./data";
import { loadPhotoBase64 } from "./storage";
import type { Day, Idea } from "./types";

const { days, ideas, posts } = schema;

export function seasonInfo(user: UserRow, date: string) {
  const { seasonStart, seasonEnd } = user.profile;
  const year = date.slice(0, 4);
  const start = Date.parse(`${year}-${seasonStart}T00:00:00Z`);
  const end = Date.parse(`${year}-${seasonEnd}T00:00:00Z`);
  const d = Date.parse(`${date}T00:00:00Z`);
  const dayMs = 86_400_000;
  const seasonLength = Number.isFinite(start) && Number.isFinite(end) ? Math.round((end - start) / dayMs) + 1 : 24;
  const dayNumber = Number.isFinite(start) ? Math.round((d - start) / dayMs) + 1 : null;
  return { dayNumber: dayNumber !== null && dayNumber >= 1 && dayNumber <= seasonLength ? dayNumber : null, seasonLength };
}

async function communityCandidates(userId: string) {
  const used = await usedPostIds(userId);
  return listPosts({ viewerId: userId, sort: "hot", excludeUserId: userId, excludePostIds: used, limit: 20 });
}

export async function runGeneration(user: UserRow, date: string, opts: { direction: string; focusRoomId: string | null; count: number; avoidTitles: string[]; slotHint: string; withPick: boolean }) {
  const [rooms, taste, history, candidates] = await Promise.all([listRooms(user.id), getTaste(user.id), historyDays(user.id, date), opts.withPick ? communityCandidates(user.id) : Promise.resolve([])]);
  const focusRoom = opts.focusRoomId ? await getRoom(user.id, opts.focusRoomId) : null;
  const focusPhotos = focusRoom ? await Promise.all(focusRoom.photos.slice(0, 2).map((p) => loadPhotoBase64(p.url))) : [];
  const { dayNumber, seasonLength } = seasonInfo(user, date);
  return generateIdeas({
    profile: user.profile,
    rooms,
    taste,
    history,
    date,
    dayNumber,
    seasonLength,
    direction: opts.direction,
    focusRoom,
    focusPhotos,
    count: opts.count,
    avoidTitles: opts.avoidTitles,
    slotHint: opts.slotHint,
    communityCandidates: candidates,
  });
}

export async function generateDay(user: UserRow, date: string, direction: string, focusRoomId: string | null): Promise<Day> {
  const db = await getDb();
  const row = await getOrCreateDay(user.id, date);
  const existing = await db.select({ title: ideas.title }).from(ideas).where(eq(ideas.dayId, row.id));
  const out = await runGeneration(user, date, { direction, focusRoomId, count: 3, avoidTitles: existing.map((e) => e.title), slotHint: THREE_SLOTS, withPick: true });

  // Detach previous unfavourited ideas; favourites keep living in the saved list.
  await db.delete(ideas).where(and(eq(ideas.dayId, row.id), eq(ideas.favourite, false)));
  await db.update(ideas).set({ dayId: null, slot: null }).where(eq(ideas.dayId, row.id));
  await db.insert(ideas).values(out.ideas.map((i, slot) => toIdeaRow(user.id, row.id, slot, i)));
  await db
    .update(days)
    .set({
      direction,
      chosenIdeaId: null,
      status: "open",
      generatedAt: new Date(),
      communityPickPostId: out.communityPickId,
      communityPickReason: out.communityPickWhy,
    })
    .where(eq(days.id, row.id));
  return hydrateDay(user.id, (await getOrCreateDay(user.id, date))!);
}

export async function remixIdea(user: UserRow, date: string, ideaId: string, direction: string): Promise<Day> {
  const db = await getDb();
  const row = await getOrCreateDay(user.id, date);
  const dayIdeas = await db.select().from(ideas).where(eq(ideas.dayId, row.id));
  const old = dayIdeas.find((i) => i.id === ideaId);
  if (!old) throw new ApiError(404, "No such idea");
  const others = dayIdeas.filter((i) => i.id !== ideaId);
  const out = await runGeneration(user, date, {
    direction: direction || "Different from the rejected idea, same energy or bigger.",
    focusRoomId: null,
    count: 1,
    avoidTitles: dayIdeas.map((i) => i.title),
    slotHint: `Produce exactly 1 idea. It replaces this rejected option: "${old.title}": ${old.pitch}. Keep the other options in mind so it stays distinct: ${others.map((i) => `"${i.title}"`).join(", ")}. Leave communityPickId empty.`,
    withPick: false,
  });
  const replacement = out.ideas[0];
  if (!replacement) throw new ApiError(502, "No idea came back. Try again.");
  if (old.favourite) await db.update(ideas).set({ dayId: null, slot: null }).where(eq(ideas.id, old.id));
  else await db.delete(ideas).where(eq(ideas.id, old.id));
  await db.insert(ideas).values(toIdeaRow(user.id, row.id, old.slot ?? 0, replacement));
  if (row.chosenIdeaId === ideaId) await db.update(days).set({ chosenIdeaId: null, status: "open" }).where(eq(days.id, row.id));
  return hydrateDay(user.id, (await getOrCreateDay(user.id, date))!);
}

function toIdeaRow(userId: string, dayId: string, slot: number, i: GeneratedIdea) {
  return {
    id: newId(),
    userId,
    dayId,
    slot,
    source: "generated",
    sourcePostId: null,
    favourite: false,
    title: i.title,
    pitch: i.pitch,
    roomName: i.roomName,
    whatKidsSee: i.whatKidsSee,
    steps: i.steps,
    supplies: i.supplies,
    setupMinutes: i.setupMinutes,
    chaos: i.chaos,
    mess: i.mess,
    elfNote: i.elfNote,
    tags: i.tags,
  };
}

/** Copy a community post (or a saved idea) into a day as the chosen plan. */
export async function attachPostToDay(user: UserRow, date: string, postId: string, slot = 3): Promise<Day> {
  const db = await getDb();
  const [post] = await db.select().from(posts).where(and(eq(posts.id, postId), eq(posts.status, "published"))).limit(1);
  if (!post) throw new ApiError(404, "That setup is no longer available");
  const row = await getOrCreateDay(user.id, date);
  const id = newId();
  await db.insert(ideas).values({
    id,
    userId: user.id,
    dayId: row.id,
    slot,
    source: "community",
    sourcePostId: post.id,
    favourite: false,
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
  await db.update(days).set({ chosenIdeaId: id, status: "planned" }).where(eq(days.id, row.id));
  return hydrateDay(user.id, (await getOrCreateDay(user.id, date))!);
}

export async function attachIdeaToDay(user: UserRow, date: string, idea: Idea): Promise<Day> {
  const db = await getDb();
  const row = await getOrCreateDay(user.id, date);
  const id = newId();
  await db.insert(ideas).values({
    id,
    userId: user.id,
    dayId: row.id,
    slot: 4,
    source: idea.source,
    sourcePostId: idea.sourcePostId,
    favourite: false,
    title: idea.title,
    pitch: idea.pitch,
    roomName: idea.roomName,
    whatKidsSee: idea.whatKidsSee,
    steps: idea.steps,
    supplies: idea.supplies,
    setupMinutes: idea.setupMinutes,
    chaos: idea.chaos,
    mess: idea.mess,
    elfNote: idea.elfNote,
    tags: idea.tags,
  });
  await db.update(days).set({ chosenIdeaId: id, status: "planned" }).where(eq(days.id, row.id));
  return hydrateDay(user.id, (await getOrCreateDay(user.id, date))!);
}

export async function bumpPostUses(postId: string | null) {
  if (!postId) return;
  const db = await getDb();
  await db
    .update(posts)
    .set({ uses: sql`${posts.uses} + 1` })
    .where(eq(posts.id, postId));
}
