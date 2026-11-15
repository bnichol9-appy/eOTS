import { useState } from "react";
import { api } from "../api";
import type { AppActions, AppData } from "../App";
import type { Room } from "../types";
import { errorMessage } from "../utils";
import { Sheet, Working } from "../components/ui";
import { PhotoPicker } from "../components/PhotoPicker";

export function House({ data, actions }: { data: AppData; actions: AppActions }) {
  const [adding, setAdding] = useState(false);
  const [openId, setOpenId] = useState<string | null>(null);
  const open = data.rooms.find((r) => r.id === openId) ?? null;

  return (
    <div>
      <header className="day-head">
        <div>
          <h1>Your house</h1>
          <p className="muted small">Photograph areas so the elf plans with your real stuff.</p>
        </div>
      </header>

      {data.rooms.length === 0 && (
        <div className="card notice">
          Start with the places kids walk into first in the morning: hallway, kitchen, living room, bathroom, their bedroom doorway. Wide shots work best.
        </div>
      )}

      <div className="rooms">
        {data.rooms.map((r) => (
          <button key={r.id} className="card room" onClick={() => setOpenId(r.id)}>
            {r.photos[0] ? <img src={`/api/photos/${r.photos[0].id}`} alt="" /> : <div className="room-noimg">📷</div>}
            <div>
              <h3>{r.name}</h3>
              <p className="muted small">{r.inventory ? r.inventory.summary : "Not analysed yet"}</p>
            </div>
          </button>
        ))}
      </div>

      <button className="btn primary big" onClick={() => setAdding(true)}>
        + Add an area
      </button>

      {adding && (
        <AddRoomSheet
          onClose={() => setAdding(false)}
          onAdded={(room) => {
            actions.setRooms((rs) => [...rs, room]);
            setAdding(false);
          }}
        />
      )}

      {open && (
        <RoomSheet
          room={open}
          onClose={() => setOpenId(null)}
          onChange={(room) => actions.setRooms((rs) => rs.map((r) => (r.id === room.id ? room : r)))}
          onDelete={() => {
            actions.setRooms((rs) => rs.filter((r) => r.id !== open.id));
            setOpenId(null);
          }}
        />
      )}
    </div>
  );
}

function AddRoomSheet({ onClose, onAdded }: { onClose: () => void; onAdded: (r: Room) => void }) {
  const [name, setName] = useState("");
  const [notes, setNotes] = useState("");
  const [photos, setPhotos] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function save() {
    setBusy(true);
    setError(null);
    try {
      onAdded(await api.addRoom(name, notes, photos));
    } catch (e) {
      setError(errorMessage(e));
      setBusy(false);
    }
  }

  return (
    <Sheet title="Add an area" onClose={onClose}>
      {busy ? (
        <Working label="The elf is scouting the room…" />
      ) : (
        <>
          <input className="input" placeholder="Name, e.g. Kitchen, Upstairs landing" value={name} onChange={(e) => setName(e.target.value)} />
          <input className="input" placeholder="Notes, e.g. the kids come down these stairs first" value={notes} onChange={(e) => setNotes(e.target.value)} />
          <PhotoPicker photos={photos} onChange={setPhotos} />
          {error && <p className="error">{error}</p>}
          <button className="btn primary big" disabled={!name.trim()} onClick={() => void save()}>
            {photos.length ? "Save & analyse" : "Save"}
          </button>
        </>
      )}
    </Sheet>
  );
}

function RoomSheet({ room, onClose, onChange, onDelete }: { room: Room; onClose: () => void; onChange: (r: Room) => void; onDelete: () => void }) {
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [newPhotos, setNewPhotos] = useState<string[]>([]);
  const [name, setName] = useState(room.name);
  const [notes, setNotes] = useState(room.notes);

  async function run(label: string, fn: () => Promise<Room>) {
    setBusy(label);
    setError(null);
    try {
      onChange(await fn());
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setBusy(null);
    }
  }

  const inv = room.inventory;
  return (
    <Sheet title={room.name} onClose={onClose}>
      {busy === "analyse" || busy === "photos" ? (
        <Working label="The elf is scouting the room…" />
      ) : (
        <>
          <div className="thumbs">
            {room.photos.map((p) => (
              <div className="thumb" key={p.id}>
                <img src={`/api/photos/${p.id}`} alt="" />
                <button className="thumb-x" aria-label="Remove" onClick={() => void run("del", () => api.deleteRoomPhoto(room.id, p.id))}>
                  ✕
                </button>
              </div>
            ))}
          </div>
          <PhotoPicker photos={newPhotos} onChange={setNewPhotos} label="More photos" />
          {newPhotos.length > 0 && (
            <button
              className="btn primary"
              onClick={() => void run("photos", () => api.addRoomPhotos(room.id, newPhotos)).then(() => setNewPhotos([]))}
            >
              Upload &amp; re-analyse
            </button>
          )}
          {error && <p className="error">{error}</p>}

          {inv ? (
            <div className="inventory">
              <p>{inv.summary}</p>
              <p className="eyebrow">Setup hooks</p>
              <ul>
                {inv.opportunities.map((o, i) => (
                  <li key={i}>{o}</li>
                ))}
              </ul>
              <p className="eyebrow">Props spotted</p>
              <p className="small">{inv.props.join(" · ")}</p>
              {inv.hazards.length > 0 && (
                <>
                  <p className="eyebrow">Avoid</p>
                  <p className="small">{inv.hazards.join(" · ")}</p>
                </>
              )}
            </div>
          ) : (
            <p className="muted">No analysis yet. Add a photo or tap re-analyse.</p>
          )}

          <div className="row">
            <button className="btn ghost" disabled={room.photos.length === 0} onClick={() => void run("analyse", () => api.analyseRoom(room.id))}>
              ↻ Re-analyse
            </button>
          </div>

          <p className="eyebrow">Details</p>
          <input className="input" value={name} onChange={(e) => setName(e.target.value)} />
          <input className="input" placeholder="Notes for the elf" value={notes} onChange={(e) => setNotes(e.target.value)} />
          <div className="row">
            <button className="btn ghost" onClick={() => void run("save", () => api.updateRoom(room.id, { name, notes }))}>
              Save details
            </button>
            <button
              className="btn danger"
              onClick={() => {
                if (confirm(`Delete ${room.name} and its photos?`)) api.deleteRoom(room.id).then(onDelete).catch((e) => setError(errorMessage(e)));
              }}
            >
              Delete area
            </button>
          </div>
        </>
      )}
    </Sheet>
  );
}
