import { eq } from "drizzle-orm";
import { route } from "@/lib/api";
import { requireSession } from "@/lib/auth";
import { listBadges } from "@/lib/badges";
import { activeChallenge } from "@/lib/challenges";
import { listCircles } from "@/lib/circles";
import { getStats, getTaste, listDays, listFavourites, listRooms } from "@/lib/data";
import { getDb, schema } from "@/lib/db";
import { pushConfigured, unreadCount } from "@/lib/notify";
import type { Family, PublicUser } from "@/lib/types";

export const runtime = "nodejs";

export const GET = route(async (req) => {
  const { user, family } = await requireSession();
  const today = req.nextUrl.searchParams.get("today") ?? new Date().toISOString().slice(0, 10);
  const db = await getDb();
  const [rooms, taste, days, favourites, stats, badges, circles, challenge, unread, members, subs] = await Promise.all([
    listRooms(family.id),
    getTaste(family.id),
    listDays(family.id),
    listFavourites(family.id),
    getStats(family.id),
    listBadges(family.id),
    listCircles(family.id),
    activeChallenge(today),
    unreadCount(user.id),
    db.select({ id: schema.users.id, displayName: schema.users.displayName }).from(schema.users).where(eq(schema.users.familyId, family.id)),
    db.select({ id: schema.pushSubscriptions.id }).from(schema.pushSubscriptions).where(eq(schema.pushSubscriptions.userId, user.id)).limit(1),
  ]);
  const publicUser: PublicUser = { id: user.id, email: user.email, displayName: user.displayName, hasPin: Boolean(user.pinHash), settings: user.settings, pushEnabled: subs.length > 0 };
  const fam: Family = { id: family.id, handle: family.handle, inviteCode: family.inviteCode, members };
  return { user: publicUser, family: fam, profile: family.profile, rooms, taste, days, favourites, stats, badges, circles, challenge, unread, pushAvailable: pushConfigured(), model: process.env.EOTS_MODEL ?? "claude-opus-5-5" };
});
