import { Router, type Request, type Response, type NextFunction } from "express";
import { store } from "./store.js";
import {
  clearSession,
  isSetUp,
  issueSession,
  hasValidSession,
  recordAttempt,
  requireAuth,
  setPin,
  throttle,
  verifyPin,
} from "./auth.js";
import {
  ClaudeError,
  THREE_SLOTS,
  analyseRoom,
  analyseSetup,
  generateIdeas,
  setPhotoLoader,
  updateTaste,
} from "./claude.js";
import type { Day, Idea, Profile, Room } from "./types.js";

setPhotoLoader(async (id) => store.readPhotoBase64(id));

export const api = Router();

type Handler = (req: Request, res: Response) => Promise<unknown> | unknown;
const wrap = (fn: Handler) => (req: Request, res: Response, next: NextFunction) =>
  Promise.resolve(fn(req, res)).catch(next);

const PIN_RE = /^\d{4,8}$/;
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

function stripDataUrl(b64: string) {
  return b64.replace(/^data:image\/\w+;base64,/, "");
}

function bad(res: Response, msg: string) {
  return res.status(400).json({ error: msg });
}

// ---------- Auth ----------

api.get("/auth/status", (req, res) => {
  res.json({ setup: isSetUp(), authed: isSetUp() && hasValidSession(req), waitSeconds: throttle() });
});

api.post("/auth/setup", (req, res) => {
  if (isSetUp()) return res.status(409).json({ error: "PIN already set" });
  const pin = String(req.body?.pin ?? "");
  if (!PIN_RE.test(pin)) return bad(res, "PIN must be 4 to 8 digits");
  setPin(pin);
  issueSession(res);
  res.json({ ok: true });
});

api.post("/auth/login", (req, res) => {
  if (!isSetUp()) return res.status(409).json({ error: "setup_required" });
  const wait = throttle();
  if (wait > 0) return res.status(429).json({ error: `Too many tries. Wait ${wait}s.`, waitSeconds: wait });
  const ok = verifyPin(String(req.body?.pin ?? ""));
  recordAttempt(ok);
  if (!ok) return res.status(401).json({ error: "Wrong PIN", waitSeconds: throttle() });
  issueSession(res);
  res.json({ ok: true });
});

api.post("/auth/logout", (_req, res) => {
  clearSession(res);
  res.json({ ok: true });
});

api.post("/auth/change-pin", requireAuth, (req, res) => {
  const { oldPin, newPin } = req.body ?? {};
  if (!verifyPin(String(oldPin ?? ""))) return res.status(401).json({ error: "Current PIN is wrong" });
  if (!PIN_RE.test(String(newPin ?? ""))) return bad(res, "New PIN must be 4 to 8 digits");
  setPin(String(newPin));
  issueSession(res);
  res.json({ ok: true });
});

// Everything below needs a session.
api.use(requireAuth);

// ---------- Bootstrap / profile ----------

api.get("/bootstrap", (_req, res) => {
  const { profile, rooms, taste, days } = store.db;
  res.json({ profile, rooms, taste, days, model: process.env.EOTS_MODEL ?? "claude-opus-5-5" });
});

api.put("/profile", (req, res) => {
  const p = req.body as Partial<Profile>;
  const cur = store.db.profile;
  const next: Profile = {
    elfName: String(p.elfName ?? cur.elfName).slice(0, 60),
    elfPersonality: String(p.elfPersonality ?? cur.elfPersonality).slice(0, 400),
    kids: Array.isArray(p.kids)
      ? p.kids
          .map((k) => ({ name: String(k?.name ?? "").slice(0, 40), age: k?.age == null || k.age === ("" as unknown) ? null : Number(k.age) }))
          .filter((k) => k.name)
      : cur.kids,
    chaosLevel: Math.min(5, Math.max(1, Number(p.chaosLevel ?? cur.chaosLevel) || 4)),
    messTolerance: (["low", "medium", "high"] as const).includes(p.messTolerance as never) ? p.messTolerance! : cur.messTolerance,
    offLimits: String(p.offLimits ?? cur.offLimits).slice(0, 1000),
    supplies: String(p.supplies ?? cur.supplies).slice(0, 1000),
    notes: String(p.notes ?? cur.notes).slice(0, 1500),
    seasonStart: /^\d{2}-\d{2}$/.test(String(p.seasonStart)) ? String(p.seasonStart) : cur.seasonStart,
    seasonEnd: /^\d{2}-\d{2}$/.test(String(p.seasonEnd)) ? String(p.seasonEnd) : cur.seasonEnd,
  };
  store.db.profile = next;
  store.save();
  res.json(next);
});

// ---------- Rooms ----------

function findRoom(id: string) {
  return store.db.rooms.find((r) => r.id === id);
}

async function runRoomAnalysis(room: Room) {
  const photos = room.photos.slice(-4).map((p) => store.readPhotoBase64(p.id));
  if (photos.length === 0) return;
  room.inventory = await analyseRoom(room, photos);
  room.analysedAt = new Date().toISOString();
  store.save();
}

