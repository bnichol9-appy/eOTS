import { route, bad, DATE_RE } from "@/lib/api";
import { ApiError, requireUser } from "@/lib/auth";
import { getOrCreateDay } from "@/lib/data";
import { attachPostToDay } from "@/lib/days";

export const runtime = "nodejs";

/** Make tonight's community pick the plan. */
export const POST = route<{ date: string }>(async (_req, { params }) => {
  const user = await requireUser();
  if (!DATE_RE.test(params.date)) bad("Bad date");
  const row = await getOrCreateDay(user.id, params.date);
  if (!row.communityPickPostId) throw new ApiError(404, "No community pick tonight");
  return { day: await attachPostToDay(user, params.date, row.communityPickPostId, 3) };
});
