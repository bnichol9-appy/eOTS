import { and, eq } from "drizzle-orm";
import { body, route } from "@/lib/api";
import { ApiError, requireSession } from "@/lib/auth";
import { getRoom } from "@/lib/data";
import { getDb, schema } from "@/lib/db";
import { deletePhoto } from "@/lib/storage";

export const runtime = "nodejs";

export const PUT = route<{ id: string }>(async (req, { params }) => {
  const { family } = await requireSession();
  const room = await getRoom(family.id, params.id);
  if (!room) throw new ApiError(404, "No such area");
  const b = await body<{ name?: string; notes?: string; isKidsRoom?: boolean; maxNights?: number | null }>(req);
  const db = await getDb();
  await db
    .update(schema.rooms)
    .set({
      name: b.name ? String(b.name).trim().slice(0, 60) : room.name,
      notes: b.notes !== undefined ? String(b.notes).slice(0, 500) : room.notes,
      isKidsRoom: typeof b.isKidsRoom === "boolean" ? b.isKidsRoom : room.isKidsRoom,
      maxNights: b.maxNights === undefined ? (typeof b.isKidsRoom === "boolean" ? (b.isKidsRoom ? room.maxNights ?? 2 : null) : room.maxNights) : b.maxNights === null ? null : Math.max(1, Number(b.maxNights) || 2),
    })
    .where(eq(schema.rooms.id, room.id));
  return getRoom(family.id, room.id);
});

export const DELETE = route<{ id: string }>(async (_req, { params }) => {
  const { family } = await requireSession();
  const room = await getRoom(family.id, params.id);
  if (!room) throw new ApiError(404, "No such area");
  for (const p of room.photos) await deletePhoto(p.url);
  const db = await getDb();
  await db.delete(schema.rooms).where(and(eq(schema.rooms.id, room.id), eq(schema.rooms.familyId, family.id)));
  return { ok: true };
});
