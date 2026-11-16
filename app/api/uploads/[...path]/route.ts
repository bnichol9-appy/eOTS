import fs from "node:fs/promises";
import { route } from "@/lib/api";
import { ApiError, getSessionUser } from "@/lib/auth";
import { localUploadPath, readPrivateBlob } from "@/lib/storage";

export const runtime = "nodejs";

/** Serves photos from a private Vercel Blob store, or locally stored photos in development. Signed-in users only. */
export const GET = route<{ path: string[] }>(async (_req, { params }) => {
  if (!(await getSessionUser())) throw new ApiError(401, "signed_out");
  if (params.path[0] === "blob") {
    const pathname = params.path.slice(1).join("/");
    if (!pathname || pathname.includes("..")) throw new ApiError(400, "Bad path");
    const blob = await readPrivateBlob(pathname);
    if (!blob) throw new ApiError(404, "Not found");
    return new Response(blob.stream, { headers: { "Content-Type": blob.contentType, "Cache-Control": "private, max-age=86400" } });
  }
  try {
    const buf = await fs.readFile(localUploadPath(params.path));
    return new Response(new Uint8Array(buf), { headers: { "Content-Type": "image/jpeg", "Cache-Control": "private, max-age=86400" } });
  } catch {
    throw new ApiError(404, "Not found");
  }
});
