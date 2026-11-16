import { body, route, bad } from "@/lib/api";
import { requireUser } from "@/lib/auth";
import { getDb, schema } from "@/lib/db";
import { newId } from "@/lib/id";
import { runRoomAnalysis } from "@/lib/rooms";
import { savePhoto } from "@/lib/storage";

export const runtime = "nodejs";
export const maxDuration = 300;

export const POST = route(async (req) => {
  const user = await requireUser();
  const b = await body<{ name?: string; notes?: string; photos?: string[] }>(req);
  const name = String(b.name ?? "").trim().slice(0, 60);
  if (!name) bad("Give the area a name");
  const photos = Array.isArray(b.photos) ? b.photos.slice(0, 6) : [];
  const db = await getDb();
  const id = newId();
  await db.insert(schema.rooms).values({ id, userId: user.id, name, notes: String(b.notes ?? "").slice(0, 500) });
  for (const p of photos) {
    const url = await savePhoto(p, `rooms/${user.id}`);
    await db.insert(schema.roomPhotos).values({ id: newId(), roomId: id, url });
  }
  return runRoomAnalysis(user.id, id);
});
