import { route } from "@/lib/api";
import { requireSession } from "@/lib/auth";
import { getCircle, leaveCircle } from "@/lib/circles";
import { listPosts } from "@/lib/data";

export const runtime = "nodejs";

export const GET = route<{ id: string }>(async (_req, { params }) => {
  const { user, family } = await requireSession();
  const circle = await getCircle(family.id, params.id);
  const posts = await listPosts({ viewerFamilyId: family.id, viewerUserId: user.id, circleId: circle.id, sort: "new", limit: 50 });
  return { circle, posts };
});

/** Leave the circle; the owner leaving deletes it. */
export const DELETE = route<{ id: string }>(async (_req, { params }) => {
  const { family } = await requireSession();
  await getCircle(family.id, params.id);
  await leaveCircle(family.id, params.id);
  return { ok: true };
});
