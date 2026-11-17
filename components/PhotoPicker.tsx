"use client";
import { Camera, Image as ImageIcon, Loader2, X } from "lucide-react";
import { useRef, useState } from "react";
import { compressImage } from "@/lib/client/utils";

const SM = { size: 20, strokeWidth: 1.8 };

/** Take or choose photos. Empty: a dashed tile with two big buttons. Filled: large previews you can remove, plus a way to add more. */
export function PhotoPicker({
  photos,
  onChange,
  multiple = true,
  label = "Choose photos",
  cameraLabel = "Take a photo",
}: {
  photos: string[];
  onChange: (p: string[]) => void;
  multiple?: boolean;
  label?: string;
  cameraLabel?: string;
}) {
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

  const inputs = (
    <>
      <input ref={cameraRef} type="file" accept="image/*" capture="environment" hidden onChange={(e) => void onFiles(e.target.files)} />
      <input ref={libraryRef} type="file" accept="image/*" multiple={multiple} hidden onChange={(e) => void onFiles(e.target.files)} />
    </>
  );

  if (photos.length === 0)
    return (
      <div className="picker-empty">
        {busy ? (
          <span className="picker-busy">
            <Loader2 {...SM} className="spin" aria-hidden="true" /> Getting your photo ready…
          </span>
        ) : (
          <>
            <button type="button" className="picker-btn" onClick={() => cameraRef.current?.click()}>
              <Camera {...SM} aria-hidden="true" />
              {cameraLabel}
            </button>
            <button type="button" className="picker-btn" onClick={() => libraryRef.current?.click()}>
              <ImageIcon {...SM} aria-hidden="true" />
              {label}
            </button>
          </>
        )}
        {inputs}
      </div>
    );

  return (
    <div className="picker-filled">
      <div className={`picker-grid ${photos.length === 1 ? "one" : ""}`}>
        {photos.map((p, i) => (
          <div className="picker-photo" key={i}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={p} alt={`Photo ${i + 1}`} />
            <button type="button" className="picker-x" onClick={() => onChange(photos.filter((_, j) => j !== i))} aria-label="Remove photo">
              <X size={16} strokeWidth={2} />
            </button>
          </div>
        ))}
      </div>
      <button type="button" className="link-btn small picker-more" disabled={busy} onClick={() => (multiple ? libraryRef : cameraRef).current?.click()}>
        {busy ? "Getting it ready…" : multiple && photos.length < 6 ? "Add another photo" : "Use a different photo"}
      </button>
      {inputs}
    </div>
  );
}
