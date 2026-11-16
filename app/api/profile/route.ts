import { eq } from "drizzle-orm";
import { body, route, bad } from "@/lib/api";
import { HANDLE_RE, requireUser } from "@/lib/auth";
import { getDb, schema } from "@/lib/db";
import type { Profile } from "@/lib/types";

export const runtime = "nodejs";

export const PUT = route(async (req) => {
  const user = await requireUser();
  const p = await body<Partial<Profile> & { displayName?: string; handle?: string }>(req);
  const cur = user.profile;
  const next: Profile = {
    elfName: String(p.elfName ?? cur.elfName).slice(0, 60),
    elfPersonality: String(p.elfPersonality ?? cur.elfPersonality).slice(0, 400),
    kids: Array.isArray(p.kids)
      ? p.kids.map((k) => ({ name: String(k?.name ?? "").slice(0, 40), age: k?.age == null ? null : Number(k.age) || null })).filter((k) => k.name)
      : cur.kids,
    chaosLevel: Math.min(5, Math.max(1, Number(p.chaosLevel ?? cur.chaosLevel) || 4)),
    messTolerance: (["low", "medium", "high"] as const).includes(p.messTolerance as never) ? p.messTolerance! : cur.messTolerance,
    offLimits: String(p.offLimits ?? cur.offLimits).slice(0, 1000),
    supplies: String(p.supplies ?? cur.supplies).slice(0, 1000),
    notes: String(p.notes ?? cur.notes).slice(0, 1500),
    seasonStart: /^\d{2}-\d{2}$/.test(String(p.seasonStart)) ? String(p.seasonStart) : cur.seasonStart,
    seasonEnd: /^\d{2}-\d{2}$/.test(String(p.seasonEnd)) ? String(p.seasonEnd) : cur.seasonEnd,
  };
  const displayName = p.displayName !== undefined ? String(p.displayName).trim().slice(0, 40) || user.displayName : user.displayName;
  const handle = p.handle !== undefined ? String(p.handle).trim().toLowerCase() : user.handle;
  if (!HANDLE_RE.test(handle)) bad("Handle must be 3 to 24 letters, numbers or underscores");
  const db = await getDb();
  if (handle !== user.handle) {
    const [taken] = await db.select({ id: schema.users.id }).from(schema.users).where(eq(schema.users.handle, handle)).limit(1);
    if (taken) bad("That handle is taken");
  }
  await db.update(schema.users).set({ profile: next, displayName, handle }).where(eq(schema.users.id, user.id));
  return { profile: next, user: { id: user.id, email: user.email, displayName, handle, hasPin: Boolean(user.pinHash) } };
});
