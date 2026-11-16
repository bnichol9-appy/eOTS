import { and, desc, eq, sql } from "drizzle-orm";
import { getDb, schema } from "./db";
import type { Challenge } from "./types";

const { challenges, posts, families } = schema;

/** The season's challenge calendar, relative to December of a given year. Edit freely. */
const CALENDAR = [
  { slug: "dress-rehearsal", title: "Dress Rehearsal", tag: "rehearsal", start: "11-24", end: "11-30", description: "Practice nights before the elf officially lands. Test a big build, work out the kinks, share what you learned." },
  { slug: "grand-entrance", title: "Grand Entrance", tag: "arrival", start: "12-01", end: "12-07", description: "The elf is back and wants everyone to know. Biggest, loudest arrival wins." },
  { slug: "bathroom-week", title: "Bathroom Week", tag: "bathroom", start: "12-08", end: "12-14", description: "Toilet paper, toothpaste, the shower, the loo. The smallest room, the biggest mess." },
  { slug: "recruit-the-toys", title: "Recruit the Toys", tag: "accomplices", start: "12-15", end: "12-21", description: "The elf has accomplices: toys, pets, the dog, the baby's teddies. A gang went through the house overnight." },
  { slug: "grand-finale", title: "Grand Finale", tag: "finale", start: "12-22", end: "12-24", description: "Last nights before the elf flies home. Go out with a bang." },
];

export async function ensureChallenges(year: number) {
  const db = await getDb();
  await db
    .insert(challenges)
    .values(CALENDAR.map((c) => ({ id: `${year}-${c.slug}`, title: c.title, description: c.description, tag: c.tag, startsOn: `${year}-${c.start}`, endsOn: `${year}-${c.end}` })))
    .onConflictDoNothing();
}

export function statusFor(c: { startsOn: string; endsOn: string }, today: string): Challenge["status"] {
  if (today < c.startsOn) return "upcoming";
  if (today > c.endsOn) return "ended";
  return "active";
}

export async function listChallenges(today: string): Promise<Challenge[]> {
  const year = Number(today.slice(0, 4));
  await ensureChallenges(year);
  const db = await getDb();
  const rows = await db.select().from(challenges).where(sql`${challenges.id} like ${`${year}-%`}`).orderBy(challenges.startsOn);
  const out: Challenge[] = [];
  for (const c of rows) {
    const [{ n }] = await db.select({ n: sql<number>`count(*)::int` }).from(posts).where(and(eq(posts.challengeId, c.id), eq(posts.status, "published")));
    let winner: Challenge["winner"] = null;
    if (c.winnerPostId) {
      const [w] = await db
        .select({ postId: posts.id, title: posts.title, elfName: posts.elfName, handle: families.handle })
        .from(posts)
        .innerJoin(families, eq(families.id, posts.familyId))
        .where(eq(posts.id, c.winnerPostId))
        .limit(1);
      winner = w ?? null;
    }
    out.push({ id: c.id, title: c.title, description: c.description, tag: c.tag, startsOn: c.startsOn, endsOn: c.endsOn, status: statusFor(c, today), entries: n, winner });
  }
  return out;
}

export async function activeChallenge(today: string) {
  return (await listChallenges(today)).find((c) => c.status === "active") ?? null;
}

/** Close ended challenges that have entries but no winner yet. Returns the winners for badge/notification work. */
export async function closeEndedChallenges(today: string) {
  const db = await getDb();
  const ended = await db.select().from(challenges).where(and(sql`${challenges.endsOn} < ${today}`, sql`${challenges.winnerPostId} is null`));
  const winners: { challenge: typeof ended[number]; postId: string; familyId: string; title: string }[] = [];
  for (const c of ended) {
    const [top] = await db
      .select({ id: posts.id, familyId: posts.familyId, title: posts.title })
      .from(posts)
      .where(and(eq(posts.challengeId, c.id), eq(posts.status, "published")))
      .orderBy(desc(posts.upvotes), desc(posts.uses), posts.createdAt)
      .limit(1);
    if (!top) continue;
    await db.update(challenges).set({ winnerPostId: top.id }).where(eq(challenges.id, c.id));
    winners.push({ challenge: c, postId: top.id, familyId: top.familyId, title: top.title });
  }
  return winners;
}
