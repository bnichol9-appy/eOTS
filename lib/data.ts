import { and, desc, eq, inArray, ne, notInArray, sql } from "drizzle-orm";
import { getDb, schema } from "./db";
import type { IdeaRow, PostRow, RoomRow, UserRow } from "./db/schema";
import type { Comment, Day, Idea, PostDetail, PostSummary, Room, Stats, Taste } from "./types";
import { newId } from "./id";

const { rooms, roomPhotos, days, ideas, tasteProfiles, tasteUpdates, posts, votes, comments, users } = schema;

// ---------- Rooms ----------

export async function listRooms(userId: string): Promise<Room[]> {
  const db = await getDb();
  const rows = await db.select().from(rooms).where(eq(rooms.userId, userId)).orderBy(rooms.createdAt);
  if (rows.length === 0) return [];
  const photos = await db
    .select()
    .from(roomPhotos)
    .where(inArray(roomPhotos.roomId, rows.map((r) => r.id)))
    .orderBy(roomPhotos.createdAt);
  return rows.map((r) => toRoom(r, photos.filter((p) => p.roomId === r.id)));
}

export async function getRoom(userId: string, id: string): Promise<Room | null> {
  const db = await getDb();
  const [row] = await db.select().from(rooms).where(and(eq(rooms.id, id), eq(rooms.userId, userId))).limit(1);
  if (!row) return null;
  const photos = await db.select().from(roomPhotos).where(eq(roomPhotos.roomId, id)).orderBy(roomPhotos.createdAt);
  return toRoom(row, photos);
}

