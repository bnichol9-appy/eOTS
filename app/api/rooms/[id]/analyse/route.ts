import { route } from "@/lib/api";
import { ApiError, requireSession } from "@/lib/auth";
import { getRoom } from "@/lib/data";
import { runRoomAnalysis } from "@/lib/rooms";

export const runtime = "nodejs";
export const maxDuration = 300;

export const POST = route<{ id: string }>(async (_req, { params }) => {
  const { family } = await requireSession();
  const room = await getRoom(family.id, params.id);
  if (!room) throw new ApiError(404, "No such area");
  return runRoomAnalysis(family.id, room.id);
});
