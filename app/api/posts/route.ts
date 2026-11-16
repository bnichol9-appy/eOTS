import { route } from "@/lib/api";
import { requireSession } from "@/lib/auth";
import { listPosts, type FeedSort } from "@/lib/data";

export const runtime = "nodejs";

export const GET = route(async (req) => {
  const { user, family } = await requireSession();
  const sp = req.nextUrl.searchParams;
  const sort = (["hot", "new", "top"].includes(sp.get("sort") ?? "") ? sp.get("sort") : "hot") as FeedSort;
  const posts = await listPosts({
    viewerFamilyId: family.id,
    viewerUserId: user.id,
    sort,
    tag: sp.get("tag")?.toLowerCase().slice(0, 30) || null,
    roomType: sp.get("room")?.slice(0, 30) || null,
    authorHandle: sp.get("author")?.slice(0, 30) || null,
    circleId: sp.get("circle")?.slice(0, 30) || null,
    challengeId: sp.get("challenge")?.slice(0, 60) || null,
    limit: 30,
    offset: Math.max(0, Number(sp.get("offset")) || 0),
  });
  return { posts };
});
