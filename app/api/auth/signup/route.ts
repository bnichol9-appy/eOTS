import { eq } from "drizzle-orm";
import { body, route, bad } from "@/lib/api";
import { HANDLE_RE, assertAuthConfig, hashSecret, setSessionCookie, toHandle } from "@/lib/auth";
import { getDb, schema } from "@/lib/db";
import { newId } from "@/lib/id";
import { defaultProfile } from "@/lib/types";

export const runtime = "nodejs";

export const POST = route(async (req) => {
  assertAuthConfig();
  const b = await body<{ email?: string; password?: string; displayName?: string; elfName?: string; handle?: string }>(req);
  const email = String(b.email ?? "").trim().toLowerCase();
  const password = String(b.password ?? "");
  const displayName = String(b.displayName ?? "").trim().slice(0, 40);
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) bad("Enter a valid email");
  if (password.length < 8) bad("Password must be at least 8 characters");
  if (!displayName) bad("What should other parents call you?");
  const handle = b.handle ? String(b.handle).trim().toLowerCase() : toHandle(displayName);
  if (!HANDLE_RE.test(handle)) bad("Handle must be 3 to 24 letters, numbers or underscores");
  const db = await getDb();
  const [taken] = await db.select({ id: schema.users.id }).from(schema.users).where(eq(schema.users.email, email)).limit(1);
  if (taken) bad("That email already has an account");
  const [handleTaken] = await db.select({ id: schema.users.id }).from(schema.users).where(eq(schema.users.handle, handle)).limit(1);
  if (handleTaken) bad("That handle is taken");
  const id = newId();
  await db.insert(schema.users).values({
    id,
    email,
    passwordHash: hashSecret(password),
    displayName,
    handle,
    profile: { ...defaultProfile, elfName: String(b.elfName ?? "").trim().slice(0, 60) },
  });
  await setSessionCookie(id);
  return { ok: true };
});