api.post(
  "/rooms",
  wrap(async (req, res) => {
    const name = String(req.body?.name ?? "").trim().slice(0, 60);
    if (!name) return bad(res, "Give the area a name");
    const photos: string[] = Array.isArray(req.body?.photos) ? req.body.photos : [];
    const room: Room = {
      id: store.newId(),
      name,
      notes: String(req.body?.notes ?? "").slice(0, 500),
      photos: photos.map((b) => ({ id: store.savePhoto(stripDataUrl(b)), takenAt: new Date().toISOString() })),
      inventory: null,
      analysedAt: null,
    };
    store.db.rooms.push(room);
    store.save();
    await runRoomAnalysis(room);
    res.json(room);
  }),
);

api.put("/rooms/:id", (req, res) => {
  const room = findRoom(req.params.id as string);
  if (!room) return res.status(404).json({ error: "No such area" });
  if (req.body?.name) room.name = String(req.body.name).trim().slice(0, 60);
  if (req.body?.notes !== undefined) room.notes = String(req.body.notes).slice(0, 500);
  store.save();
  res.json(room);
});

api.post(
  "/rooms/:id/photos",
  wrap(async (req, res) => {
    const room = findRoom(req.params.id as string);
    if (!room) return res.status(404).json({ error: "No such area" });
    const photos: string[] = Array.isArray(req.body?.photos) ? req.body.photos : [];
    if (photos.length === 0) return bad(res, "No photos");
    for (const b of photos) room.photos.push({ id: store.savePhoto(stripDataUrl(b)), takenAt: new Date().toISOString() });
    store.save();
    await runRoomAnalysis(room);
    res.json(room);
  }),
);

api.delete("/rooms/:id/photos/:photoId", (req, res) => {
  const room = findRoom(req.params.id as string);
  if (!room) return res.status(404).json({ error: "No such area" });
  const pid = req.params.photoId as string;
  room.photos = room.photos.filter((p) => p.id !== pid);
  store.deletePhoto(pid);
  store.save();
  res.json(room);
});

api.post(
  "/rooms/:id/analyse",
  wrap(async (req, res) => {
    const room = findRoom(req.params.id as string);
    if (!room) return res.status(404).json({ error: "No such area" });
    await runRoomAnalysis(room);
    res.json(room);
  }),
);

api.delete("/rooms/:id", (req, res) => {
  const room = findRoom(req.params.id as string);
  if (!room) return res.status(404).json({ error: "No such area" });
  for (const p of room.photos) store.deletePhoto(p.id);
  store.db.rooms = store.db.rooms.filter((r) => r.id !== room.id);
  store.save();
  res.json({ ok: true });
});

api.get("/photos/:id", (req, res) => {
  try {
    res.setHeader("Cache-Control", "private, max-age=86400");
    res.sendFile(store.photoPath(req.params.id as string));
  } catch {
    res.status(404).end();
  }
});

// ---------- Days / ideas ----------

function getDay(date: string): Day {
  const days = store.db.days;
  if (!days[date]) {
    days[date] = { date, ideas: [], chosenIdeaId: null, direction: "", status: "open", result: null, generatedAt: null };
  }
  return days[date];
}

function seasonInfo(date: string) {
  const { seasonStart, seasonEnd } = store.db.profile;
  const year = date.slice(0, 4);
  const start = new Date(`${year}-${seasonStart}T00:00:00Z`);
  const end = new Date(`${year}-${seasonEnd}T00:00:00Z`);
  const d = new Date(`${date}T00:00:00Z`);
  const dayMs = 86_400_000;
  const seasonLength = Math.round((end.getTime() - start.getTime()) / dayMs) + 1;
  const dayNumber = Math.round((d.getTime() - start.getTime()) / dayMs) + 1;
  return { dayNumber: dayNumber >= 1 && dayNumber <= seasonLength ? dayNumber : null, seasonLength };
}

function history(excludeDate: string): Day[] {
  return Object.values(store.db.days)
    .filter((d) => d.date !== excludeDate && d.status !== "open")
    .sort((a, b) => a.date.localeCompare(b.date))
    .slice(-40);
}

function withIds(ideas: Omit<Idea, "id">[]): Idea[] {
  return ideas.map((i) => ({ ...i, id: store.newId() }));
}

api.get("/days/:date", (req, res) => {
  const date = req.params.date as string;
  if (!DATE_RE.test(date)) return bad(res, "Bad date");
  res.json({ day: getDay(date), ...seasonInfo(date) });
});

api.post(
  "/days/:date/generate",
  wrap(async (req, res) => {
    const date = req.params.date as string;
    if (!DATE_RE.test(date)) return bad(res, "Bad date");
    const day = getDay(date);
    const direction = String(req.body?.direction ?? "").slice(0, 300);
    const focusRoom = req.body?.focusRoomId ? findRoom(String(req.body.focusRoomId)) ?? null : null;
    const { dayNumber, seasonLength } = seasonInfo(date);
    const ideas = await generateIdeas({
      profile: store.db.profile,
      rooms: store.db.rooms,
      taste: store.db.taste,
      history: history(date),
      date,
      dayNumber,
      seasonLength,
      direction,
      focusRoom,
      count: 3,
      avoidTitles: day.ideas.map((i) => i.title),
      slotHint: THREE_SLOTS,
    });
    day.ideas = withIds(ideas);
    day.direction = direction;
    day.chosenIdeaId = null;
    day.status = "open";
    day.generatedAt = new Date().toISOString();
    store.save();
    res.json({ day, dayNumber, seasonLength });
  }),
);

