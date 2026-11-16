import { eq, sql } from "drizzle-orm";
import { body, route, bad } from "@/lib/api";
import { requireSession } from "@/lib/auth";
import { getDb, schema } from "@/lib/db";
import { notifyFamily } from "@/lib/notify";

export const runtime = "nodejs";

/** Move this login onto a partner's family. Only allowed while the current family has no history, to avoid silently orphaning data. */
export const POST = route(async (req) => {
  const { user, family } = await requireSession();
  const b = await body<{ code?: string }>(req);
  const code = String(b.code ?? "").trim().toUpperCase();
  const db = await getDb();
  const [target] = await db.select().from(schema.families).where(eq(schema.families.inviteCode, code)).limit(1);
  if (!target) bad("That family code doesn't match anyone");
  if (target.id === family.id) bad("That's your own family code");
  const [{ n }] = await db.select({ n: sql<number>`count(*)::int` }).from(schema.days).where(eq(schema.days.familyId, family.id));
  const [{ r }] = await db.select({ r: sql<number>`count(*)::int` }).from(schema.rooms).where(eq(schema.rooms.familyId, family.id));
  if (n > 0 || r > 0) bad("This account already has an elf with history. Ask your partner to sign up with your family code instead.");
  await db.update(schema.users).set({ familyId: target.id }).where(eq(schema.users.id, user.id));
  const [{ left }] = await db.select({ left: sql<number>`count(*)::int` }).from(schema.users).where(eq(schema.users.familyId, family.id));
  if (left === 0) await db.delete(schema.families).where(eq(schema.families.id, family.id));
  await notifyFamily(target.id, { type: "coparent", title: `${user.displayName} joined your elf`, body: "You now share the house, the plan and the log.", url: "/settings" }, user.id);
  return { ok: true };
});
