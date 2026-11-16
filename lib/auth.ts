import { createHmac, randomBytes, scryptSync, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";
import { eq } from "drizzle-orm";
import { getDb, schema } from "./db";
import type { UserRow } from "./db/schema";

const SESSION = "eots_session";
const UNLOCK = "eots_unlock";
const SESSION_DAYS = 30;
const UNLOCK_HOURS = 12;

function secret() {
  const s = process.env.AUTH_SECRET;
  if (s) return s;
  if (process.env.NODE_ENV === "production") throw new Error("AUTH_SECRET is not set");
  return "dev-secret-not-for-production";
}

/** Fail fast with a clear message before touching the database. */
export function assertAuthConfig() {
  secret();
}

export function hashSecret(value: string) {
  const salt = randomBytes(16).toString("hex");
  return `${salt}:${scryptSync(value, salt, 32).toString("hex")}`;
}

export function verifySecret(value: string, stored: string | null) {
  if (!stored) return false;
  const [salt, hash] = stored.split(":");
  if (!salt || !hash) return false;
  const a = scryptSync(value, salt, 32);
  const b = Buffer.from(hash, "hex");
  return a.length === b.length && timingSafeEqual(a, b);
}

function sign(payload: string) {
  return createHmac("sha256", secret()).update(payload).digest("hex");
}

function token(userId: string, ttlMs: number) {
  const exp = Date.now() + ttlMs;
  const payload = `${userId}.${exp}`;
  return `${payload}.${sign(payload)}`;
}

function readToken(raw: string | undefined): string | null {
  if (!raw) return null;
  const [userId, exp, sig] = raw.split(".");
  if (!userId || !exp || !sig || Number(exp) < Date.now()) return null;
  const expected = Buffer.from(sign(`${userId}.${exp}`), "hex");
  const given = Buffer.from(sig, "hex");
  if (expected.length !== given.length || !timingSafeEqual(expected, given)) return null;
  return userId;
}

const cookieOpts = {
  httpOnly: true,
  sameSite: "lax" as const,
  secure: process.env.NODE_ENV === "production",
  path: "/",
};

export async function setSessionCookie(userId: string) {
  (await cookies()).set(SESSION, token(userId, SESSION_DAYS * 86_400_000), { ...cookieOpts, maxAge: SESSION_DAYS * 86_400 });
}

export async function setUnlockCookie(userId: string) {
  (await cookies()).set(UNLOCK, token(userId, UNLOCK_HOURS * 3_600_000), { ...cookieOpts, maxAge: UNLOCK_HOURS * 3600 });
}

export async function clearUnlockCookie() {
  (await cookies()).delete(UNLOCK);
}

export async function clearAllCookies() {
  const c = await cookies();
  c.delete(SESSION);
  c.delete(UNLOCK);
}

export class ApiError extends Error {
  status: number;
  extra: Record<string, unknown>;
  constructor(status: number, message: string, extra: Record<string, unknown> = {}) {
    super(message);
    this.status = status;
    this.extra = extra;
  }
}

/** The signed-in user, or null. Does not check the PIN unlock. */
export async function getSessionUser(): Promise<UserRow | null> {
  const c = await cookies();
  const userId = readToken(c.get(SESSION)?.value);
  if (!userId) return null;
  const db = await getDb();
  const [user] = await db.select().from(schema.users).where(eq(schema.users.id, userId)).limit(1);
  return user ?? null;
}

export async function isUnlocked(userId: string) {
  const c = await cookies();
  return readToken(c.get(UNLOCK)?.value) === userId;
}

/** Signed in AND unlocked with the PIN (or no PIN set yet). Throws a 401 ApiError otherwise. */
export async function requireUser(): Promise<UserRow> {
  const user = await getSessionUser();
  if (!user) throw new ApiError(401, "signed_out");
  if (user.pinHash && !(await isUnlocked(user.id))) throw new ApiError(401, "locked");
  return user;
}

/** Throttle: after 5 misses, lock for 30s doubling each further miss. */
export async function checkThrottle(user: UserRow) {
  if (user.lockedUntil && user.lockedUntil.getTime() > Date.now()) {
    const wait = Math.ceil((user.lockedUntil.getTime() - Date.now()) / 1000);
    throw new ApiError(429, `Too many tries. Wait ${wait}s.`, { waitSeconds: wait });
  }
}

export async function recordAttempt(user: UserRow, ok: boolean) {
  const db = await getDb();
  if (ok) {
    if (user.failedAttempts > 0 || user.lockedUntil) {
      await db.update(schema.users).set({ failedAttempts: 0, lockedUntil: null }).where(eq(schema.users.id, user.id));
    }
    return;
  }
  const failed = user.failedAttempts + 1;
  const lockedUntil = failed >= 5 ? new Date(Date.now() + 30_000 * 2 ** (failed - 5)) : null;
  await db.update(schema.users).set({ failedAttempts: failed, lockedUntil }).where(eq(schema.users.id, user.id));
}

export const PIN_RE = /^\d{4,8}$/;
export const HANDLE_RE = /^[a-z0-9_]{3,24}$/;

export function toHandle(displayName: string) {
  const base = displayName.toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_+|_+$/g, "").slice(0, 18) || "elf";
  return `${base}_${randomBytes(2).toString("hex")}`;
}
