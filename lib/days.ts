import { and, eq, sql } from "drizzle-orm";
import { getDb, schema } from "./db";
import { ApiError, type Session } from "./auth";
import { newId } from "./id";
import { generateIdeas, ONE_SLOT, THREE_SLOTS, type GeneratedIdea } from "./claude";
import { getOrCreateDay, getRoom, getTaste, historyDays, hydrateDay, listPosts, listRooms, usedPostIds } from "./data";
import { loadPhotoBase64 } from "./storage";
import { activeChallenge } from "./challenges";
import type { Day, Idea, Profile } from "./types";

const { days, ideas, posts } = schema;

export function seasonInfo(profile: Profile, date: string) {
  const { seasonStart, seasonEnd } = profile;
  const year = date.slice(0, 4);
  const start = Date.parse(`${year}-${seasonStart}T00:00:00Z`);
  const end = Date.parse(`${year}-${seasonEnd}T00:00:00Z`);
  const d = Date.parse(`${date}T00:00:00Z`);
  const dayMs = 86_400_000;
  const seasonLength = Number.isFinite(start) && Number.isFinite(end) ? Math.round((end - start) / dayMs) + 1 : 24;
  const dayNumber = Number.isFinite(start) ? Math.round((d - start) / dayMs) + 1 : null;
  return { dayNumber: dayNumber !== null && dayNumber >= 1 && dayNumber <= seasonLength ? dayNumber : null, seasonLength };
}

async function communityCandidates(familyId: string) {
  const used = await usedPostIds(familyId);
  return listPosts({ viewerFamilyId: familyId, sort: "hot", excludeFamilyId: familyId, excludePostIds: used, limit: 20 });
}

export async function runGeneration(s: Session, date: string, opts: { direction: string; focusRoomId: string | null; count: number; avoidTitles: string[]; slotHint: string; withPick: boolean; isBusy: boolean }) {
  const familyId = s.family.id;
  const [rooms, taste, history, candidates, challenge] = await Promise.all([
    listRooms(familyId),
    getTaste(familyId),
    historyDays(familyId, date),
    opts.withPick ? communityCandidates(familyId) : Promise.resolve([]),
    activeChallenge(date),
  ]);
  const focusRoom = opts.focusRoomId ? await getRoom(familyId, opts.focusRoomId) : null;
  const focusPhotos = focusRoom ? await Promise.all(focusRoom.photos.slice(0, 2).map((p) => loadPhotoBase64(p.url))) : [];
  const { dayNumber, seasonLength } = seasonInfo(s.family.profile, date);
  return generateIdeas({
    profile: s.family.profile,
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
    challenge: challenge ? { title: challenge.title, description: challenge.description } : null,
    isBusy: opts.isBusy,
  });
}

export async function generateDay(s: Session, date: string, direction: string, focusRoomId: string | null): Promise<Day> {
  const db = await getDb();
  const familyId = s.family.id;
  const row = await getOrCreateDay(familyId, date);
  const existing = await db.select({ title: ideas.title }).from(ideas).where(eq(ideas.dayId, row.id));
  const out = await runGeneration(s, date, { direction, focusRoomId, count: 3, avoidTitles: existing.map((e) => e.title), slotHint: THREE_SLOTS, withPick: true, isBusy: row.isBusy });
  await db.delete(ideas).where(and(eq(ideas.dayId, row.id), eq(ideas.favourite, false)));
  await db.update(ideas).set({ dayId: null, slot: null }).where(eq(ideas.dayId, row.id));
  await db.insert(ideas).values(out.ideas.map((i, slot) => toIdeaRow(familyId, row.id, slot, i)));
  await db
    .update(days)
    .set({ direction, chosenIdeaId: null, status: "open", generatedAt: new Date(), communityPickPostId: out.communityPickId, communityPickReason: out.communityPickWhy })
    .where(eq(days.id, row.id));
  return hydrateDay(familyId, await getOrCreateDay(familyId, date));
}

