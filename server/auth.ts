import { createHmac, randomBytes, scryptSync, timingSafeEqual } from "node:crypto";
import type { Request, Response, NextFunction } from "express";
import { config } from "./config.js";
import { store } from "./store.js";

const COOKIE = "eots_session";

function hashPin(pin: string, salt: string) {
  return scryptSync(pin, salt, 32).toString("hex");
}

export function isSetUp() {
  return Boolean(store.config.pinHash);
}

export function setPin(pin: string) {
  const salt = randomBytes(16).toString("hex");
  store.saveConfig({ ...store.config, pinSalt: salt, pinHash: hashPin(pin, salt) });
}

export function verifyPin(pin: string) {
  const { pinHash, pinSalt } = store.config;
  if (!pinHash || !pinSalt) return false;
  const a = Buffer.from(hashPin(pin, pinSalt), "hex");
  const b = Buffer.from(pinHash, "hex");
  return a.length === b.length && timingSafeEqual(a, b);
}

// Brute-force throttle: after 5 misses, wait 30s, doubling each further miss.
let failures = 0;
let lockedUntil = 0;
export function throttle(): number {
  const wait = lockedUntil - Date.now();
  return wait > 0 ? Math.ceil(wait / 1000) : 0;
}
export function recordAttempt(ok: boolean) {
  if (ok) {
    failures = 0;
    lockedUntil = 0;
    return;
  }
  failures += 1;
  if (failures >= 5) lockedUntil = Date.now() + 30_000 * 2 ** (failures - 5);
}

function sign(payload: string) {
  return createHmac("sha256", store.config.sessionSecret).update(payload).digest("hex");
}

export function issueSession(res: Response) {
  const exp = Date.now() + config.sessionHours * 3600_000;
  const token = `${exp}.${sign(String(exp))}`;
  res.cookie(COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: config.secureCookies,
    maxAge: config.sessionHours * 3600_000,
    path: "/",
  });
}

export function clearSession(res: Response) {
  res.clearCookie(COOKIE, { path: "/" });
}

export function hasValidSession(req: Request) {
  const raw = req.headers.cookie ?? "";
  const match = raw.split(";").map((c) => c.trim()).find((c) => c.startsWith(`${COOKIE}=`));
  if (!match) return false;
  const [exp, sig] = match.slice(COOKIE.length + 1).split(".");
  if (!exp || !sig || Number(exp) < Date.now()) return false;
  const expected = Buffer.from(sign(exp), "hex");
  const given = Buffer.from(sig, "hex");
  return expected.length === given.length && timingSafeEqual(expected, given);
}

export function requireAuth(req: Request, res: Response, next: NextFunction) {
  if (!isSetUp()) return res.status(401).json({ error: "setup_required" });
  if (!hasValidSession(req)) return res.status(401).json({ error: "locked" });
  next();
}