api.post(
  "/days/:date/remix",
  wrap(async (req, res) => {
    const date = req.params.date as string;
    const day = getDay(date);
    const ideaId = String(req.body?.ideaId ?? "");
    const idx = day.ideas.findIndex((i) => i.id === ideaId);
    if (idx === -1) return res.status(404).json({ error: "No such idea" });
    const old = day.ideas[idx];
    const direction = String(req.body?.direction ?? "").slice(0, 300);
    const { dayNumber, seasonLength } = seasonInfo(date);
    const [replacement] = await generateIdeas({
      profile: store.db.profile,
      rooms: store.db.rooms,
      taste: store.db.taste,
      history: history(date),
      date,
      dayNumber,
      seasonLength,
      direction: direction || "Different from the rejected idea, same energy or bigger.",
      focusRoom: null,
      count: 1,
      avoidTitles: day.ideas.map((i) => i.title),
      slotHint: `Produce exactly 1 idea. It replaces this rejected option: "${old.title}": ${old.pitch}. Keep the other two options in mind so it stays distinct: ${day.ideas
        .filter((i) => i.id !== ideaId)
        .map((i) => `"${i.title}"`)
        .join(", ")}.`,
    });
    if (!replacement) throw new ClaudeError("No idea came back. Try again.");
    day.ideas[idx] = { ...replacement, id: store.newId() };
    if (day.chosenIdeaId === ideaId) day.chosenIdeaId = null;
    store.save();
    res.json({ day, dayNumber, seasonLength });
  }),
);

api.post("/days/:date/choose", (req, res) => {
  const day = getDay(req.params.date as string);
  const ideaId = String(req.body?.ideaId ?? "");
  if (!day.ideas.some((i) => i.id === ideaId)) return res.status(404).json({ error: "No such idea" });
  day.chosenIdeaId = ideaId;
  day.status = "planned";
  store.save();
  res.json({ day });
});

api.post("/days/:date/unchoose", (req, res) => {
  const day = getDay(req.params.date as string);
  day.chosenIdeaId = null;
  day.status = "open";
  store.save();
  res.json({ day });
});

api.post("/days/:date/skip", (req, res) => {
  const day = getDay(req.params.date as string);
  day.status = "skipped";
  store.save();
  res.json({ day });
});

api.post("/days/:date/reopen", (req, res) => {
  const day = getDay(req.params.date as string);
  day.status = day.chosenIdeaId ? "planned" : "open";
  day.result = null;
  store.save();
  res.json({ day });
});

api.post(
  "/days/:date/complete",
  wrap(async (req, res) => {
    const date = req.params.date as string;
    const day = getDay(date);
    const idea = day.ideas.find((i) => i.id === day.chosenIdeaId) ?? null;
    const reaction = Math.min(5, Math.max(1, Number(req.body?.reaction) || 3));
    const feedbackTags: string[] = Array.isArray(req.body?.feedbackTags)
      ? req.body.feedbackTags.map((t: unknown) => String(t).slice(0, 40)).slice(0, 12)
      : [];
    const notes = String(req.body?.notes ?? "").slice(0, 1000);
    const photoB64 = req.body?.photo ? stripDataUrl(String(req.body.photo)) : null;

    let photoId: string | null = null;
    let analysis: { description: string; styleSignals: string[] } | null = null;
    if (photoB64) {
      photoId = store.savePhoto(photoB64);
      analysis = await analyseSetup(photoB64, idea, notes);
    }
    const rejectedTitles = day.ideas.filter((i) => i.id !== day.chosenIdeaId).map((i) => i.title);
    const taste = await updateTaste(store.db.taste, { date, idea, reaction, feedbackTags, notes, analysis, rejectedTitles });

    store.db.taste.profile = taste.profile;
    store.db.taste.updatedAt = new Date().toISOString();
    store.db.taste.updates.push({ date, summary: taste.summary });
    day.status = "done";
    day.result = {
      photoId,
      reaction,
      feedbackTags,
      notes,
      analysis: analysis?.description ?? null,
      learned: taste.summary,
      completedAt: new Date().toISOString(),
    };
    store.save();
    res.json({ day, taste: store.db.taste });
  }),
);

// ---------- Taste ----------

api.put("/taste", (req, res) => {
  store.db.taste.profile = String(req.body?.profile ?? "").slice(0, 4000);
  store.db.taste.updatedAt = new Date().toISOString();
  store.save();
  res.json(store.db.taste);
});

api.post("/taste/reset", (_req, res) => {
  store.db.taste = { profile: "", updatedAt: null, updates: [] };
  store.save();
  res.json(store.db.taste);
});
