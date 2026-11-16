import fs from "node:fs/promises";
import path from "node:path";
import { newId } from "./id";

const LOCAL_DIR = path.resolve(".uploads");

export function stripDataUrl(b64: string) {
  return b64.replace(/^data:image\/\w+;base64,/, "");
}

const PRIVATE_PREFIX = "/api/uploads/blob/";

/** Vercel Blob is configured either with a read-write token or (newer stores) a store ID plus Vercel's OIDC token. */
export function blobConfigured() {
  return Boolean(process.env.BLOB_READ_WRITE_TOKEN || process.env.BLOB_STORE_ID);
}

let storeIsPrivate = false;

/** Store a JPEG (base64) and return a URL the browser can load. Vercel Blob in production, ./.uploads locally. */
export async function savePhoto(base64: string, folder: string): Promise<string> {
  const buffer = Buffer.from(stripDataUrl(base64), "base64");
  if (buffer.length < 100) throw new Error("Empty image");
  if (buffer.length > 6_000_000) throw new Error("Image too large");
  const name = `${folder}/${newId()}.jpg`;
  if (blobConfigured()) {
    const { put } = await import("@vercel/blob");
    const opts = { contentType: "image/jpeg", addRandomSuffix: true } as const;
    if (!storeIsPrivate) {
      try {
        return (await put(name, buffer, { ...opts, access: "public" })).url;
      } catch (err) {
        // A private store refuses public uploads; fall through and store privately instead.
        if (!/private|public|access/i.test(String((err as Error)?.message ?? err))) throw err;
        storeIsPrivate = true;
      }
    }
    const blob = await put(name, buffer, { ...opts, access: "private" });
    return PRIVATE_PREFIX + blob.pathname;
  }
  if (process.env.VERCEL) throw new Error("Vercel Blob is not connected. Add a Blob store to this project.");
  await fs.mkdir(path.join(LOCAL_DIR, folder), { recursive: true });
  await fs.writeFile(path.join(LOCAL_DIR, name), buffer);
  return `/api/uploads/${name}`;
}

/** Read a photo from a private Blob store (served through /api/uploads/blob/...). */
export async function readPrivateBlob(pathname: string) {
  const { get } = await import("@vercel/blob");
  const r = await get(pathname, { access: "private" });
  if (!r || r.statusCode !== 200) return null;
  return { stream: r.stream, contentType: r.blob.contentType || "image/jpeg" };
}

export async function deletePhoto(url: string) {
  try {
    if (url.startsWith(PRIVATE_PREFIX)) {
      const { del } = await import("@vercel/blob");
      await del(url.slice(PRIVATE_PREFIX.length));
    } else if (url.startsWith("/api/uploads/")) {
      await fs.unlink(path.join(LOCAL_DIR, url.slice("/api/uploads/".length)));
    } else if (blobConfigured()) {
      const { del } = await import("@vercel/blob");
      await del(url);
    }
  } catch {
    /* best effort */
  }
}

/** Fetch a stored photo back as base64 for the vision model. */
export async function loadPhotoBase64(url: string): Promise<string> {
  if (url.startsWith(PRIVATE_PREFIX)) {
    const blob = await readPrivateBlob(url.slice(PRIVATE_PREFIX.length));
    if (!blob) throw new Error("Photo not found");
    return Buffer.from(await new Response(blob.stream).arrayBuffer()).toString("base64");
  }
  if (url.startsWith("/api/uploads/")) {
    const buf = await fs.readFile(path.join(LOCAL_DIR, url.slice("/api/uploads/".length)));
    return buf.toString("base64");
  }
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Could not fetch photo (${res.status})`);
  return Buffer.from(await res.arrayBuffer()).toString("base64");
}

export function localUploadPath(parts: string[]) {
  const p = path.join(LOCAL_DIR, ...parts);
  if (!p.startsWith(LOCAL_DIR + path.sep)) throw new Error("bad path");
  return p;
}
