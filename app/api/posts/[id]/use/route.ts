import { body, route, bad, DATE_RE } from "@/lib/api";
import { requireUser } from "@/lib/auth";
import { attachPostToDay } from "@/lib/days";

export const runtime = "nodejs";

/** "Do this tonight": copies the post into the given night as the plan. */
export const POST = route<{ id: string }>(async (req, { params }) => {
  const user = await requireUser();
  const b = await body<{ date?: string }>(req);
  const date = String(b.date ?? "");
  if (!DATE_RE.test(date)) bad("Bad date");
  return { day: await attachPostToDay(user, date, params.id, 4) };
});
