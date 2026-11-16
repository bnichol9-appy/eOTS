import { body, route, bad, DATE_RE } from "@/lib/api";
import { requireSession } from "@/lib/auth";
import { attachPostToDay } from "@/lib/days";

export const runtime = "nodejs";

export const POST = route<{ id: string }>(async (req, { params }) => {
  const { family } = await requireSession();
  const b = await body<{ date?: string }>(req);
  const date = String(b.date ?? "");
  if (!DATE_RE.test(date)) bad("Bad date");
  return { day: await attachPostToDay(family.id, date, params.id, 4) };
});
