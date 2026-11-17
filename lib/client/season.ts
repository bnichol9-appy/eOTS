import type { Day, Profile } from "../types";
import { shiftDate } from "./utils";

export type Phase = "pre" | "in" | "post";

export interface Season {
  phase: Phase;
  start: string; // YYYY-MM-DD, this year's arrival night
  end: string; // YYYY-MM-DD, this year's farewell night
  length: number;
  daysUntil: number; // nights until arrival (pre-season only, else 0)
  nightNumber: number | null; // 1..length while in season
}

const DAY = 86_400_000;
const diff = (a: string, b: string) => Math.round((Date.parse(`${b}T00:00:00Z`) - Date.parse(`${a}T00:00:00Z`)) / DAY);

/** Where today sits in this year's elf season (dates from the family profile, default 1 to 24 December). */
export function seasonFor(profile: Profile, today: string): Season {
  const year = today.slice(0, 4);
  const start = `${year}-${profile.seasonStart || "12-01"}`;
  const end = `${year}-${profile.seasonEnd || "12-24"}`;
  const length = Math.max(1, diff(start, end) + 1);
  if (today < start) return { phase: "pre", start, end, length, daysUntil: diff(today, start), nightNumber: null };
  if (today > end) return { phase: "post", start, end, length, daysUntil: 0, nightNumber: null };
  return { phase: "in", start, end, length, daysUntil: 0, nightNumber: diff(start, today) + 1 };
}

export function nightNumber(season: Season, date: string): number | null {
  const n = diff(season.start, date) + 1;
  return n >= 1 && n <= season.length ? n : null;
}

export function range(from: string, count: number): string[] {
  return Array.from({ length: count }, (_, i) => shiftDate(from, i));
}

/** Logged nights with a photo, newest first. */
export function photoNights(days: Day[], from?: string, to?: string): Day[] {
  return days.filter((d) => d.status === "done" && d.result?.photoUrl && (!from || d.date >= from) && (!to || d.date <= to)).sort((a, b) => b.date.localeCompare(a.date));
}

export function chosenIdea(day: Day | undefined) {
  return day?.ideas.find((i) => i.id === day.chosenIdeaId) ?? null;
}
