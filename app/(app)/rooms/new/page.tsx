"use client";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useApp } from "@/components/AppContext";
import { PhotoPicker } from "@/components/PhotoPicker";
import { RoomEditor } from "@/components/RoomEditor";
import { Actions, Checkbox, Topbar, Working } from "@/components/ui";
import { api } from "@/lib/client/api";
import { errorMessage } from "@/lib/client/utils";
import type { Room } from "@/lib/types";

export default function NewRoomPage() {
  const router = useRouter();
  const { actions } = useApp();
  const [name, setName] = useState("");
  const [notes, setNotes] = useState("");
  const [kids, setKids] = useState(false);
  const [photos, setPhotos] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [room, setRoom] = useState<Room | null>(null);

  async function scan() {
    setBusy(true);
    setError(null);
    try {
      const r = await api.addRoom(name, notes, photos, kids);
      setRoom(r);
      actions.setRooms((rs) => [...rs, r]);
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setBusy(false);
    }
  }

  async function toggle(spotId: string, enabled: boolean) {
    if (!room) return;
    try {
      const r = await api.setSpot(room.id, spotId, enabled);
      setRoom(r);
      actions.setRooms((rs) => rs.map((x) => (x.id === r.id ? r : x)));
    } catch (e) {
      setError(errorMessage(e));
    }
  }

  return (
    <div className="screen has-actions">
      <Topbar eyebrow="Room name" title={room ? room.name : name || "New room"} back={() => router.back()} />
      {error && <p className="error">{error}</p>}
      {busy ? (
        <Working label="Finding the hiding spots…" />
      ) : room ? (
        <>
          <RoomEditor room={room} photo={room.photos[0]?.url ?? null} onToggle={(s, v) => void toggle(s.id, v)} />
          <p className="muted small">Untick anything you&apos;d rather the elves left alone. Blocked spots stay blocked.</p>
        </>
      ) : (
        <>
          <input className="input" placeholder="Name, e.g. Kitchen, Upstairs landing" value={name} onChange={(e) => setName(e.target.value)} autoFocus />
          <input className="input" placeholder="Notes, e.g. the kids come down these stairs first" value={notes} onChange={(e) => setNotes(e.target.value)} />
          <label className="check-line">
            <Checkbox on={kids} onChange={setKids} label="This is a child's bedroom" />
            A child&apos;s bedroom (used sparingly, never above the bed)
          </label>
          <div className="eyebrow">Photo</div>
          <p className="muted small">One wide shot from the doorway works best. Photos stay private to your family and are never used to train anything.</p>
          <PhotoPicker photos={photos} onChange={setPhotos} multiple={false} />
        </>
      )}
      <Actions>
        {room ? (
          <>
            <button className="btn secondary" onClick={() => setRoom(null)}>
              Retake
            </button>
            <button className="btn primary" onClick={() => router.replace("/rooms")}>
              Save {room.name.toLowerCase()}
            </button>
          </>
        ) : (
          <>
            <button className="btn secondary" onClick={() => router.back()}>
              Cancel
            </button>
            <button className="btn primary" disabled={!name.trim() || busy} onClick={() => void scan()}>
              {photos.length ? "Find the spots" : "Save without photo"}
            </button>
          </>
        )}
      </Actions>
    </div>
  );
}
