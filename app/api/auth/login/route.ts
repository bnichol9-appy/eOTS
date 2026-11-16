import { eq } from "drizzle-orm";
import { body, route } from "@/lib/api";
import { ApiError, checkThrottle, recordAttempt, setSessionCookie, verifySecret } from "@/lib/auth";
import { getDb, schema } from "@/lib/db";

export const runtime = "nodejs";

export const POST = route(async (req) => {
  const b = await body<{ email?: string; password?: string }>(req);
  const email = String(b.email ?? "").trim().toLowerCase();
  const db = await getDb();
  const [user] = await db.select().from(schema.users).where(eq(schema.users.email, email)).limit(1);
  if (!user) throw new ApiError(401, "Wrong email or password");
  await checkThrottle(user);
  const ok = verifySecret(String(b.password ?? ""), user.passwordHash);
  await recordAttempt(user, ok);
  if (!ok) throw new ApiError(401, "Wrong email or password");
  await setSessionCookie(user.id);
  return { ok: true };
});
