import { and, eq } from "drizzle-orm";
import { body, route } from "@/lib/api";
import { ApiError, requireUser } from "@/lib/auth";
import { getRoom } from "@/lib/data";
import { getDb, schema } from "@/lib/db";
import { deletePhoto } from "@/lib/storage";

export const runtime = "nodejs";

export const PUT = route<{ id: string }>(async (req, { params }) => {
  const user = await requireUser();
  const room = await getRoom(user.id, params.id);
  if (!room) throw new ApiError(404, "No such area");
  const b = await body<{ name?: string; notes?: string }>(req);
  const db = await getDb();
  await db
    .update(schema.rooms)
    .set({
      name: b.name ? String(b.name).trim().slice(0, 60) : room.name,
      notes: b.notes !== undefined ? String(b.notes).slice(0, 500) : room.notes,
    })
    .where(eq(schema.rooms.id, room.id));
  return getRoom(user.id, room.id);
});

export const DELETE = route<{ id: string }>(async (_req, { params }) => {
  const user = await requireUser();
  const room = await getRoom(user.id, params.id);
  if (!room) throw new ApiError(404, "No such area");
  for (const p of room.photos) await deletePhoto(p.url);
  const db = await getDb();
  await db.delete(schema.rooms).where(and(eq(schema.rooms.id, room.id), eq(schema.rooms.userId, user.id)));
  return { ok: true };
});
