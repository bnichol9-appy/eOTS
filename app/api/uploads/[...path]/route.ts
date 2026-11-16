import fs from "node:fs/promises";
import { route } from "@/lib/api";
import { ApiError, getSessionUser } from "@/lib/auth";
import { localUploadPath } from "@/lib/storage";

export const runtime = "nodejs";

/** Serves locally stored photos in development (Vercel Blob is used in production). */
export const GET = route<{ path: string[] }>(async (_req, { params }) => {
  if (!(await getSessionUser())) throw new ApiError(401, "signed_out");
  try {
    const buf = await fs.readFile(localUploadPath(params.path));
    return new Response(new Uint8Array(buf), { headers: { "Content-Type": "image/jpeg", "Cache-Control": "private, max-age=86400" } });
  } catch {
    throw new ApiError(404, "Not found");
  }
});
