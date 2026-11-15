import type { Day, Profile, Room, Taste } from "./types";

export class ApiError extends Error {
  status: number;
  waitSeconds?: number;
  constructor(status: number, message: string, waitSeconds?: number) {
    super(message);
    this.status = status;
    this.waitSeconds = waitSeconds;
  }
}

export const onUnauthorized: { handler: () => void } = { handler: () => {} };

async function call<T>(method: string, url: string, body?: unknown): Promise<T> {
  const res = await fetch(`/api${url}`, {
    method,
    headers: body ? { "Content-Type": "application/json" } : undefined,
    body: body ? JSON.stringify(body) : undefined,
    credentials: "same-origin",
  });
  let data: { error?: string; waitSeconds?: number } & Record<string, unknown> = {};
  try {
    data = await res.json();
  } catch {
    /* no body */
  }
  if (!res.ok) {
    if (res.status === 401 && !url.startsWith("/auth/")) onUnauthorized.handler();
    throw new ApiError(res.status, data.error ?? `Request failed (${res.status})`, data.waitSeconds);
  }
  return data as T;
}

export interface Bootstrap {
  profile: Profile;
  rooms: Room[];
  taste: Taste;
  days: Record<string, Day>;
  model: string;
}

export interface DayResponse {
  day: Day;
  dayNumber?: number | null;
  seasonLength?: number;
  taste?: Taste;
}

export const api = {
  authStatus: () => call<{ setup: boolean; authed: boolean; waitSeconds: number }>("GET", "/auth/status"),
  setupPin: (pin: string) => call<{ ok: true }>("POST", "/auth/setup", { pin }),
  login: (pin: string) => call<{ ok: true }>("POST", "/auth/login", { pin }),
  logout: () => call<{ ok: true }>("POST", "/auth/logout"),
  changePin: (oldPin: string, newPin: string) => call<{ ok: true }>("POST", "/auth/change-pin", { oldPin, newPin }),

  bootstrap: () => call<Bootstrap>("GET", "/bootstrap"),
  saveProfile: (p: Profile) => call<Profile>("PUT", "/profile", p),

  addRoom: (name: string, notes: string, photos: string[]) => call<Room>("POST", "/rooms", { name, notes, photos }),
  updateRoom: (id: string, patch: { name?: string; notes?: string }) => call<Room>("PUT", `/rooms/${id}`, patch),
  addRoomPhotos: (id: string, photos: string[]) => call<Room>("POST", `/rooms/${id}/photos`, { photos }),
  deleteRoomPhoto: (id: string, photoId: string) => call<Room>("DELETE", `/rooms/${id}/photos/${photoId}`),
  analyseRoom: (id: string) => call<Room>("POST", `/rooms/${id}/analyse`),
  deleteRoom: (id: string) => call<{ ok: true }>("DELETE", `/rooms/${id}`),

  getDay: (date: string) => call<DayResponse>("GET", `/days/${date}`),
  generate: (date: string, direction: string, focusRoomId: string | null) =>
    call<DayResponse>("POST", `/days/${date}/generate`, { direction, focusRoomId }),
  remix: (date: string, ideaId: string, direction: string) => call<DayResponse>("POST", `/days/${date}/remix`, { ideaId, direction }),
  choose: (date: string, ideaId: string) => call<DayResponse>("POST", `/days/${date}/choose`, { ideaId }),
  unchoose: (date: string) => call<DayResponse>("POST", `/days/${date}/unchoose`),
  skip: (date: string) => call<DayResponse>("POST", `/days/${date}/skip`),
  reopen: (date: string) => call<DayResponse>("POST", `/days/${date}/reopen`),
  complete: (date: string, body: { photo: string | null; reaction: number; feedbackTags: string[]; notes: string }) =>
    call<DayResponse>("POST", `/days/${date}/complete`, body),

  saveTaste: (profile: string) => call<Taste>("PUT", "/taste", { profile }),
  resetTaste: () => call<Taste>("POST", "/taste/reset"),
};
