import { and, eq, sql } from "drizzle-orm";
import { getDb, schema } from "./db";
import { notifyFamily } from "./notify";
import { notices } from "./notices";
import type { Badge } from "./types";

const { badges, days, ideas, posts, circles, challenges } = schema;

interface Ctx {
  nightsDone: number;
  streak: number;
  posts: number;
  upvotesReceived: number;
  remakesReceived: number;
  chaosFives: number;
  communityNights: number;
  tpNights: number;
  circlesFounded: number;
  challengeEntries: number;
  challengeWins: number;
}

export const BADGES: { key: string; name: string; icon: string; description: string; check: (c: Ctx) => boolean }[] = [
  { key: "first_night", name: "First Night of Chaos", icon: "moon", description: "Logged your first night.", check: (c) => c.nightsDone >= 1 },
  { key: "nights_10", name: "Ten Nights Deep", icon: "hash", description: "Ten nights done.", check: (c) => c.nightsDone >= 10 },
  { key: "streak_7", name: "Week of Mayhem", icon: "flame", description: "Seven nights in a row.", check: (c) => c.streak >= 7 },
  { key: "streak_24", name: "Full Season", icon: "trophy", description: "Every night of the season.", check: (c) => c.streak >= 24 },
  { key: "agent_of_chaos", name: "Agent of Chaos", icon: "zap", description: "Five chaos-level-5 nights.", check: (c) => c.chaosFives >= 5 },
  { key: "tp_artisan", name: "Toilet Paper Artisan", icon: "scroll", description: "Three toilet paper setups.", check: (c) => c.tpNights >= 3 },
  { key: "first_share", name: "Show-off", icon: "camera", description: "Shared your first setup.", check: (c) => c.posts >= 1 },
  { key: "crowd_pleaser", name: "Crowd Pleaser", icon: "thumbs-up", description: "25 upvotes received.", check: (c) => c.upvotesReceived >= 25 },
  { key: "legend", name: "Legend", icon: "crown", description: "100 upvotes received.", check: (c) => c.upvotesReceived >= 100 },
  { key: "trendsetter", name: "Trendsetter", icon: "repeat", description: "Your setups remade five times.", check: (c) => c.remakesReceived >= 5 },
  { key: "good_neighbour", name: "Good Neighbour", icon: "home", description: "Did three setups from other families.", check: (c) => c.communityNights >= 3 },
  { key: "ringleader", name: "Ringleader", icon: "users", description: "Started a circle.", check: (c) => c.circlesFounded >= 1 },
  { key: "contender", name: "Contender", icon: "target", description: "Entered a weekly challenge.", check: (c) => c.challengeEntries >= 1 },
  { key: "champion", name: "Champion", icon: "medal", description: "Won a weekly challenge.", check: (c) => c.challengeWins >= 1 },
];

export async function badgeContext(familyId: string, base: { nightsDone: number; streak: number; posts: number; upvotesReceived: number; remakesReceived: number }): Promise<Ctx> {
  const db = await getDb();
  const doneIdeas = await db
    .select({ chaos: ideas.chaos, source: ideas.source, title: ideas.title, tags: ideas.tags, kit: ideas.kit })
    .from(days)
    .innerJoin(ideas, eq(ideas.id, days.chosenIdeaId))
    .where(and(eq(days.familyId, familyId), eq(days.status, "done")));
  const tp = (i: { title: string; tags: string[]; kit: { name: string }[] }) => /toilet ?paper|\btp\b|loo roll/i.test([i.title, ...i.tags, ...i.kit.map((k) => k.name)].join(" "));
  const [{ founded }] = await db.select({ founded: sql<number>`count(*)::int` }).from(circles).where(eq(circles.ownerFamilyId, familyId));
  const [{ entries }] = await db.select({ entries: sql<number>`count(*)::int` }).from(posts).where(and(eq(posts.familyId, familyId), sql`${posts.challengeId} is not null`));
  const [{ wins }] = await db
    .select({ wins: sql<number>`count(*)::int` })
    .from(challenges)
    .innerJoin(posts, eq(posts.id, challenges.winnerPostId))
    .where(eq(posts.familyId, familyId));
  return {
    ...base,
    chaosFives: doneIdeas.filter((i) => i.chaos >= 5).length,
    communityNights: doneIdeas.filter((i) => i.source === "community").length,
    tpNights: doneIdeas.filter(tp).length,
    circlesFounded: founded,
    challengeEntries: entries,
    challengeWins: wins,
  };
}

export async function listBadges(familyId: string): Promise<Badge[]> {
  const db = await getDb();
  const rows = await db.select().from(badges).where(eq(badges.familyId, familyId));
  const have = new Map(rows.map((r) => [r.key, r.awardedAt]));
  return BADGES.map((b) => ({ key: b.key, name: b.name, icon: b.icon, description: b.description, awardedAt: have.get(b.key)?.toISOString() ?? null }));
}

/** Evaluate every badge and award new ones, notifying the family. Returns newly awarded keys. */
export async function awardBadges(familyId: string, ctx: Ctx): Promise<string[]> {
  const db = await getDb();
  const have = new Set((await db.select({ key: badges.key }).from(badges).where(eq(badges.familyId, familyId))).map((r) => r.key));
  const fresh = BADGES.filter((b) => !have.has(b.key) && b.check(ctx));
  if (fresh.length === 0) return [];
  await db.insert(badges).values(fresh.map((b) => ({ familyId, key: b.key }))).onConflictDoNothing();
  for (const b of fresh) {
    await notifyFamily(familyId, notices.badge(b.name, b.description));
  }
  return fresh.map((b) => b.key);
}
