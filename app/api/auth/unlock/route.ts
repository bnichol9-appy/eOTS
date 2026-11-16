import { body, route } from "@/lib/api";
import { ApiError, checkThrottle, getSessionUser, recordAttempt, setUnlockCookie, verifySecret } from "@/lib/auth";

export const runtime = "nodejs";

export const POST = route(async (req) => {
  const user = await getSessionUser();
  if (!user) throw new ApiError(401, "signed_out");
  if (!user.pinHash) {
    await setUnlockCookie(user.id);
    return { ok: true };
  }
  await checkThrottle(user);
  const b = await body<{ pin?: string }>(req);
  const ok = verifySecret(String(b.pin ?? ""), user.pinHash);
  await recordAttempt(user, ok);
  if (!ok) throw new ApiError(401, "Wrong PIN");
  await setUnlockCookie(user.id);
  return { ok: true };
});
