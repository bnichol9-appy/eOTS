"use client";
import type { Day, Idea, PostDetail, PostSummary, Profile, PublicUser, Room, Stats, Taste } from "../types";

export class ApiError extends Error {
  status: number;
  waitSeconds?: number;
  constructor(status: number, message: string, waitSeconds?: number) {
    super(message);
    this.status = status;
    this.waitSeconds = waitSeconds;
  }
}

export const onUnauthorized: { handler: (reason: string) => void } = { handler: () => {} };

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
    if (res.status === 401 && !url.startsWith("/auth/")) onUnauthorized.handler(data.error ?? "locked");
    throw new ApiError(res.status, data.error ?? `Request failed (${res.status})`, data.waitSeconds);
  }
  return data as T;
}

export interface Bootstrap {
  user: PublicUser;
  profile: Profile;
  rooms: Room[];
  taste: Taste;
  days: Day[];
  favourites: Idea[];
  stats: Stats;
  model: string;
}

export interface DayResponse {
  day: Day;
  dayNumber?: number | null;
  seasonLength?: number;
  taste?: Taste;
  post?: PostDetail;
}

export interface AuthStatus {
  authed: boolean;
  hasPin: boolean;
  unlocked: boolean;
  waitSeconds?: number;
  displayName?: string;
}

export interface ElfProfile {
  handle: string;
  displayName: string;
  elfName: string;
  elfPersonality: string;
  chaosLevel: number;
  stats: Stats;
  posts: PostSummary[];
}

export const api = {
  authStatus: () => call<AuthStatus>("GET", "/auth/status"),
  signup: (b: { email: string; password: string; displayName: string; elfName: string }) => call<{ ok: true }>("POST", "/auth/signup", b),
  login: (email: string, password: string) => call<{ ok: true }>("POST", "/auth/login", { email, password }),
  logout: () => call<{ ok: true }>("POST", "/auth/logout"),
  setPin: (pin: string, currentPin?: string) => call<{ ok: true }>("POST", "/auth/pin", { pin, currentPin }),
  unlock: (pin: string) => call<{ ok: true }>("POST", "/auth/unlock", { pin }),
  lock: () => call<{ ok: true }>("POST", "/auth/lock"),

  bootstrap: () => call<Bootstrap>("GET", "/bootstrap"),
  saveProfile: (p: Profile & { displayName?: string; handle?: string }) => call<{ profile: Profile; user: PublicUser }>("PUT", "/profile", p),

  addRoom: (name: string, notes: string, photos: string[]) => call<Room>("POST", "/rooms", { name, notes, photos }),
  updateRoom: (id: string, patch: { name?: string; notes?: string }) => call<Room>("PUT", `/rooms/${id}`, patch),
  addRoomPhotos: (id: string, photos: string[]) => call<Room>("POST", `/rooms/${id}/photos`, { photos }),
  deleteRoomPhoto: (id: string, photoId: string) => call<Room>("DELETE", `/rooms/${id}/photos/${photoId}`),
  analyseRoom: (id: string) => call<Room>("POST", `/rooms/${id}/analyse`),
  deleteRoom: (id: string) => call<{ ok: true }>("DELETE", `/rooms/${id}`),

  getDay: (date: string) => call<DayResponse>("GET", `/days/${date}`),
  generate: (date: string, direction: string, focusRoomId: string | null) => call<DayResponse>("POST", `/days/${date}/generate`, { direction, focusRoomId }),
  remix: (date: string, ideaId: string, direction: string) => call<DayResponse>("POST", `/days/${date}/remix`, { ideaId, direction }),
  choose: (date: string, ideaId: string) => call<DayResponse>("POST", `/days/${date}/choose`, { ideaId }),
  unchoose: (date: string) => call<DayResponse>("POST", `/days/${date}/unchoose`),
  skip: (date: string) => call<DayResponse>("POST", `/days/${date}/skip`),
  reopen: (date: string) => call<DayResponse>("POST", `/days/${date}/reopen`),
  usePick: (date: string) => call<DayResponse>("POST", `/days/${date}/use-pick`),
  complete: (date: string, body: { photo: string | null; reaction: number; feedbackTags: string[]; notes: string }) => call<DayResponse>("POST", `/days/${date}/complete`, body),
  share: (date: string, description: string) => call<DayResponse>("POST", `/days/${date}/share`, { description }),

  favourite: (ideaId: string) => call<Idea>("POST", `/ideas/${ideaId}/favourite`),
  useIdea: (ideaId: string, date: string) => call<DayResponse>("POST", `/ideas/${ideaId}/use`, { date }),

  saveTaste: (profile: string) => call<Taste>("PUT", "/taste", { profile }),
  resetTaste: () => call<Taste>("POST", "/taste/reset"),

  feed: (q: { sort?: string; tag?: string; room?: string; author?: string; offset?: number }) => {
    const sp = new URLSearchParams();
    for (const [k, v] of Object.entries(q)) if (v !== undefined && v !== "" && v !== null) sp.set(k, String(v));
    return call<{ posts: PostSummary[] }>("GET", `/posts?${sp}`);
  },
  post: (id: string) => call<PostDetail>("GET", `/posts/${id}`),
  deletePost: (id: string) => call<{ ok: true }>("DELETE", `/posts/${id}`),
  vote: (id: string) => call<{ voted: boolean; upvotes: number }>("POST", `/posts/${id}/vote`),
  savePost: (id: string) => call<{ saved: boolean }>("POST", `/posts/${id}/save`),
  usePost: (id: string, date: string) => call<DayResponse>("POST", `/posts/${id}/use`, { date }),
  comment: (id: string, body: string) => call<PostDetail>("POST", `/posts/${id}/comments`, { body }),
  deleteComment: (id: string, commentId: string) => call<PostDetail>("DELETE", `/posts/${id}/comments/${commentId}`),
  report: (id: string, reason: string) => call<{ ok: true }>("POST", `/posts/${id}/report`, { reason }),
  elf: (handle: string) => call<ElfProfile>("GET", `/users/${handle}`),
};
