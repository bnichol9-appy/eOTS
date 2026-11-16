import { body, route } from "@/lib/api";
import { ApiError, requireSession } from "@/lib/auth";
import { getRoom } from "@/lib/data";
import { setSpotEnabled } from "@/lib/rooms";

export const runtime = "nodejs";

/** Tick or untick a hiding spot. Unsafe spots can't be enabled. */
export const PUT = route<{ id: string; spotId: string }>(async (req, { params }) => {
  const { family } = await requireSession();
  const room = await getRoom(family.id, params.id);
  if (!room) throw new ApiError(404, "No such area");
  const b = await body<{ enabled?: boolean }>(req);
  return setSpotEnabled(family.id, room.id, params.spotId, Boolean(b.enabled));
});
