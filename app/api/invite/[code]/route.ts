import { eq, sql } from "drizzle-orm";
import { route } from "@/lib/api";
import { ApiError } from "@/lib/auth";
import { getDb, schema } from "@/lib/db";

export const runtime = "nodejs";

/** Public: what an invite link points at, so the join page can say who invited you. Reveals only names, never data. */
export const GET = route<{ code: string }>(async (_req, { params }) => {
  const code = String(params.code ?? "")
    .trim()
    .toUpperCase();
  const db = await getDb();
  if (code.startsWith("FAM-")) {
    const [fam] = await db.select().from(schema.families).where(eq(schema.families.inviteCode, code)).limit(1);
    if (!fam) throw new ApiError(404, "That invite link has expired or is wrong");
    const parents = await db.select({ name: schema.users.displayName }).from(schema.users).where(eq(schema.users.familyId, fam.id));
    return { kind: "family", code, elves: fam.profile.elves.map((e) => e.name).filter(Boolean), parents: parents.map((p) => p.name.split(" ")[0]) };
  }
  if (code.startsWith("CIR-")) {
    const [c] = await db.select().from(schema.circles).where(eq(schema.circles.inviteCode, code)).limit(1);
    if (!c) throw new ApiError(404, "That invite link has expired or is wrong");
    const [{ n }] = await db
      .select({ n: sql<number>`count(*)::int` })
      .from(schema.circleMembers)
      .where(eq(schema.circleMembers.circleId, c.id));
    return { kind: "circle", code, name: c.name, families: n };
  }
  throw new ApiError(404, "That invite link has expired or is wrong");
});
