import { route, bad, DATE_RE } from "@/lib/api";
import { requireUser } from "@/lib/auth";
import { loadDay } from "@/lib/data";
import { seasonInfo } from "@/lib/days";

export const runtime = "nodejs";

export const GET = route<{ date: string }>(async (_req, { params }) => {
  const user = await requireUser();
  if (!DATE_RE.test(params.date)) bad("Bad date");
  return { day: await loadDay(user.id, params.date), ...seasonInfo(user, params.date) };
});
