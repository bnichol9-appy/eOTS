import { eq } from "drizzle-orm";
import { body, route, bad } from "@/lib/api";
import { ApiError, PIN_RE, getSessionUser, hashSecret, setUnlockCookie, verifySecret } from "@/lib/auth";
import { getDb, schema } from "@/lib/db";

export const runtime = "nodejs";

/** Set the PIN for the first time, or change it (requires the current PIN). */
export const POST = route(async (req) => {
  const user = await getSessionUser();
  if (!user) throw new ApiError(401, "signed_out");
  const b = await body<{ pin?: string; currentPin?: string }>(req);
  const pin = String(b.pin ?? "");
  if (!PIN_RE.test(pin)) bad("PIN must be 4 to 8 digits");
  if (user.pinHash && !verifySecret(String(b.currentPin ?? ""), user.pinHash)) throw new ApiError(401, "Current PIN is wrong");
  const db = await getDb();
  await db.update(schema.users).set({ pinHash: hashSecret(pin) }).where(eq(schema.users.id, user.id));
  await setUnlockCookie(user.id);
  return { ok: true };
});
