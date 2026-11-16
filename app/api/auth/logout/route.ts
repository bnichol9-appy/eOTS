import { route } from "@/lib/api";
import { clearAllCookies } from "@/lib/auth";

export const runtime = "nodejs";

export const POST = route(async () => {
  await clearAllCookies();
  return { ok: true };
});
