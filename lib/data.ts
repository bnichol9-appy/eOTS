import { and, desc, eq, inArray, ne, notInArray, or, sql } from "drizzle-orm";
import { getDb, schema } from "./db";
import type { IdeaRow, PostRow, RoomRow } from "./db/schema";
import type { Comment, Day, Idea, PostDetail, PostSummary, Room, Stats, Taste } from "./types";
import { newId } from "./id";
import { awardBadges, badgeContext } from "./badges";

const { rooms, roomPhotos, days, ideas, tasteProfiles, tasteUpdates, posts, votes, comments, users, families, circleMembers, challenges } = schema;

// ---------- Rooms ----------

export async function listRooms(familyId: string): Promise<Room[]> {
  const db = await getDb();
  const rows = await db.select().from(rooms).where(eq(rooms.familyId, familyId)).orderBy(rooms.createdAt);
  if (rows.length === 0) return [];
  const photos = await db
    .select()
    .from(roomPhotos)
    .where(inArray(roomPhotos.roomId, rows.map((r) => r.id)))
    .orderBy(roomPhotos.createdAt);
  return rows.map((r) => toRoom(r, photos.filter((p) => p.roomId === r.id)));
}

export async function getRoom(familyId: string, id: string): Promise<Room | null> {
  const db = await getDb();
  const [row] = await db.select().from(rooms).where(and(eq(rooms.id, id), eq(rooms.familyId, familyId))).limit(1);
  if (!row) return null;
  const photos = await db.select().from(roomPhotos).where(eq(roomPhotos.roomId, id)).orderBy(roomPhotos.createdAt);
  return toRoom(row, photos);
}

function toRoom(r: RoomRow, photos: { id: string; url: string }[]): Room {
  return { id: r.id, name: r.name, notes: r.notes, photos: photos.map((p) => ({ id: p.id, url: p.url })), inventory: r.inventory ?? null, analysedAt: r.analysedAt?.toISOString() ?? null };
}

// ---------- Ideas / days ----------

