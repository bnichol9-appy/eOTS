import { eq } from "drizzle-orm";
import { getDb, schema } from "./db";
import { analyseRoom } from "./claude";
import { getRoom } from "./data";
import { newId } from "./id";
import { loadPhotoBase64 } from "./storage";
import type { Room, Spot } from "./types";

/** Re-scan a room. Keeps the parent's enabled/disabled choices for spots with the same label. */
export async function runRoomAnalysis(familyId: string, roomId: string): Promise<Room> {
  const room = await getRoom(familyId, roomId);
  if (!room) throw new Error("No such area");
  if (room.photos.length === 0) return room;
  const photos = await Promise.all(room.photos.slice(-4).map((p) => loadPhotoBase64(p.url)));
  const out = await analyseRoom(room, photos);
  const previous = new Map((room.inventory?.spots ?? []).map((s) => [s.label.toLowerCase(), s]));
  const spots: Spot[] = out.spots.map((s) => {
    const old = previous.get(s.label.toLowerCase());
    return { ...s, id: old?.id ?? newId(), enabled: s.unsafe ? false : (old?.enabled ?? true) };
  });
  const db = await getDb();
  await db.update(schema.rooms).set({ inventory: { ...out, spots }, analysedAt: new Date() }).where(eq(schema.rooms.id, roomId));
  return (await getRoom(familyId, roomId))!;
}

export async function setSpotEnabled(familyId: string, roomId: string, spotId: string, enabled: boolean): Promise<Room> {
  const room = await getRoom(familyId, roomId);
  if (!room?.inventory) throw new Error("No such area");
  const spots = room.inventory.spots.map((s) => (s.id === spotId && !s.unsafe ? { ...s, enabled } : s));
  const db = await getDb();
  await db.update(schema.rooms).set({ inventory: { ...room.inventory, spots } }).where(eq(schema.rooms.id, roomId));
  return (await getRoom(familyId, roomId))!;
}
