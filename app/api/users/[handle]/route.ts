import { eq } from "drizzle-orm";
import { route } from "@/lib/api";
import { ApiError, requireSession } from "@/lib/auth";
import { listBadges } from "@/lib/badges";
import { getStats, listPosts } from "@/lib/data";
import { getDb, schema } from "@/lib/db";
import { elfNames } from "@/lib/types";

export const runtime = "nodejs";

/** Public elf page for a family: who they are, their stats, badges and shared setups. */
export const GET = route<{ handle: string }>(async (_req, { params }) => {
  const viewer = await requireSession();
  const db = await getDb();
  const [fam] = await db.select().from(schema.families).where(eq(schema.families.handle, params.handle.toLowerCase())).limit(1);
  if (!fam) throw new ApiError(404, "No such elf");
  const [stats, badges, posts, parents] = await Promise.all([
    getStats(fam.id),
    listBadges(fam.id),
    listPosts({ viewerFamilyId: viewer.family.id, viewerUserId: viewer.user.id, sort: "new", authorHandle: fam.handle, limit: 50 }),
    db.select({ name: schema.users.displayName }).from(schema.users).where(eq(schema.users.familyId, fam.id)),
  ]);
  return {
    handle: fam.handle,
    displayName: parents.map((p) => p.name).join(" & "),
    elfName: elfNames(fam.profile),
    elfPersonality: fam.profile.elves.map((e) => (e.personality ? `${e.name} is ${e.personality}` : e.name)).join(". "),
    chaosLevel: fam.profile.chaosLevel,
    stats,
    badges: badges.filter((b) => b.awardedAt),
    posts,
  };
});
