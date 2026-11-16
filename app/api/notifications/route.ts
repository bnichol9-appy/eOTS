import { route } from "@/lib/api";
import { requireSession } from "@/lib/auth";
import { listNotifications } from "@/lib/notify";

export const runtime = "nodejs";

export const GET = route(async () => {
  const { user } = await requireSession();
  return listNotifications(user.id);
});
