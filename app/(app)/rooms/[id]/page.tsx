"use client";
import { useParams, useRouter } from "next/navigation";
import { useState } from "react";
import { useApp } from "@/components/AppContext";
import { PhotoPicker } from "@/components/PhotoPicker";
import { RoomEditor } from "@/components/RoomEditor";
import { Actions, Checkbox, Sheet, Topbar, Working } from "@/components/ui";
import { api } from "@/lib/client/api";
import { errorMessage } from "@/lib/client/utils";
import type { Room } from "@/lib/types";

export default function RoomPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { data, actions } = useApp();
  const room = data.rooms.find((r) => r.id === id) ?? null;
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [edit, setEdit] = useState(false);
  const [retake, setRetake] = useState(false);
  const [newPhotos, setNewPhotos] = useState<string[]>([]);
  const [name, setName] = useState(room?.name ?? "");
  const [notes, setNotes] = useState(room?.notes ?? "");
  const [kids, setKids] = useState(room?.isKidsRoom ?? false);

  if (!room) return <p className="error">That room isn&apos;t here any more.</p>;

  async function run(label: string, fn: () => Promise<Room>) {
    setBusy(label);
    setError(null);
    try {
      const r = await fn();
      actions.setRooms((rs) => rs.map((x) => (x.id === r.id ? r : x)));
      return r;
    } catch (e) {
      setError(errorMessage(e));
      return null;
    } finally {
      setBusy(null);
    }
  }

  const inv = room.inventory;
  return (
    <div className="screen has-actions">
      <Topbar eyebrow="Room" title={room.name} back={() => router.back()} />
      {error && <p className="error">{error}</p>}
      {busy === "scan" ? (
        <Working label="Finding the hiding spots…" />
      ) : retake ? (
        <>
          <PhotoPicker photos={newPhotos} onChange={setNewPhotos} multiple={false} />
          <p className="muted small">The new photo replaces the pins. Spots you&apos;ve already unticked stay unticked if they&apos;re found again.</p>
        </>
      ) : (
        <>
          <RoomEditor room={room} photo={room.photos[room.photos.length - 1]?.url ?? null} busy={busy !== null} onToggle={(s, v) => void run("spot", () => api.setSpot(room.id, s.id, v))} />
          {inv && (
            <div className="card filled stack">
              <p className="body">{inv.summary}</p>
              <div>
                <div className="eyebrow">Mischief hooks</div>
                <ul className="small">
                  {inv.opportunities.slice(0, 6).map((o, i) => (
                    <li key={i}>{o}</li>
                  ))}
                </ul>
              </div>
            </div>
          )}
          <p className="muted small">
            {room.isKidsRoom ? `Child's bedroom · max ${room.maxNights ?? 2} nights a season` : `Used ${room.usedCount}× this season`} ·{" "}
            <button className="link-btn small" onClick={() => setEdit(true)}>
              Edit details
            </button>
          </p>
        </>
      )}

      <Actions>
        {retake ? (
          <>
            <button className="btn secondary" onClick={() => setRetake(false)}>
              Cancel
            </button>
            <button
              className="btn primary"
              disabled={newPhotos.length === 0}
              onClick={() =>
                void run("scan", async () => {
                  for (const p of room.photos) await api.deleteRoomPhoto(room.id, p.id);
                  return api.addRoomPhotos(room.id, newPhotos);
                }).then((r) => {
                  if (r) {
                    setRetake(false);
                    setNewPhotos([]);
                  }
                })
              }
            >
              Find the spots
            </button>
          </>
        ) : (
          <>
            <button className="btn secondary" onClick={() => setRetake(true)}>
              Retake
            </button>
            <button className="btn primary" disabled={room.photos.length === 0 || busy !== null} onClick={() => void run("scan", () => api.analyseRoom(room.id))}>
              Scan again
            </button>
          </>
        )}
      </Actions>

      {edit && (
        <Sheet title="Room details" onClose={() => setEdit(false)}>
          <input className="input" value={name} onChange={(e) => setName(e.target.value)} aria-label="Room name" />
          <input className="input" placeholder="Notes for the elves" value={notes} onChange={(e) => setNotes(e.target.value)} />
          <label className="check-line">
            <Checkbox on={kids} onChange={setKids} label="Child's bedroom" />
            A child&apos;s bedroom (used sparingly)
          </label>
          <button className="btn primary full" onClick={() => void run("save", () => api.updateRoom(room.id, { name, notes, isKidsRoom: kids })).then(() => setEdit(false))}>
            Save
          </button>
          <button
            className="btn full"
            onClick={() => {
              if (confirm(`Delete ${room.name} and its photo?`))
                api
                  .deleteRoom(room.id)
                  .then(() => {
                    actions.setRooms((rs) => rs.filter((r) => r.id !== room.id));
                    router.replace("/rooms");
                  })
                  .catch((e) => setError(errorMessage(e)));
            }}
          >
            Delete room
          </button>
        </Sheet>
      )}
    </div>
  );
}
