"use client";
import { createContext, useContext } from "react";
import type { Bootstrap } from "@/lib/client/api";
import type { Day, Idea, Profile, PublicUser, Room, Taste, UserSettings, Circle } from "@/lib/types";

export interface AppActions {
  setProfile: (p: Profile) => void;
  setUser: (u: PublicUser) => void;
  setRooms: (fn: (rooms: Room[]) => Room[]) => void;
  setTaste: (t: Taste) => void;
  setDay: (d: Day) => void;
  setFavourites: (fn: (f: Idea[]) => Idea[]) => void;
  setSettings: (s: UserSettings) => void;
  setCircles: (fn: (c: Circle[]) => Circle[]) => void;
  setUnread: (n: number) => void;
  toast: (message: string) => void;
  reload: () => Promise<void>;
  lock: () => void;
}

export const AppContext = createContext<{ data: Bootstrap; actions: AppActions } | null>(null);

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error("useApp outside AppShell");
  return ctx;
}
