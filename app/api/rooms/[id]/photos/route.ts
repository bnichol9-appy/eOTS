import { body, route, bad } from "@/lib/api";
import { ApiError, requireUser } from "@/lib/auth";
import { getRoom } from "@/lib/data";
import { getDb, schema } from "@/lib/db";
import { newId } from "@/lib/id";
import { runRoomAnalysis } from "@/lib/rooms";
import { savePhoto } from "@/lib/storage";

export const runtime = "nodejs";
export const maxDuration = 300;

export const POST = route<{ id: string }>(async (req, { params }) => {
  const user = await requireUser();
  const room = await getRoom(user.id, params.id);
  if (!room) throw new ApiError(404, "No such area");
  const b = await body<{ photos?: string[] }>(req);
  const photos = Array.isArray(b.photos) ? b.photos.slice(0, 6) : [];
  if (photos.length === 0) bad("No photos");
  const db = await getDb();
  for (const p of photos) {
    const url = await savePhoto(p, `rooms/${user.id}`);
    await db.insert(schema.roomPhotos).values({ id: newId(), roomId: room.id, url });
  }
  return runRoomAnalysis(user.id, room.id);
});
