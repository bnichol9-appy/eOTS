import { route, bad, DATE_RE } from "@/lib/api";
import { requireSession } from "@/lib/auth";
import { loadDay } from "@/lib/data";
import { seasonInfo } from "@/lib/days";

export const runtime = "nodejs";

export const GET = route<{ date: string }>(async (_req, { params }) => {
  const { family } = await requireSession();
  if (!DATE_RE.test(params.date)) bad("Bad date");
  return { day: await loadDay(family.id, params.date), ...seasonInfo(family.profile, params.date) };
});
