import fs from "node:fs/promises";
import path from "node:path";
import { newId } from "./id";

const LOCAL_DIR = path.resolve(".uploads");

export function stripDataUrl(b64: string) {
  return b64.replace(/^data:image\/\w+;base64,/, "");
}

/** Store a JPEG (base64) and return a URL the browser can load. Vercel Blob in production, ./.uploads locally. */
export async function savePhoto(base64: string, folder: string): Promise<string> {
  const buffer = Buffer.from(stripDataUrl(base64), "base64");
  if (buffer.length < 100) throw new Error("Empty image");
  if (buffer.length > 6_000_000) throw new Error("Image too large");
  const name = `${folder}/${newId()}.jpg`;
  if (process.env.BLOB_READ_WRITE_TOKEN) {
    const { put } = await import("@vercel/blob");
    const blob = await put(name, buffer, { access: "public", contentType: "image/jpeg", addRandomSuffix: true });
    return blob.url;
  }
  if (process.env.VERCEL) throw new Error("BLOB_READ_WRITE_TOKEN is not set. Add the Vercel Blob integration to this project.");
  await fs.mkdir(path.join(LOCAL_DIR, folder), { recursive: true });
  await fs.writeFile(path.join(LOCAL_DIR, name), buffer);
  return `/api/uploads/${name}`;
}

export async function deletePhoto(url: string) {
  try {
    if (url.startsWith("/api/uploads/")) {
      await fs.unlink(path.join(LOCAL_DIR, url.slice("/api/uploads/".length)));
    } else if (process.env.BLOB_READ_WRITE_TOKEN) {
      const { del } = await import("@vercel/blob");
      await del(url);
    }
  } catch {
    /* best effort */
  }
}

/** Fetch a stored photo back as base64 for the vision model. */
export async function loadPhotoBase64(url: string): Promise<string> {
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
