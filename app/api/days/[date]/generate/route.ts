import { body, route, bad, DATE_RE } from "@/lib/api";
import { requireUser } from "@/lib/auth";
import { generateDay, seasonInfo } from "@/lib/days";

export const runtime = "nodejs";
export const maxDuration = 300;

export const POST = route<{ date: string }>(async (req, { params }) => {
  const user = await requireUser();
  if (!DATE_RE.test(params.date)) bad("Bad date");
  const b = await body<{ direction?: string; focusRoomId?: string | null }>(req);
  const day = await generateDay(user, params.date, String(b.direction ?? "").slice(0, 300), b.focusRoomId ? String(b.focusRoomId) : null);
  return { day, ...seasonInfo(user, params.date) };
});
