import { body, route } from "@/lib/api";
import { requireSession } from "@/lib/auth";
import { getTaste, saveTaste } from "@/lib/data";

export const runtime = "nodejs";

export const PUT = route(async (req) => {
  const { family } = await requireSession();
  const b = await body<{ profile?: string }>(req);
  await saveTaste(family.id, String(b.profile ?? "").slice(0, 4000));
  return getTaste(family.id);
});
