import { route, bad, DATE_RE } from "@/lib/api";
import { requireSession } from "@/lib/auth";
import { listDays } from "@/lib/data";
import { buildKitBag, shiftDate } from "@/lib/kit";

export const runtime = "nodejs";

/** The kit bag for the next four nights from `from` (default today). */
export const GET = route(async (req) => {
  const { family } = await requireSession();
  const from = req.nextUrl.searchParams.get("from") ?? new Date().toISOString().slice(0, 10);
  if (!DATE_RE.test(from)) bad("Bad date");
  const nights = Math.min(14, Math.max(1, Number(req.nextUrl.searchParams.get("nights")) || 4));
  const days = await listDays(family.id);
  return buildKitBag(days, from, shiftDate(from, nights - 1));
});
