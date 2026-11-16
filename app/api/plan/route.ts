import { body, route, bad, DATE_RE } from "@/lib/api";
import { requireSession } from "@/lib/auth";
import { planNight } from "@/lib/days";
import { shiftDate } from "@/lib/kit";
import type { Day } from "@/lib/types";

export const runtime = "nodejs";
export const maxDuration = 300;

/** "Plan the week": lock in one idea for each of the next N nights that has no plan yet. */
export const POST = route(async (req) => {
  const session = await requireSession();
  const b = await body<{ from?: string; nights?: number; dates?: string[] }>(req);
  const from = String(b.from ?? new Date().toISOString().slice(0, 10));
  if (!DATE_RE.test(from)) bad("Bad date");
  const dates = Array.isArray(b.dates) && b.dates.length ? b.dates.filter((d) => DATE_RE.test(String(d))).slice(0, 7) : Array.from({ length: Math.min(7, Math.max(1, Number(b.nights) || 4)) }, (_, i) => shiftDate(from, i));
  const planned: Day[] = [];
  for (const date of dates) planned.push(await planNight(session, date));
  return { days: planned };
});
