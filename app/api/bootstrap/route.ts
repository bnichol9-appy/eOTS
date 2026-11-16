import { route } from "@/lib/api";
import { requireUser } from "@/lib/auth";
import { getStats, getTaste, listDays, listFavourites, listRooms } from "@/lib/data";
import type { PublicUser } from "@/lib/types";

export const runtime = "nodejs";

export const GET = route(async () => {
  const user = await requireUser();
  const [rooms, taste, days, favourites, stats] = await Promise.all([listRooms(user.id), getTaste(user.id), listDays(user.id), listFavourites(user.id), getStats(user)]);
  const publicUser: PublicUser = { id: user.id, email: user.email, displayName: user.displayName, handle: user.handle, hasPin: Boolean(user.pinHash) };
  return { user: publicUser, profile: user.profile, rooms, taste, days, favourites, stats, model: process.env.EOTS_MODEL ?? "claude-opus-5-5" };
});
