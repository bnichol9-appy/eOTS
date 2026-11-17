"use client";
import { useRouter } from "next/navigation";
import { Baby } from "lucide-react";
import { useState } from "react";
import { useApp } from "@/components/AppContext";
import { PhotoPicker } from "@/components/PhotoPicker";
import { RoomEditor } from "@/components/RoomEditor";
import { Actions, Chips, Topbar, Working } from "@/components/ui";
import { api } from "@/lib/client/api";
import { errorMessage } from "@/lib/client/utils";
import { samplePhoto } from "@/lib/placeholders";
import type { Room } from "@/lib/types";

const SM = { size: 18, strokeWidth: 1.8 };
const ROOMS = ["Living room", "Kitchen", "Hallway", "Stairs", "Bathroom", "Kids' room", "Playroom", "Landing"];

/** Add a room: name it, snap it, and the elves find the hiding spots. */
export default function NewRoomPage() {
  const router = useRouter();
  const { data, actions } = useApp();
  const [name, setName] = useState("");
  const [notes, setNotes] = useState("");
  const [kids, setKids] = useState(false);
  const [photos, setPhotos] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [room, setRoom] = useState<Room | null>(null);
  const taken = new Set(data.rooms.map((r) => r.name.toLowerCase()));
  const choices = ROOMS.filter((r) => !taken.has(r.toLowerCase()));

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
    <div className="screen home has-actions">
      <Topbar eyebrow={room ? "Room added" : "Your house"} title={room ? room.name : "Add a room"} back={() => router.back()} />
      {error && <p className="error">{error}</p>}
      {busy ? (
        <Working label="Finding the hiding spots…" />
      ) : room ? (
        <>
          <RoomEditor room={room} photo={room.photos[0]?.url ?? null} onToggle={(s, v) => void toggle(s.id, v)} />
          <p className="muted small">Switch off anything you&apos;d rather the elves left alone. Blocked spots stay blocked.</p>
        </>
      ) : (
        <>
          <section className="countdown" aria-label="Which room">
            <div className="eyebrow">Which room?</div>
            {choices.length > 0 && (
              <Chips
                options={choices}
                value={choices.includes(name) ? [name] : []}
                onChange={(v) => {
                  if (v[0]) {
                    setName(v[0]);
                    if (v[0] === "Kids' room") setKids(true);
                  }
                }}
                scroll
              />
            )}
            <input className="input" placeholder="Or type a name, e.g. Upstairs landing" value={name} onChange={(e) => setName(e.target.value)} aria-label="Room name" />
            <input
              className="input"
              placeholder="Notes for the elves, e.g. the kids come down these stairs first"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              aria-label="Notes for the elves"
            />
            <button className="list-row set-row kids-switch" role="switch" aria-checked={kids} onClick={() => setKids(!kids)}>
              <Baby {...SM} className="row-icon" aria-hidden="true" />
              <span className="row-label">
                A child&apos;s bedroom
                <span className="row-sub">Used sparingly, never above the bed</span>
              </span>
              <span className={`switch ${kids ? "on" : ""}`} aria-hidden="true">
                <i />
              </span>
            </button>
          </section>
          <section className="countdown" aria-label="Photo">
            <div className="eyebrow">Photo</div>
            <h2 className="card-title">One wide shot from the doorway</h2>
            <p className="muted small">The elves find the hiding spots and the ideas start fitting this room. Photos stay private to your family.</p>
            <PhotoPicker photos={photos} onChange={setPhotos} multiple={false} />
            {photos.length === 0 && (
              <div className="photo sample-preview">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={samplePhoto(name || "house", kids)} alt="" className="sample-img" />
                <span className="sample">Example of a good photo</span>
              </div>
            )}
          </section>
        </>
      )}
      <Actions>
        {room ? (
          <>
            <button
              className="btn secondary"
              onClick={() =>
                void api
                  .deleteRoom(room.id)
                  .then(() => {
                    actions.setRooms((rs) => rs.filter((r) => r.id !== room.id));
                    setRoom(null);
                    setPhotos([]);
                  })
                  .catch((e) => setError(errorMessage(e)))
              }
            >
              Retake
            </button>
            <button className="btn primary" onClick={() => router.replace(`/rooms/${room.id}`)}>
              Done
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
