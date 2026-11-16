import { route } from "@/lib/api";
import { clearUnlockCookie } from "@/lib/auth";

export const runtime = "nodejs";

export const POST = route(async () => {
  await clearUnlockCookie();
  return { ok: true };
});
