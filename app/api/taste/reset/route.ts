import { eq } from "drizzle-orm";
import { route } from "@/lib/api";
import { requireSession } from "@/lib/auth";
import { getTaste } from "@/lib/data";
import { getDb, schema } from "@/lib/db";

export const runtime = "nodejs";

export const POST = route(async () => {
  const { family } = await requireSession();
  const db = await getDb();
  await db.delete(schema.tasteProfiles).where(eq(schema.tasteProfiles.familyId, family.id));
  await db.delete(schema.tasteUpdates).where(eq(schema.tasteUpdates.familyId, family.id));
  return getTaste(family.id);
});
