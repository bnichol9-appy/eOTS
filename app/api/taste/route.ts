import { body, route } from "@/lib/api";
import { requireUser } from "@/lib/auth";
import { getTaste, saveTaste } from "@/lib/data";

export const runtime = "nodejs";

export const PUT = route(async (req) => {
  const user = await requireUser();
  const b = await body<{ profile?: string }>(req);
  await saveTaste(user.id, String(b.profile ?? "").slice(0, 4000));
  return getTaste(user.id);
});
