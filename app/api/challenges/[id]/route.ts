import { route } from "@/lib/api";
import { ApiError, requireSession } from "@/lib/auth";
import { listChallenges } from "@/lib/challenges";
import { listPosts } from "@/lib/data";

export const runtime = "nodejs";

export const GET = route<{ id: string }>(async (req, { params }) => {
  const { user, family } = await requireSession();
  const today = req.nextUrl.searchParams.get("today") ?? new Date().toISOString().slice(0, 10);
  const challenge = (await listChallenges(today)).find((c) => c.id === params.id);
  if (!challenge) throw new ApiError(404, "No such challenge");
  const entries = await listPosts({ viewerFamilyId: family.id, viewerUserId: user.id, challengeId: challenge.id, sort: "top", limit: 50 });
  return { challenge, entries };
});
