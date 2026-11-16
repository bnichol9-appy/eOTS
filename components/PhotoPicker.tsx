"use client";
import { Camera, Image as ImageIcon, X } from "lucide-react";
import { useRef, useState } from "react";
import { compressImage } from "@/lib/client/utils";
import { ICON_SM } from "./ui";

export function PhotoPicker({ photos, onChange, multiple = true, label = "Choose photos", cameraLabel = "Take a photo" }: { photos: string[]; onChange: (p: string[]) => void; multiple?: boolean; label?: string; cameraLabel?: string }) {
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
    <div className="stack">
      {photos.length > 0 && (
        <div className="thumbs">
          {photos.map((p, i) => (
            <div className="thumb" key={i}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={p} alt="" />
              <button type="button" className="thumb-x" onClick={() => onChange(photos.filter((_, j) => j !== i))} aria-label="Remove photo">
                <X size={16} strokeWidth={2} />
              </button>
            </div>
          ))}
        </div>
      )}
      <div className="row">
        <button type="button" className="btn grow" disabled={busy} onClick={() => cameraRef.current?.click()}>
          <Camera {...ICON_SM} /> {busy ? "Working…" : cameraLabel}
        </button>
        <button type="button" className="btn grow" disabled={busy} onClick={() => libraryRef.current?.click()}>
          <ImageIcon {...ICON_SM} /> {label}
        </button>
      </div>
      <input ref={cameraRef} type="file" accept="image/*" capture="environment" hidden onChange={(e) => void onFiles(e.target.files)} />
      <input ref={libraryRef} type="file" accept="image/*" multiple={multiple} hidden onChange={(e) => void onFiles(e.target.files)} />
    </div>
  );
}