function toRoom(r: RoomRow, photos: { id: string; url: string }[]): Room {
  return {
    id: r.id,
    name: r.name,
    notes: r.notes,
    photos: photos.map((p) => ({ id: p.id, url: p.url })),
    inventory: r.inventory ?? null,
    analysedAt: r.analysedAt?.toISOString() ?? null,
  };
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

export async function getOrCreateDay(userId: string, date: string) {
  const db = await getDb();
  const [existing] = await db.select().from(days).where(and(eq(days.userId, userId), eq(days.date, date))).limit(1);
  if (existing) return existing;
  const [created] = await db.insert(days).values({ id: newId(), userId, date }).returning();
  return created;
}

export async function loadDay(userId: string, date: string): Promise<Day> {
  const row = await getOrCreateDay(userId, date);
  return hydrateDay(userId, row);
}

export async function hydrateDay(userId: string, row: typeof days.$inferSelect): Promise<Day> {
  const db = await getDb();
  const ideaRows = await db.select().from(ideas).where(eq(ideas.dayId, row.id)).orderBy(ideas.slot, ideas.createdAt);
  let communityPick: Day["communityPick"] = null;
  if (row.communityPickPostId) {
    const [p] = await listPosts({ viewerId: userId, ids: [row.communityPickPostId] });
    if (p) communityPick = { post: p, reason: row.communityPickReason ?? "" };
  }
  return {
    id: row.id,
    date: row.date,
    ideas: ideaRows.map(toIdea),
    chosenIdeaId: row.chosenIdeaId,
    direction: row.direction,
    status: row.status as Day["status"],
    result: row.result ?? null,
    postId: row.postId,
    communityPick,
    generatedAt: row.generatedAt?.toISOString() ?? null,
  };
}

export async function listDays(userId: string): Promise<Day[]> {
  const db = await getDb();
  const rows = await db.select().from(days).where(eq(days.userId, userId)).orderBy(desc(days.date)).limit(120);
  if (rows.length === 0) return [];
  const ideaRows = await db
    .select()
    .from(ideas)
    .where(inArray(ideas.dayId, rows.map((d) => d.id)));
  return rows.map((row) => ({
    id: row.id,
    date: row.date,
    ideas: ideaRows.filter((i) => i.dayId === row.id).sort((a, b) => (a.slot ?? 9) - (b.slot ?? 9)).map(toIdea),
    chosenIdeaId: row.chosenIdeaId,
    direction: row.direction,
    status: row.status as Day["status"],
    result: row.result ?? null,
    postId: row.postId,
    communityPick: null,
    generatedAt: row.generatedAt?.toISOString() ?? null,
  }));
}

/** Last 40 finished nights, oldest first, for the generator's history block. */
export async function historyDays(userId: string, excludeDate: string): Promise<Day[]> {
  const all = await listDays(userId);
  return all
    .filter((d) => d.date !== excludeDate && d.status !== "open")
    .sort((a, b) => a.date.localeCompare(b.date))
    .slice(-40);
}

export async function listFavourites(userId: string): Promise<Idea[]> {
  const db = await getDb();
  const rows = await db
    .select()
    .from(ideas)
    .where(and(eq(ideas.userId, userId), eq(ideas.favourite, true)))
    .orderBy(desc(ideas.createdAt));
  return rows.map(toIdea);
}

// ---------- Taste ----------

export async function getTaste(userId: string): Promise<Taste> {
  const db = await getDb();
  const [row] = await db.select().from(tasteProfiles).where(eq(tasteProfiles.userId, userId)).limit(1);
  const updates = await db.select().from(tasteUpdates).where(eq(tasteUpdates.userId, userId)).orderBy(desc(tasteUpdates.createdAt)).limit(30);
  return {
    profile: row?.profile ?? "",
    updatedAt: row?.updatedAt?.toISOString() ?? null,
    updates: updates.map((u) => ({ date: u.date, summary: u.summary })),
  };
}

export async function saveTaste(userId: string, profile: string, update?: { date: string; summary: string }) {
  const db = await getDb();
  await db
    .insert(tasteProfiles)
    .values({ userId, profile, updatedAt: new Date() })
    .onConflictDoUpdate({ target: tasteProfiles.userId, set: { profile, updatedAt: new Date() } });
  if (update) await db.insert(tasteUpdates).values({ id: newId(), userId, ...update });
}

// ---------- Community ----------

export type FeedSort = "hot" | "new" | "top";

/** Hacker-News style decay: engagement over age. */
const hotScore = sql<number>`(${posts.upvotes} + 2 * ${posts.uses} + 0.5 * ${posts.commentsCount} + 1) / power(extract(epoch from (now() - ${posts.createdAt})) / 3600 + 2, 1.3)`;

export interface FeedQuery {
  viewerId: string;
  sort?: FeedSort;
  tag?: string | null;
  roomType?: string | null;
  excludeUserId?: string | null;
  excludePostIds?: string[];
  ids?: string[];
  authorHandle?: string | null;
  limit?: number;
  offset?: number;
}

export async function listPosts(q: FeedQuery): Promise<PostSummary[]> {
  const db = await getDb();
  const conds = [q.ids ? inArray(posts.id, q.ids) : eq(posts.status, "published")];
  if (q.tag) conds.push(sql`${posts.tags} ? ${q.tag}`);
  if (q.roomType) conds.push(eq(posts.roomType, q.roomType));
  if (q.excludeUserId) conds.push(ne(posts.userId, q.excludeUserId));
  if (q.excludePostIds?.length) conds.push(notInArray(posts.id, q.excludePostIds));
  if (q.authorHandle) conds.push(eq(users.handle, q.authorHandle));
  const order = q.sort === "new" ? desc(posts.createdAt) : q.sort === "top" ? desc(posts.upvotes) : desc(hotScore);
  const rows = await db
    .select({ post: posts, author: { handle: users.handle, displayName: users.displayName } })
    .from(posts)
    .innerJoin(users, eq(users.id, posts.userId))
    .where(and(...conds))
    .orderBy(order, desc(posts.createdAt))
    .limit(q.limit ?? 30)
    .offset(q.offset ?? 0);
  if (rows.length === 0) return [];
  const ids = rows.map((r) => r.post.id);
  const [myVotes, mySaves] = await Promise.all([
    db.select({ postId: votes.postId }).from(votes).where(and(eq(votes.userId, q.viewerId), inArray(votes.postId, ids))),
    db
      .select({ postId: ideas.sourcePostId })
      .from(ideas)
      .where(and(eq(ideas.userId, q.viewerId), eq(ideas.favourite, true), inArray(ideas.sourcePostId, ids))),
  ]);
  const voted = new Set(myVotes.map((v) => v.postId));
  const saved = new Set(mySaves.map((s) => s.postId));
  return rows.map((r) => toSummary(r.post, r.author, { voted: voted.has(r.post.id), saved: saved.has(r.post.id), mine: r.post.userId === q.viewerId }));
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
    commentsCount: p.commentsCount,
    createdAt: p.createdAt.toISOString(),
    author: { ...author, elfName: p.elfName },
    viewer,
  };
}

