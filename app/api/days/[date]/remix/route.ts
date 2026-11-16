import { body, route, bad, DATE_RE } from "@/lib/api";
import { requireUser } from "@/lib/auth";
import { remixIdea, seasonInfo } from "@/lib/days";

export const runtime = "nodejs";
export const maxDuration = 300;

export const POST = route<{ date: string }>(async (req, { params }) => {
  const user = await requireUser();
  if (!DATE_RE.test(params.date)) bad("Bad date");
  const b = await body<{ ideaId?: string; direction?: string }>(req);
  const day = await remixIdea(user, params.date, String(b.ideaId ?? ""), String(b.direction ?? "").slice(0, 300));
  return { day, ...seasonInfo(user, params.date) };
});
