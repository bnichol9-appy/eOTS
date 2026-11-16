"use client";
import { Ban, X } from "lucide-react";
import type { Room, Spot } from "@/lib/types";
import { Checkbox } from "./ui";

/** Photo with numbered pins plus the spot checklist. Unsafe spots are blocked and can't be ticked. */
export function RoomEditor({ room, photo, onToggle, busy }: { room: Pick<Room, "name"> & { inventory: Room["inventory"] }; photo: string | null; onToggle?: (spot: Spot, enabled: boolean) => void; busy?: boolean }) {
  const spots = room.inventory?.spots ?? [];
  const usable = spots.filter((s) => !s.unsafe);
  const unsafe = spots.filter((s) => s.unsafe);
  const fits = (s: Spot) => (s.fitsElves >= 2 ? "Fits both" : "One elf");
  return (
    <>
      <div className={`photo tall ${photo ? "" : "ph"}`}>
        {photo ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={photo} alt={`Your ${room.name.toLowerCase()} photo`} />
        ) : (
          <span className="caption">[Your {room.name.toLowerCase()} photo]</span>
        )}
        {spots.length > 0 && <span className="corner">{spots.length} spots found</span>}
        {usable.map((s, i) => (
          <span key={s.id} className={`pin num ${s.enabled ? "" : "off"}`} style={{ left: `${s.x * 100}%`, top: `${s.y * 100}%` }} aria-hidden="true">
            {i + 1}
          </span>
        ))}
        {unsafe.map((s) => (
          <span key={s.id} className="pin unsafe" style={{ left: `${s.x * 100}%`, top: `${s.y * 100}%` }} aria-hidden="true">
            <X size={16} strokeWidth={2.2} />
          </span>
        ))}
      </div>
      {spots.length > 0 && (
        <>
          <div className="eyebrow">Spots the elves can use</div>
          <div className="list">
            {usable.map((s, i) => (
              <label key={s.id} className="list-row" style={{ cursor: onToggle ? "pointer" : "default" }}>
                <Checkbox on={s.enabled} disabled={!onToggle || busy} onChange={(v) => onToggle?.(s, v)} label={`Use ${s.label}`} />
                <span>
                  <strong>{i + 1}</strong> · {s.label}
                </span>
                <span className="right">{s.height === "low" ? "Low · reachable" : s.height === "high" ? "High · adults only" : fits(s)}</span>
              </label>
            ))}
            {unsafe.map((s) => (
              <div key={s.id} className="list-row blocked">
                <Ban size={22} strokeWidth={1.8} aria-hidden="true" />
                <span>
                  {s.label} — <em>never</em>
                  {s.unsafeReason ? `, ${s.unsafeReason.toLowerCase()}` : ""}
                </span>
              </div>
            ))}
          </div>
        </>
      )}
    </>
  );
}
