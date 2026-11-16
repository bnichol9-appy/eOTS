import { and, desc, eq, inArray, sql } from "drizzle-orm";
import { getDb, schema } from "./db";
import { ApiError, inviteCode } from "./auth";
import { newId } from "./id";
import { notifyFamily } from "./notify";
import type { Circle } from "./types";

const { circles, circleMembers, families, users, days, ideas } = schema;

export async function listCircles(familyId: string): Promise<Circle[]> {
  const db = await getDb();
  const mine = await db
    .select({ c: circles })
    .from(circleMembers)
    .innerJoin(circles, eq(circles.id, circleMembers.circleId))
    .where(eq(circleMembers.familyId, familyId))
    .orderBy(circles.createdAt);
  const out: Circle[] = [];
  for (const { c } of mine) out.push(await hydrateCircle(c, familyId));
  return out;
}

export async function getCircle(familyId: string, id: string): Promise<Circle> {
  const db = await getDb();
  const [m] = await db
    .select({ c: circles })
    .from(circleMembers)
    .innerJoin(circles, eq(circles.id, circleMembers.circleId))
    .where(and(eq(circleMembers.familyId, familyId), eq(circleMembers.circleId, id)))
    .limit(1);
  if (!m) throw new ApiError(404, "You're not in that circle");
  return hydrateCircle(m.c, familyId);
}

async function hydrateCircle(c: typeof circles.$inferSelect, viewerFamilyId: string): Promise<Circle> {
  const db = await getDb();
  const memberRows = await db
    .select({ familyId: families.id, handle: families.handle, profile: families.profile })
    .from(circleMembers)
    .innerJoin(families, eq(families.id, circleMembers.familyId))
    .where(eq(circleMembers.circleId, c.id))
    .orderBy(circleMembers.joinedAt);
  const familyIds = memberRows.map((m) => m.familyId);
  const parents = familyIds.length ? await db.select({ familyId: users.familyId, name: users.displayName }).from(users).where(inArray(users.familyId, familyIds)) : [];
  // What members did on recent nights (shared or not): title only, no photos unless they posted.
  const recent = familyIds.length
    ? await db
        .select({ familyId: days.familyId, date: days.date, title: ideas.title, postId: days.postId })
        .from(days)
        .innerJoin(ideas, eq(ideas.id, days.chosenIdeaId))
        .where(and(inArray(days.familyId, familyIds), eq(days.status, "done")))
        .orderBy(desc(days.date))
        .limit(20)
    : [];
  const byFamily = new Map(memberRows.map((m) => [m.familyId, m]));
  return {
    id: c.id,
    name: c.name,
    inviteCode: c.inviteCode,
    isOwner: c.ownerFamilyId === viewerFamilyId,
    memberCount: memberRows.length,
    members: memberRows.map((m) => ({
      familyId: m.familyId,
      handle: m.handle,
      elfName: m.profile.elfName || "their elf",
      parents: parents
        .filter((p) => p.familyId === m.familyId)
        .map((p) => p.name)
        .join(" & "),
    })),
    recent: recent.map((r) => ({ elfName: byFamily.get(r.familyId)?.profile.elfName || "an elf", handle: byFamily.get(r.familyId)?.handle ?? "", title: r.title, date: r.date, postId: r.postId })),
  };
}

export async function createCircle(familyId: string, name: string) {
  const db = await getDb();
  const id = newId();
  await db.insert(circles).values({ id, name, inviteCode: inviteCode("CIR"), ownerFamilyId: familyId });
  await db.insert(circleMembers).values({ circleId: id, familyId });
  return getCircle(familyId, id);
}

export async function joinCircle(familyId: string, code: string, joinerName: string) {
  const db = await getDb();
  const [c] = await db.select().from(circles).where(eq(circles.inviteCode, code.trim().toUpperCase())).limit(1);
  if (!c) throw new ApiError(404, "No circle with that code");
  await db.insert(circleMembers).values({ circleId: c.id, familyId }).onConflictDoNothing();
  if (c.ownerFamilyId !== familyId) {
    await notifyFamily(c.ownerFamilyId, { type: "circle_join", title: `${joinerName} joined ${c.name}`, body: "Their elf's nights will show up in your circle.", url: `/community/circles/${c.id}` });
  }
  return getCircle(familyId, c.id);
}

export async function leaveCircle(familyId: string, id: string) {
  const db = await getDb();
  const [c] = await db.select().from(circles).where(eq(circles.id, id)).limit(1);
  if (!c) throw new ApiError(404, "No such circle");
  if (c.ownerFamilyId === familyId) {
    await db.delete(circles).where(eq(circles.id, id));
    return;
  }
  await db.delete(circleMembers).where(and(eq(circleMembers.circleId, id), eq(circleMembers.familyId, familyId)));
}

export async function circleCount(familyId: string) {
  const db = await getDb();
  const [{ n }] = await db.select({ n: sql<number>`count(*)::int` }).from(circleMembers).where(eq(circleMembers.familyId, familyId));
  return n;
}
