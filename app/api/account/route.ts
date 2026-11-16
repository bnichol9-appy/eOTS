import { eq, inArray } from "drizzle-orm";
import { body, route } from "@/lib/api";
import { ApiError, checkThrottle, clearAllCookies, recordAttempt, requireSession, verifySecret } from "@/lib/auth";
import { getDb, schema } from "@/lib/db";
import { deletePhoto } from "@/lib/storage";

export const runtime = "nodejs";
export const maxDuration = 60;

/**
 * Delete the signed-in parent's account. Needs their password.
 * Last parent in the family: the whole family goes (rooms, nights, posts, circles...) along with every stored photo.
 * Co-parent still there: only this parent goes (their posts, votes, comments, notifications, push subscriptions);
 * the shared family data stays with the other parent.
 */
export const DELETE = route(async (req) => {
  const { user, family } = await requireSession();
  const b = await body<{ password?: string }>(req);
  await checkThrottle(user);
  const ok = verifySecret(String(b.password ?? ""), user.passwordHash);
  await recordAttempt(user, ok);
  if (!ok) throw new ApiError(401, "Wrong password");

  const db = await getDb();
  const members = await db.select({ id: schema.users.id }).from(schema.users).where(eq(schema.users.familyId, family.id));

  if (members.length > 1) {
    await db.delete(schema.users).where(eq(schema.users.id, user.id));
    await clearAllCookies();
    return { ok: true, familyKept: true };
  }

  // Collect every stored photo before the rows that point at them are gone.
  const urls = new Set<string>();
  const rooms = await db.select({ id: schema.rooms.id }).from(schema.rooms).where(eq(schema.rooms.familyId, family.id));
  if (rooms.length) {
    const photos = await db.select({ url: schema.roomPhotos.url }).from(schema.roomPhotos).where(inArray(schema.roomPhotos.roomId, rooms.map((r) => r.id)));
    for (const p of photos) urls.add(p.url);
  }
  const days = await db.select({ result: schema.days.result }).from(schema.days).where(eq(schema.days.familyId, family.id));
  for (const d of days) if (d.result?.photoUrl) urls.add(d.result.photoUrl);
  const posts = await db.select({ url: schema.posts.photoUrl }).from(schema.posts).where(eq(schema.posts.familyId, family.id));
  for (const p of posts) if (p.url) urls.add(p.url);

  await db.delete(schema.families).where(eq(schema.families.id, family.id)); // cascades to users and all family data
  await clearAllCookies();
  await Promise.all([...urls].map((u) => deletePhoto(u)));
  return { ok: true, familyKept: false };
});
