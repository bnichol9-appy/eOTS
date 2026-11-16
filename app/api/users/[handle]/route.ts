import { eq } from "drizzle-orm";
import { route } from "@/lib/api";
import { ApiError, requireUser } from "@/lib/auth";
import { getStats, listPosts } from "@/lib/data";
import { getDb, schema } from "@/lib/db";

export const runtime = "nodejs";

/** Public elf profile: who they are, their stats and their shared setups. */
export const GET = route<{ handle: string }>(async (_req, { params }) => {
  const viewer = await requireUser();
  const db = await getDb();
  const [user] = await db.select().from(schema.users).where(eq(schema.users.handle, params.handle.toLowerCase())).limit(1);
  if (!user) throw new ApiError(404, "No such elf");
  const [stats, posts] = await Promise.all([getStats(user), listPosts({ viewerId: viewer.id, sort: "new", authorHandle: user.handle, limit: 50 })]);
  return {
    handle: user.handle,
    displayName: user.displayName,
    elfName: user.profile.elfName || "their elf",
    elfPersonality: user.profile.elfPersonality,
    chaosLevel: user.profile.chaosLevel,
    stats,
    posts,
  };
});