export function toIdea(i: IdeaRow): Idea {
  return {
    id: i.id,
    dayId: i.dayId,
    slot: i.slot,
    source: i.source as Idea["source"],
    sourcePostId: i.sourcePostId,
    favourite: i.favourite,
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

export async function getOrCreateDay(familyId: string, date: string) {
  const db = await getDb();
  const [existing] = await db.select().from(days).where(and(eq(days.familyId, familyId), eq(days.date, date))).limit(1);
  if (existing) return existing;
  const [created] = await db.insert(days).values({ id: newId(), familyId, date }).returning();
  return created;
}

export async function loadDay(familyId: string, date: string): Promise<Day> {
  return hydrateDay(familyId, await getOrCreateDay(familyId, date));
}

export async function hydrateDay(familyId: string, row: typeof days.$inferSelect): Promise<Day> {
  const db = await getDb();
  const ideaRows = await db.select().from(ideas).where(eq(ideas.dayId, row.id)).orderBy(ideas.slot, ideas.createdAt);
  let communityPick: Day["communityPick"] = null;
  if (row.communityPickPostId) {
    const [p] = await listPosts({ viewerFamilyId: familyId, ids: [row.communityPickPostId] });
    if (p) communityPick = { post: p, reason: row.communityPickReason ?? "" };
  }
  return dayShape(row, ideaRows.map(toIdea), communityPick);
}

function dayShape(row: typeof days.$inferSelect, ideaList: Idea[], communityPick: Day["communityPick"]): Day {
  return {
    id: row.id,
    date: row.date,
    ideas: ideaList,
    chosenIdeaId: row.chosenIdeaId,
    direction: row.direction,
    status: row.status as Day["status"],
    result: row.result ?? null,
    postId: row.postId,
    communityPick,
    generatedAt: row.generatedAt?.toISOString() ?? null,
  };
}

export async function listDays(familyId: string): Promise<Day[]> {
  const db = await getDb();
  const rows = await db.select().from(days).where(eq(days.familyId, familyId)).orderBy(desc(days.date)).limit(120);
  if (rows.length === 0) return [];
  const ideaRows = await db
    .select()
    .from(ideas)
    .where(inArray(ideas.dayId, rows.map((d) => d.id)));
  return rows.map((row) =>
    dayShape(
      row,
      ideaRows
        .filter((i) => i.dayId === row.id)
        .sort((a, b) => (a.slot ?? 9) - (b.slot ?? 9))
        .map(toIdea),
      null,
    ),
  );
}

export async function historyDays(familyId: string, excludeDate: string): Promise<Day[]> {
  const all = await listDays(familyId);
  return all
    .filter((d) => d.date !== excludeDate && d.status !== "open")
    .sort((a, b) => a.date.localeCompare(b.date))
    .slice(-40);
}

export async function listFavourites(familyId: string): Promise<Idea[]> {
  const db = await getDb();
  const rows = await db
    .select()
    .from(ideas)
    .where(and(eq(ideas.familyId, familyId), eq(ideas.favourite, true)))
    .orderBy(desc(ideas.createdAt));
  return rows.map(toIdea);
}

// ---------- Taste ----------

export async function getTaste(familyId: string): Promise<Taste> {
  const db = await getDb();
  const [row] = await db.select().from(tasteProfiles).where(eq(tasteProfiles.familyId, familyId)).limit(1);
  const updates = await db.select().from(tasteUpdates).where(eq(tasteUpdates.familyId, familyId)).orderBy(desc(tasteUpdates.createdAt)).limit(30);
  return { profile: row?.profile ?? "", updatedAt: row?.updatedAt?.toISOString() ?? null, updates: updates.map((u) => ({ date: u.date, summary: u.summary })) };
}

export async function saveTaste(familyId: string, profile: string, update?: { date: string; summary: string }) {
  const db = await getDb();
  await db
    .insert(tasteProfiles)
    .values({ familyId, profile, updatedAt: new Date() })
    .onConflictDoUpdate({ target: tasteProfiles.familyId, set: { profile, updatedAt: new Date() } });
  if (update) await db.insert(tasteUpdates).values({ id: newId(), familyId, ...update });
}

// ---------- Community ----------

export type FeedSort = "hot" | "new" | "top";

const hotScore = sql<number>`(${posts.upvotes} + 2 * ${posts.uses} + 3 * ${posts.remakes} + 0.5 * ${posts.commentsCount} + 1) / power(extract(epoch from (now() - ${posts.createdAt})) / 3600 + 2, 1.3)`;

/** Families that share at least one circle with the viewer (including the viewer). */
function circleFamiliesOf(familyId: string) {
  const mine = sql`(select ${circleMembers.circleId} from ${circleMembers} where ${circleMembers.familyId} = ${familyId})`;
  return sql`(select ${circleMembers.familyId} from ${circleMembers} where ${circleMembers.circleId} in ${mine})`;
}

export interface FeedQuery {
  viewerFamilyId: string;
  viewerUserId?: string;
  sort?: FeedSort;
  tag?: string | null;
  roomType?: string | null;
  excludeFamilyId?: string | null;
  excludePostIds?: string[];
  ids?: string[];
  authorHandle?: string | null;
  circleId?: string | null;
  challengeId?: string | null;
  remakeOf?: string | null;
  limit?: number;
  offset?: number;
}

export async function listPosts(q: FeedQuery): Promise<PostSummary[]> {
  const db = await getDb();
  const conds = [];
  if (q.ids) conds.push(inArray(posts.id, q.ids));
  else conds.push(eq(posts.status, "published"));
  // Visibility: public, or circle-only posts from families in one of the viewer's circles, or the viewer's own.
  conds.push(or(eq(posts.visibility, "public"), eq(posts.familyId, q.viewerFamilyId), sql`${posts.familyId} in ${circleFamiliesOf(q.viewerFamilyId)}`)!);
  if (q.tag) conds.push(sql`${posts.tags} ? ${q.tag}`);
  if (q.roomType) conds.push(eq(posts.roomType, q.roomType));
  if (q.excludeFamilyId) conds.push(ne(posts.familyId, q.excludeFamilyId));
  if (q.excludePostIds?.length) conds.push(notInArray(posts.id, q.excludePostIds));
  if (q.authorHandle) conds.push(eq(families.handle, q.authorHandle));
  if (q.circleId) conds.push(sql`${posts.familyId} in (select ${circleMembers.familyId} from ${circleMembers} where ${circleMembers.circleId} = ${q.circleId})`);
  if (q.challengeId) conds.push(eq(posts.challengeId, q.challengeId));
  if (q.remakeOf) conds.push(eq(posts.remakeOfPostId, q.remakeOf));
  const order = q.sort === "new" ? desc(posts.createdAt) : q.sort === "top" ? desc(posts.upvotes) : desc(hotScore);
  const rows = await db
    .select({ post: posts, handle: families.handle, displayName: users.displayName })
    .from(posts)
    .innerJoin(families, eq(families.id, posts.familyId))
    .innerJoin(users, eq(users.id, posts.userId))
    .where(and(...conds))
    .orderBy(order, desc(posts.createdAt))
    .limit(q.limit ?? 30)
    .offset(q.offset ?? 0);
  if (rows.length === 0) return [];
  const ids = rows.map((r) => r.post.id);
  const [myVotes, mySaves] = await Promise.all([
    q.viewerUserId ? db.select({ postId: votes.postId }).from(votes).where(and(eq(votes.userId, q.viewerUserId), inArray(votes.postId, ids))) : Promise.resolve([]),
    db
      .select({ postId: ideas.sourcePostId })
      .from(ideas)
      .where(and(eq(ideas.familyId, q.viewerFamilyId), eq(ideas.favourite, true), inArray(ideas.sourcePostId, ids))),
  ]);
  const voted = new Set(myVotes.map((v) => v.postId));
  const saved = new Set(mySaves.map((s) => s.postId));
  return rows.map((r) => toSummary(r.post, { handle: r.handle, displayName: r.displayName }, { voted: voted.has(r.post.id), saved: saved.has(r.post.id), mine: r.post.familyId === q.viewerFamilyId }));
}

function toSummary(p: PostRow, author: { handle: string; displayName: string }, viewer: PostSummary["viewer"]): PostSummary {
  return {
    id: p.id,
    title: p.title,
    pitch: p.pitch,
    roomType: p.roomType,
    setupMinutes: p.setupMinutes,
    chaos: p.chaos,
    mess: p.mess,
    tags: p.tags,
    photoUrl: p.photoUrl,
    reaction: p.reaction,
    upvotes: p.upvotes,
    uses: p.uses,
    remakes: p.remakes,
    commentsCount: p.commentsCount,
    visibility: p.visibility as PostSummary["visibility"],
    challengeId: p.challengeId,
    createdAt: p.createdAt.toISOString(),
    author: { ...author, elfName: p.elfName },
    viewer,
  };
}

export async function getPostDetail(viewer: { familyId: string; userId: string }, id: string): Promise<PostDetail | null> {
  const db = await getDb();
  const [summary] = await listPosts({ viewerFamilyId: viewer.familyId, viewerUserId: viewer.userId, ids: [id] });
  if (!summary) return null;
  const [row] = await db.select().from(posts).where(eq(posts.id, id)).limit(1);
  if (!row) return null;
  if (row.status !== "published" && row.familyId !== viewer.familyId) return null;
  const commentRows = await db
    .select({ c: comments, displayName: users.displayName, handle: families.handle, profile: families.profile })
    .from(comments)
    .innerJoin(users, eq(users.id, comments.userId))
    .innerJoin(families, eq(families.id, users.familyId))
    .where(eq(comments.postId, id))
    .orderBy(comments.createdAt)
    .limit(200);
  let remakeOf: PostDetail["remakeOf"] = null;
  if (row.remakeOfPostId) {
    const [orig] = await db.select({ id: posts.id, title: posts.title }).from(posts).where(eq(posts.id, row.remakeOfPostId)).limit(1);
    if (orig) remakeOf = orig;
  }
  let challenge: PostDetail["challenge"] = null;
  if (row.challengeId) {
    const [c] = await db.select({ id: challenges.id, title: challenges.title }).from(challenges).where(eq(challenges.id, row.challengeId)).limit(1);
    if (c) challenge = c;
  }
  const remakeList = await listPosts({ viewerFamilyId: viewer.familyId, viewerUserId: viewer.userId, remakeOf: id, sort: "top", limit: 20 });
  return {
    ...summary,
    whatKidsSee: row.whatKidsSee,
    steps: row.steps,
    supplies: row.supplies,
    parentTip: row.parentTip,
    status: row.status,
    remakeOf,
    remakeList,
    challenge,
    comments: commentRows.map(
      (r): Comment => ({
        id: r.c.id,
        body: r.c.body,
        createdAt: r.c.createdAt.toISOString(),
        author: { handle: r.handle, displayName: r.displayName, elfName: r.profile.elfName || "their elf" },
        mine: r.c.userId === viewer.userId,
      }),
    ),
  };
}

export async function usedPostIds(familyId: string): Promise<string[]> {
  const db = await getDb();
  const rows = await db
    .select({ id: ideas.sourcePostId })
    .from(ideas)
    .where(and(eq(ideas.familyId, familyId), sql`${ideas.sourcePostId} is not null`));
  return rows.map((r) => r.id!).filter(Boolean);
}

// ---------- Stats & badges ----------

export async function getStats(familyId: string): Promise<Stats> {
  const db = await getDb();
  const done = await db
    .select({ date: days.date })
    .from(days)
    .where(and(eq(days.familyId, familyId), eq(days.status, "done")))
    .orderBy(desc(days.date));
  let streak = 0;
  if (done.length) {
    const dates = new Set(done.map((d) => d.date));
    const cursor = new Date();
    const iso = (d: Date) => d.toISOString().slice(0, 10);
    if (!dates.has(iso(cursor))) cursor.setUTCDate(cursor.getUTCDate() - 1);
    while (dates.has(iso(cursor))) {
      streak += 1;
      cursor.setUTCDate(cursor.getUTCDate() - 1);
    }
  }
  const [agg] = await db
    .select({ count: sql<number>`count(*)::int`, upvotes: sql<number>`coalesce(sum(${posts.upvotes}), 0)::int`, remakes: sql<number>`coalesce(sum(${posts.remakes}), 0)::int` })
    .from(posts)
    .where(and(eq(posts.familyId, familyId), eq(posts.status, "published")));
  return { nightsDone: done.length, streak, posts: agg?.count ?? 0, upvotesReceived: agg?.upvotes ?? 0, remakesReceived: agg?.remakes ?? 0 };
}

/** Recompute stats and hand out any badges newly earned. Call after anything that could earn one. */
export async function refreshBadges(familyId: string) {
  const stats = await getStats(familyId);
  return awardBadges(familyId, await badgeContext(familyId, stats));
}
