import { eq } from "drizzle-orm";
import { body, route, bad } from "@/lib/api";
import { assertAuthConfig, hashSecret, inviteCode, setSessionCookie, toHandle } from "@/lib/auth";
import { getDb, schema } from "@/lib/db";
import { newId } from "@/lib/id";
import { notifyFamily } from "@/lib/notify";
import { notices } from "@/lib/notices";
import { defaultProfile, defaultSettings } from "@/lib/types";

export const runtime = "nodejs";

export const POST = route(async (req) => {
  assertAuthConfig();
  const b = await body<{ email?: string; password?: string; displayName?: string; elfName?: string; familyCode?: string; timezone?: string }>(req);
  const email = String(b.email ?? "").trim().toLowerCase();
  const password = String(b.password ?? "");
  const displayName = String(b.displayName ?? "").trim().slice(0, 40);
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) bad("Enter a valid email");
  if (password.length < 8) bad("Password must be at least 8 characters");
  if (!displayName) bad("What should other parents call you?");
  const db = await getDb();
  const [taken] = await db.select({ id: schema.users.id }).from(schema.users).where(eq(schema.users.email, email)).limit(1);
  if (taken) bad("That email already has an account");

  let familyId: string;
  const code = String(b.familyCode ?? "").trim().toUpperCase();
  if (code) {
    const [fam] = await db.select().from(schema.families).where(eq(schema.families.inviteCode, code)).limit(1);
    if (!fam) bad("That family code doesn't match anyone");
    familyId = fam.id;
  } else {
    familyId = newId();
    const elfName = String(b.elfName ?? "").trim().slice(0, 60);
    await db.insert(schema.families).values({
      id: familyId,
      handle: toHandle(elfName || displayName),
      inviteCode: inviteCode("FAM"),
      profile: { ...defaultProfile, elves: elfName ? [{ name: elfName, personality: "", color: "elf1" }] : [] },
    });
  }
  const id = newId();
  const timezone = typeof b.timezone === "string" && b.timezone.length < 60 ? b.timezone : "UTC";
  await db.insert(schema.users).values({ id, familyId, email, passwordHash: hashSecret(password), displayName, settings: { ...defaultSettings, timezone } });
  if (code) await notifyFamily(familyId, notices.coparent(displayName), id);
  await setSessionCookie(id);
  return { ok: true };
});
