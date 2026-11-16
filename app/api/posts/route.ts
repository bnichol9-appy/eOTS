import { route } from "@/lib/api";
import { requireUser } from "@/lib/auth";
import { listPosts, type FeedSort } from "@/lib/data";

export const runtime = "nodejs";

export const GET = route(async (req) => {
  const user = await requireUser();
  const sp = req.nextUrl.searchParams;
  const sort = (["hot", "new", "top"].includes(sp.get("sort") ?? "") ? sp.get("sort") : "hot") as FeedSort;
  const tag = sp.get("tag")?.toLowerCase().slice(0, 30) || null;
  const roomType = sp.get("room")?.slice(0, 30) || null;
  const author = sp.get("author")?.slice(0, 30) || null;
  const offset = Math.max(0, Number(sp.get("offset")) || 0);
  const posts = await listPosts({ viewerId: user.id, sort, tag, roomType, authorHandle: author, limit: 30, offset });
  return { posts };
});
