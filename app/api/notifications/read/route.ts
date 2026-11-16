import { route } from "@/lib/api";
import { requireSession } from "@/lib/auth";
import { markAllRead } from "@/lib/notify";

export const runtime = "nodejs";

export const POST = route(async () => {
  const { user } = await requireSession();
  await markAllRead(user.id);
  return { ok: true };
});
