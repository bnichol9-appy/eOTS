"use client";
import { useRef, useState } from "react";
import { compressImage } from "@/lib/client/utils";

export function PhotoPicker({ photos, onChange, multiple = true, label = "Add photos" }: { photos: string[]; onChange: (p: string[]) => void; multiple?: boolean; label?: string }) {
  const cameraRef = useRef<HTMLInputElement>(null);
  const libraryRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);

  async function onFiles(list: FileList | null) {
    if (!list || list.length === 0) return;
    setBusy(true);
    try {
      const out: string[] = [];
      for (const f of Array.from(list).slice(0, 6)) out.push(await compressImage(f));
      onChange(multiple ? [...photos, ...out].slice(0, 6) : out.slice(0, 1));
    } finally {
      setBusy(false);
      if (cameraRef.current) cameraRef.current.value = "";
      if (libraryRef.current) libraryRef.current.value = "";
    }
  }

  return (
    <div className="photo-picker">
      {photos.length > 0 && (
        <div className="thumbs">
          {photos.map((p, i) => (
            <div className="thumb" key={i}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={p} alt="" />
              <button type="button" className="thumb-x" onClick={() => onChange(photos.filter((_, j) => j !== i))} aria-label="Remove">
                ✕
              </button>
            </div>
          ))}
        </div>
      )}
      <div className="row">
        <button type="button" className="btn ghost" disabled={busy} onClick={() => cameraRef.current?.click()}>
          📷 {busy ? "Working…" : "Camera"}
        </button>
        <button type="button" className="btn ghost" disabled={busy} onClick={() => libraryRef.current?.click()}>
          🖼 {label}
        </button>
      </div>
      <input ref={cameraRef} type="file" accept="image/*" capture="environment" hidden onChange={(e) => void onFiles(e.target.files)} />
      <input ref={libraryRef} type="file" accept="image/*" multiple={multiple} hidden onChange={(e) => void onFiles(e.target.files)} />
    </div>
  );
}
