import { eq } from "drizzle-orm";
import { route } from "@/lib/api";
import { requireUser } from "@/lib/auth";
import { getTaste } from "@/lib/data";
import { getDb, schema } from "@/lib/db";

export const runtime = "nodejs";

export const POST = route(async () => {
  const user = await requireUser();
  const db = await getDb();
  await db.delete(schema.tasteProfiles).where(eq(schema.tasteProfiles.userId, user.id));
  await db.delete(schema.tasteUpdates).where(eq(schema.tasteUpdates.userId, user.id));
  return getTaste(user.id);
});
