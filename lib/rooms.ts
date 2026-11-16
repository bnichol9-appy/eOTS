import { eq } from "drizzle-orm";
import { getDb, schema } from "./db";
import { analyseRoom } from "./claude";
import { getRoom } from "./data";
import { loadPhotoBase64 } from "./storage";
import type { Room } from "./types";

export async function runRoomAnalysis(userId: string, roomId: string): Promise<Room> {
  const room = await getRoom(userId, roomId);
  if (!room) throw new Error("No such area");
  if (room.photos.length === 0) return room;
  const photos = await Promise.all(room.photos.slice(-4).map((p) => loadPhotoBase64(p.url)));
  const inventory = await analyseRoom(room, photos);
  const db = await getDb();
  await db.update(schema.rooms).set({ inventory, analysedAt: new Date() }).where(eq(schema.rooms.id, roomId));
  return (await getRoom(userId, roomId))!;
}
