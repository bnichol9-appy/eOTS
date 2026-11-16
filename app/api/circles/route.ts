import { body, route, bad } from "@/lib/api";
import { requireSession } from "@/lib/auth";
import { createCircle, listCircles } from "@/lib/circles";
import { refreshBadges } from "@/lib/data";

export const runtime = "nodejs";

export const GET = route(async () => {
  const { family } = await requireSession();
  return { circles: await listCircles(family.id) };
});

export const POST = route(async (req) => {
  const { family } = await requireSession();
  const b = await body<{ name?: string }>(req);
  const name = String(b.name ?? "").trim().slice(0, 40);
  if (!name) bad("Give the circle a name");
  const circle = await createCircle(family.id, name);
  await refreshBadges(family.id);
  return circle;
});