/** Plan one night in one call and lock it in. Used by "Plan the week". */
export async function planNight(s: Session, date: string): Promise<Day> {
  const db = await getDb();
  const familyId = s.family.id;
  const row = await getOrCreateDay(familyId, date);
  if (row.status === "planned" || row.status === "done") return hydrateDay(familyId, row);
  const existing = await db.select({ title: ideas.title }).from(ideas).where(eq(ideas.dayId, row.id));
  const out = await runGeneration(s, date, { direction: "", focusRoomId: null, count: 1, avoidTitles: existing.map((e) => e.title), slotHint: ONE_SLOT, withPick: false, isBusy: row.isBusy });
  const idea = out.ideas[0];
  if (!idea) throw new ApiError(502, "No idea came back. Try again.");
  const id = newId();
  await db.insert(ideas).values({ ...toIdeaRow(familyId, row.id, 0, idea), id });
  await db.update(days).set({ chosenIdeaId: id, status: "planned", generatedAt: new Date() }).where(eq(days.id, row.id));
  return hydrateDay(familyId, await getOrCreateDay(familyId, date));
}

export async function remixIdea(s: Session, date: string, ideaId: string, direction: string): Promise<Day> {
  const db = await getDb();
  const familyId = s.family.id;
  const row = await getOrCreateDay(familyId, date);
  const dayIdeas = await db.select().from(ideas).where(eq(ideas.dayId, row.id));
  const old = dayIdeas.find((i) => i.id === ideaId);
  if (!old) throw new ApiError(404, "No such idea");
  const others = dayIdeas.filter((i) => i.id !== ideaId);
  const out = await runGeneration(s, date, {
    direction: direction || "Different from the rejected idea, same energy or bigger.",
    focusRoomId: null,
    count: 1,
    avoidTitles: dayIdeas.map((i) => i.title),
    slotHint: `Produce exactly 1 idea. It replaces this rejected option: "${old.title}": ${old.pitch}. Keep the other options in mind so it stays distinct: ${others.map((i) => `"${i.title}"`).join(", ")}. Leave communityPickId empty.`,
    withPick: false,
    isBusy: row.isBusy,
  });
  const replacement = out.ideas[0];
  if (!replacement) throw new ApiError(502, "No idea came back. Try again.");
  if (old.favourite) await db.update(ideas).set({ dayId: null, slot: null }).where(eq(ideas.id, old.id));
  else await db.delete(ideas).where(eq(ideas.id, old.id));
  await db.insert(ideas).values(toIdeaRow(familyId, row.id, old.slot ?? 0, replacement));
  if (row.chosenIdeaId === ideaId) await db.update(days).set({ chosenIdeaId: null, status: "open" }).where(eq(days.id, row.id));
  return hydrateDay(familyId, await getOrCreateDay(familyId, date));
}

function toIdeaRow(familyId: string, dayId: string, slot: number, i: GeneratedIdea) {
  return { id: newId(), familyId, dayId, slot, source: "generated", sourcePostId: null, favourite: false, ...i };
}

export async function attachPostToDay(familyId: string, date: string, postId: string, slot = 3): Promise<Day> {
  const db = await getDb();
  const [post] = await db.select().from(posts).where(and(eq(posts.id, postId), eq(posts.status, "published"))).limit(1);
  if (!post) throw new ApiError(404, "That setup is no longer available");
  const row = await getOrCreateDay(familyId, date);
  const id = newId();
  await db.insert(ideas).values({
    id,
    familyId,
    dayId: row.id,
    slot,
    source: "community",
    sourcePostId: post.id,
    favourite: false,
    title: post.title,
    pitch: post.pitch,
    roomName: post.roomType,
    format: post.format,
    roles: [],
    whatKidsSee: post.whatKidsSee,
    steps: post.steps,
    kit: post.kit,
    setupMinutes: post.setupMinutes,
    chaos: post.chaos,
    mess: post.mess,
    spook: post.spook,
    elfNote: "",
    tags: post.tags,
  });
  await db.update(days).set({ chosenIdeaId: id, status: "planned" }).where(eq(days.id, row.id));
  return hydrateDay(familyId, await getOrCreateDay(familyId, date));
}

export async function attachIdeaToDay(familyId: string, date: string, idea: Idea): Promise<Day> {
  const db = await getDb();
  const row = await getOrCreateDay(familyId, date);
  const id = newId();
  const { id: _old, dayId: _d, slot: _s, favourite: _f, createdAt: _c, ...rest } = idea;
  await db.insert(ideas).values({ id, familyId, dayId: row.id, slot: 4, favourite: false, ...rest });
  await db.update(days).set({ chosenIdeaId: id, status: "planned" }).where(eq(days.id, row.id));
  return hydrateDay(familyId, await getOrCreateDay(familyId, date));
}

export async function bumpPostUses(postId: string | null) {
  if (!postId) return;
  const db = await getDb();
  await db
    .update(posts)
    .set({ uses: sql`${posts.uses} + 1` })
    .where(eq(posts.id, postId));
}