export async function getPostDetail(viewerId: string, id: string): Promise<PostDetail | null> {
  const db = await getDb();
  const [summary] = await listPosts({ viewerId, ids: [id] });
  if (!summary) return null;
  const [row] = await db.select().from(posts).where(eq(posts.id, id)).limit(1);
  if (!row) return null;
  if (row.status !== "published" && row.userId !== viewerId) return null;
  const commentRows = await db
    .select({ c: comments, author: { handle: users.handle, displayName: users.displayName, profile: users.profile } })
    .from(comments)
    .innerJoin(users, eq(users.id, comments.userId))
    .where(eq(comments.postId, id))
    .orderBy(comments.createdAt)
    .limit(200);
  let remakeOf: PostDetail["remakeOf"] = null;
  if (row.remakeOfPostId) {
    const [orig] = await db.select({ id: posts.id, title: posts.title }).from(posts).where(eq(posts.id, row.remakeOfPostId)).limit(1);
    if (orig) remakeOf = orig;
  }
  return {
    ...summary,
    whatKidsSee: row.whatKidsSee,
    steps: row.steps,
    supplies: row.supplies,
    parentTip: row.parentTip,
    status: row.status,
    remakeOf,
    comments: commentRows.map(
      (r): Comment => ({
        id: r.c.id,
        body: r.c.body,
        createdAt: r.c.createdAt.toISOString(),
        author: { handle: r.author.handle, displayName: r.author.displayName, elfName: r.author.profile.elfName || "their elf" },
        mine: r.c.userId === viewerId,
      }),
    ),
  };
}

/** Posts this family has already done or saved, so the community pick never repeats them. */
export async function usedPostIds(userId: string): Promise<string[]> {
  const db = await getDb();
  const rows = await db
    .select({ id: ideas.sourcePostId })
    .from(ideas)
    .where(and(eq(ideas.userId, userId), sql`${ideas.sourcePostId} is not null`));
  return rows.map((r) => r.id!).filter(Boolean);
}

// ---------- Stats ----------

export async function getStats(user: UserRow): Promise<Stats> {
  const db = await getDb();
  const done = await db
    .select({ date: days.date })
    .from(days)
    .where(and(eq(days.userId, user.id), eq(days.status, "done")))
    .orderBy(desc(days.date));
  let streak = 0;
  if (done.length) {
    const dates = new Set(done.map((d) => d.date));
    const cursor = new Date();
    // Count back from today (or yesterday if tonight isn't done yet).
    const iso = (d: Date) => d.toISOString().slice(0, 10);
    if (!dates.has(iso(cursor))) cursor.setUTCDate(cursor.getUTCDate() - 1);
    while (dates.has(iso(cursor))) {
      streak += 1;
      cursor.setUTCDate(cursor.getUTCDate() - 1);
    }
  }
  const [agg] = await db
    .select({ count: sql<number>`count(*)::int`, upvotes: sql<number>`coalesce(sum(${posts.upvotes}), 0)::int` })
    .from(posts)
    .where(and(eq(posts.userId, user.id), eq(posts.status, "published")));
  return { nightsDone: done.length, streak, posts: agg?.count ?? 0, upvotesReceived: agg?.upvotes ?? 0 };
}
