import { route } from "@/lib/api";
import { requireSession } from "@/lib/auth";
import { listChallenges } from "@/lib/challenges";

export const runtime = "nodejs";

export const GET = route(async (req) => {
  await requireSession();
  const today = req.nextUrl.searchParams.get("today") ?? new Date().toISOString().slice(0, 10);
  return { challenges: await listChallenges(today) };
});
