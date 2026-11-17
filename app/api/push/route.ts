import { and, eq } from "drizzle-orm";
import { body, route, bad } from "@/lib/api";
import { requireSession } from "@/lib/auth";
import { getDb, schema } from "@/lib/db";
import { newId } from "@/lib/id";
import { notifyUsers, pushConfigured } from "@/lib/notify";
import { notices } from "@/lib/notices";

export const runtime = "nodejs";

export const GET = route(async () => {
  await requireSession();
  return { available: pushConfigured(), publicKey: process.env.VAPID_PUBLIC_KEY ?? null };
});

/** Save a browser push subscription and send a hello so the user sees it working. */
export const POST = route(async (req) => {
  const { user } = await requireSession();
  if (!pushConfigured()) bad("Push isn't configured on the server");
  const b = await body<{ endpoint?: string; keys?: { p256dh?: string; auth?: string } }>(req);
  if (!b.endpoint || !b.keys?.p256dh || !b.keys?.auth) bad("Bad subscription");
  const db = await getDb();
  await db
    .insert(schema.pushSubscriptions)
    .values({ id: newId(), userId: user.id, endpoint: b.endpoint, keys: { p256dh: b.keys.p256dh, auth: b.keys.auth } })
    .onConflictDoUpdate({ target: schema.pushSubscriptions.endpoint, set: { userId: user.id, keys: { p256dh: b.keys.p256dh, auth: b.keys.auth } } });
  await notifyUsers([user.id], notices.hello(), { pushOnly: true });
  return { ok: true };
});

export const DELETE = route(async (req) => {
  const { user } = await requireSession();
  const b = await body<{ endpoint?: string }>(req);
  const db = await getDb();
  if (b.endpoint) await db.delete(schema.pushSubscriptions).where(and(eq(schema.pushSubscriptions.userId, user.id), eq(schema.pushSubscriptions.endpoint, b.endpoint)));
  else await db.delete(schema.pushSubscriptions).where(eq(schema.pushSubscriptions.userId, user.id));
  return { ok: true };
});
