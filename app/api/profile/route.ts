import { eq } from "drizzle-orm";
import { body, route, bad } from "@/lib/api";
import { HANDLE_RE, requireSession } from "@/lib/auth";
import { getDb, schema } from "@/lib/db";
import { ELF_COLORS, type AgeBand, type Elf, type Profile } from "@/lib/types";

export const runtime = "nodejs";

export const PUT = route(async (req) => {
  const { user, family } = await requireSession();
  const p = await body<Partial<Profile> & { displayName?: string; handle?: string }>(req);
  const cur = family.profile;
  const num = (v: unknown, fallback: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, Number(v ?? fallback) || fallback));
  const elves: Elf[] = Array.isArray(p.elves)
    ? p.elves
        .map((e, i) => ({ name: String(e?.name ?? "").trim().slice(0, 30), personality: String(e?.personality ?? "").trim().slice(0, 120), color: ELF_COLORS[i] ?? "elf3" }))
        .filter((e) => e.name)
        .slice(0, 3)
    : cur.elves;
  const next: Profile = {
    elves,
    kids: Array.isArray(p.kids) ? p.kids.map((k) => ({ name: String(k?.name ?? "").slice(0, 40), age: k?.age == null ? null : Number(k.age) || null })).filter((k) => k.name) : cur.kids,
    ageBands: Array.isArray(p.ageBands) ? (p.ageBands.filter((b) => ["under5", "5to8", "9to12"].includes(String(b))) as AgeBand[]) : cur.ageBands,
    spookLevel: num(p.spookLevel, cur.spookLevel, 1, 5),
    chaosLevel: num(p.chaosLevel, cur.chaosLevel, 1, 5),
    maxSetupMinutes: [5, 10, 20, 30].includes(Number(p.maxSetupMinutes)) ? Number(p.maxSetupMinutes) : cur.maxSetupMinutes,
    messTolerance: (["low", "medium", "high"] as const).includes(p.messTolerance as never) ? p.messTolerance! : cur.messTolerance,
    offLimits: String(p.offLimits ?? cur.offLimits).slice(0, 1000),
    supplies: String(p.supplies ?? cur.supplies).slice(0, 1000),
    notes: String(p.notes ?? cur.notes).slice(0, 1500),
    seasonStart: /^\d{2}-\d{2}$/.test(String(p.seasonStart)) ? String(p.seasonStart) : cur.seasonStart,
    seasonEnd: /^\d{2}-\d{2}$/.test(String(p.seasonEnd)) ? String(p.seasonEnd) : cur.seasonEnd,
    onboarded: typeof p.onboarded === "boolean" ? p.onboarded : cur.onboarded,
  };
  const displayName = p.displayName !== undefined ? String(p.displayName).trim().slice(0, 40) || user.displayName : user.displayName;
  const handle = p.handle !== undefined ? String(p.handle).trim().toLowerCase() : family.handle;
  if (!HANDLE_RE.test(handle)) bad("Handle must be 3 to 24 letters, numbers or underscores");
  const db = await getDb();
  if (handle !== family.handle) {
    const [taken] = await db.select({ id: schema.families.id }).from(schema.families).where(eq(schema.families.handle, handle)).limit(1);
    if (taken) bad("That handle is taken");
  }
  await db.update(schema.families).set({ profile: next, handle }).where(eq(schema.families.id, family.id));
  await db.update(schema.users).set({ displayName }).where(eq(schema.users.id, user.id));
  return { profile: next, handle, displayName };
});
