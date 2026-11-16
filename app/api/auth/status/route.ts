import { route } from "@/lib/api";
import { getSessionUser, isUnlocked } from "@/lib/auth";

export const runtime = "nodejs";

export const GET = route(async () => {
  const user = await getSessionUser();
  if (!user) return { authed: false, hasPin: false, unlocked: false };
  const hasPin = Boolean(user.pinHash);
  const unlocked = !hasPin || (await isUnlocked(user.id));
  const wait = user.lockedUntil && user.lockedUntil.getTime() > Date.now() ? Math.ceil((user.lockedUntil.getTime() - Date.now()) / 1000) : 0;
  return { authed: true, hasPin, unlocked, waitSeconds: wait, displayName: user.displayName };
});
