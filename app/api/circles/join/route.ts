import { body, route, bad } from "@/lib/api";
import { requireSession } from "@/lib/auth";
import { joinCircle } from "@/lib/circles";

export const runtime = "nodejs";

export const POST = route(async (req) => {
  const { user, family } = await requireSession();
  const b = await body<{ code?: string }>(req);
  const code = String(b.code ?? "").trim();
  if (!code) bad("Enter an invite code");
  return joinCircle(family.id, code, `${user.displayName} (${family.profile.elfName || "their elf"})`);
});
