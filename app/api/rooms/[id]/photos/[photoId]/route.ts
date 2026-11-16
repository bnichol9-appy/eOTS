import { eq } from "drizzle-orm";
import { route } from "@/lib/api";
import { ApiError, requireSession } from "@/lib/auth";
import { getRoom } from "@/lib/data";
import { getDb, schema } from "@/lib/db";
import { deletePhoto } from "@/lib/storage";

export const runtime = "nodejs";

export const DELETE = route<{ id: string; photoId: string }>(async (_req, { params }) => {
  const { family } = await requireSession();
  const room = await getRoom(family.id, params.id);
  if (!room) throw new ApiError(404, "No such area");
  const photo = room.photos.find((p) => p.id === params.photoId);
  if (!photo) throw new ApiError(404, "No such photo");
  await deletePhoto(photo.url);
  const db = await getDb();
  await db.delete(schema.roomPhotos).where(eq(schema.roomPhotos.id, photo.id));
  return getRoom(family.id, room.id);
});
