import { route, bad, DATE_RE } from "@/lib/api";
import { ApiError, requireSession } from "@/lib/auth";
import { getOrCreateDay } from "@/lib/data";
import { attachPostToDay } from "@/lib/days";

export const runtime = "nodejs";

/** Make tonight's community pick the plan. */
export const POST = route<{ date: string }>(async (_req, { params }) => {
  const { family } = await requireSession();
  if (!DATE_RE.test(params.date)) bad("Bad date");
  const row = await getOrCreateDay(family.id, params.date);
  if (!row.communityPickPostId) throw new ApiError(404, "No community pick tonight");
  return { day: await attachPostToDay(family.id, params.date, row.communityPickPostId, 3) };
});
