import { and, desc, eq, inArray, isNull, sql } from "drizzle-orm";
import { getDb, schema } from "./db";
import { newId } from "./id";
import type { Notification } from "./types";

const { notifications, pushSubscriptions, users } = schema;

export const pushConfigured = () => Boolean(process.env.VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY);

export interface Notice {
  type: string;
  title: string;
  body: string;
  url?: string;
}

/** Store an in-app notification for each user and push it to their devices. */
export async function notifyUsers(userIds: string[], notice: Notice, opts: { pushOnly?: boolean } = {}) {
  const ids = [...new Set(userIds)];
  if (ids.length === 0) return;
  const db = await getDb();
  if (!opts.pushOnly) {
    await db.insert(notifications).values(ids.map((userId) => ({ id: newId(), userId, type: notice.type, title: notice.title, body: notice.body, url: notice.url ?? "/" })));
  }
  await sendPush(ids, notice);
}

/** Notify every parent in a family, optionally skipping the person who caused it. */
export async function notifyFamily(familyId: string, notice: Notice, exceptUserId?: string) {
  const db = await getDb();
  const rows = await db.select({ id: users.id }).from(users).where(eq(users.familyId, familyId));
  await notifyUsers(rows.map((r) => r.id).filter((id) => id !== exceptUserId), notice);
}

async function sendPush(userIds: string[], notice: Notice) {
  if (!pushConfigured()) return;
  const db = await getDb();
  const subs = await db.select().from(pushSubscriptions).where(inArray(pushSubscriptions.userId, userIds));
  if (subs.length === 0) return;
  const webpush = (await import("web-push")).default;
  webpush.setVapidDetails(process.env.VAPID_SUBJECT ?? "mailto:hello@example.com", process.env.VAPID_PUBLIC_KEY!, process.env.VAPID_PRIVATE_KEY!);
  const payload = JSON.stringify({ title: notice.title, body: notice.body, url: notice.url ?? "/", tag: notice.type });
  await Promise.all(
    subs.map(async (s) => {
      try {
        await webpush.sendNotification({ endpoint: s.endpoint, keys: s.keys }, payload, { TTL: 6 * 3600 });
      } catch (err) {
        const status = (err as { statusCode?: number }).statusCode;
        if (status === 404 || status === 410) await db.delete(pushSubscriptions).where(eq(pushSubscriptions.id, s.id));
        else console.error("push failed", status);
      }
    }),
  );
}

export async function listNotifications(userId: string): Promise<{ items: Notification[]; unread: number }> {
  const db = await getDb();
  const rows = await db.select().from(notifications).where(eq(notifications.userId, userId)).orderBy(desc(notifications.createdAt)).limit(60);
  const [{ n }] = await db.select({ n: sql<number>`count(*)::int` }).from(notifications).where(and(eq(notifications.userId, userId), isNull(notifications.readAt)));
  return {
    items: rows.map((r) => ({ id: r.id, type: r.type, title: r.title, body: r.body, url: r.url, readAt: r.readAt?.toISOString() ?? null, createdAt: r.createdAt.toISOString() })),
    unread: n,
  };
}

export async function markAllRead(userId: string) {
  const db = await getDb();
  await db.update(notifications).set({ readAt: new Date() }).where(and(eq(notifications.userId, userId), isNull(notifications.readAt)));
}

export async function unreadCount(userId: string) {
  const db = await getDb();
  const [{ n }] = await db.select({ n: sql<number>`count(*)::int` }).from(notifications).where(and(eq(notifications.userId, userId), isNull(notifications.readAt)));
  return n;
}

export const UPVOTE_MILESTONES = [1, 5, 10, 25, 50, 100, 250];
