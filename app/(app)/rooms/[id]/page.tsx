"use client";
import { useParams, useRouter } from "next/navigation";
import { Baby, ChevronRight, Pencil, Trash2 } from "lucide-react";
import { useState } from "react";
import { useApp } from "@/components/AppContext";
import { SectionHead } from "@/components/home/Sections";
import { IdeaSheet } from "@/components/IdeaSheet";
import { PhotoPicker } from "@/components/PhotoPicker";
import { RoomEditor } from "@/components/RoomEditor";
import { Actions, ICON, Sheet, Tiles, Topbar, Working } from "@/components/ui";
import { api } from "@/lib/client/api";
import { chosenIdea, roomRotation } from "@/lib/client/season";
import { dayNum, errorMessage, localDate, REACTIONS, weekday } from "@/lib/client/utils";
import { samplePhoto } from "@/lib/placeholders";
import { formatWord, type Idea, type Room } from "@/lib/types";

const SM = { size: 16, strokeWidth: 1.8 };

/** One room: its photo and hiding spots, what the elves can do here, ideas for it and nights already done in it. */
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
  const [open, setOpen] = useState<Idea | null>(null);
  const today = localDate();

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
  const hasPhoto = room.photos.length > 0;
  const usable = inv?.spots.filter((s) => !s.unsafe && s.enabled).length ?? 0;
  const rot = roomRotation(data.days, room.name, today);
  const ideas = data.library.filter((i) => i.roomName.toLowerCase() === room.name.toLowerCase() || i.roles.some((r) => r.roomName.toLowerCase() === room.name.toLowerCase()));
  const done = rot.done.filter((d) => d.result?.photoUrl).reverse();
  const addPhoto = !hasPhoto || retake;

  return (
    <div className="screen home has-actions">
      <Topbar
        eyebrow={room.isKidsRoom ? "Child's bedroom · used sparingly" : "Room"}
        title={room.name}
        back={() => router.back()}
        right={
          <button className="icon-btn" onClick={() => setEdit(true)} aria-label="Edit room details">
            <Pencil {...ICON} size={18} />
          </button>
        }
      />
      {error && <p className="error">{error}</p>}

      {busy === "scan" ? (
        <Working label="Finding the hiding spots…" />
      ) : addPhoto ? (
        <section className="countdown" aria-label="Room photo">
          <div className="eyebrow">{hasPhoto ? "Retake" : "Add a photo"}</div>
          <h2 className="card-title">{hasPhoto ? "A new photo replaces the pins" : `Snap your ${room.name.toLowerCase()}`}</h2>
          <p className="body small">
            {hasPhoto
              ? "Spots you've already switched off stay off if they're found again."
              : "Stand in the doorway and get as much of the room in as you can. The elves find the hiding spots and the ideas start fitting your actual house."}
          </p>
          <PhotoPicker photos={newPhotos} onChange={setNewPhotos} multiple={false} />
          {!hasPhoto && (
            <div className="photo sample-preview">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={samplePhoto(room.name, room.isKidsRoom)} alt="" className="sample-img" />
              <span className="sample">Example of a good photo</span>
            </div>
          )}
        </section>
      ) : (
        <>
          <Tiles
            items={[
              { label: "Hiding spots", value: String(usable) },
              { label: "Nights here", value: String(rot.done.length) },
              {
                label: room.isKidsRoom ? "Allowed" : rot.next && rot.next > today ? "Next" : "Last used",
                value: room.isKidsRoom
                  ? `${room.maxNights ?? 2} a season`
                  : rot.next && rot.next > today
                    ? `${weekday(rot.next)} ${dayNum(rot.next)}`
                    : rot.ago === null
                      ? "Never"
                      : rot.ago <= 1
                        ? "Last night"
                        : `${rot.ago} nights ago`,
              },
            ]}
          />
          <RoomEditor room={room} photo={room.photos[room.photos.length - 1]?.url ?? null} busy={busy !== null} onToggle={(s, v) => void run("spot", () => api.setSpot(room.id, s.id, v))} />
          {inv && (
            <section aria-label="What the elves see">
              <SectionHead title="What the elves see" />
              <p className="body">{inv.summary}</p>
              {inv.opportunities.length > 0 && (
                <div className="hooks">
                  {inv.opportunities.slice(0, 8).map((o, i) => (
                    <span key={i} className="tag line">
                      {o}
                    </span>
                  ))}
                </div>
              )}
            </section>
          )}
          {room.notes && <p className="muted small">Notes for the elves: {room.notes}</p>}
        </>
      )}

      {!addPhoto && ideas.length > 0 && (
        <section aria-label="Ideas for this room">
          <SectionHead title="Ideas for this room" action={<span className="muted small">{ideas.length}</span>} />
          <div className="idea-list">
            {ideas.slice(0, 6).map((i) => (
              <button key={i.id} className="idea-row" onClick={() => setOpen(i)}>
                <span className="grow">
                  <span className="night-meta">
                    {i.format !== "single" ? `${formatWord(i.format).replace(" night", "")} · ` : ""}
                    {i.setupMinutes} min
                  </span>
                  <span className="night-title">{i.title}</span>
                </span>
                <ChevronRight {...SM} className="muted" aria-hidden="true" />
              </button>
            ))}
          </div>
        </section>
      )}

      {!addPhoto && done.length > 0 && (
        <section aria-label="Nights here">
          <SectionHead title="Nights here" />
          <div className="mosaic">
            {done.slice(0, 6).map((d) => (
              <button
                key={d.date}
                className="mosaic-cell"
                onClick={() => router.push(`/calendar?date=${d.date}`)}
                aria-label={`${chosenIdea(d)?.title ?? "Set-up"}, the kids ${REACTIONS[(d.result?.reaction ?? 4) - 1]?.toLowerCase()}`}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={d.result!.photoUrl!} alt="" loading="lazy" />
                <span>{dayNum(d.date)}</span>
              </button>
            ))}
          </div>
        </section>
      )}

      <Actions>
        {addPhoto ? (
          <>
            <button
              className="btn secondary"
              onClick={() => {
                if (hasPhoto) setRetake(false);
                else router.back();
              }}
            >
              {hasPhoto ? "Cancel" : "Later"}
            </button>
            <button
              className="btn primary"
              disabled={newPhotos.length === 0 || busy !== null}
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
            <button className="btn primary" disabled={busy !== null} onClick={() => void run("scan", () => api.analyseRoom(room.id))}>
              Scan again
            </button>
          </>
        )}
      </Actions>

      {open && (
        <IdeaSheet
          idea={open}
          elves={data.profile.elves}
          onClose={() => setOpen(null)}
          actions={
            <button
              className="btn primary full"
              onClick={() =>
                void api
                  .useIdea(open.id, today)
                  .then((r) => {
                    actions.setDay(r.day);
                    router.push("/");
                  })
                  .catch((e) => setError(errorMessage(e)))
              }
            >
              Do this tonight
            </button>
          }
        />
      )}

      {edit && (
        <Sheet
          eyebrow="Room"
          title="Room details"
          onClose={() => setEdit(false)}
          footer={
            <button className="btn primary large full" onClick={() => void run("save", () => api.updateRoom(room.id, { name, notes, isKidsRoom: kids })).then(() => setEdit(false))}>
              Save
            </button>
          }
        >
          <label className="field">
            <span className="eyebrow">Name</span>
            <input className="input" value={name} onChange={(e) => setName(e.target.value)} />
          </label>
          <label className="field">
            <span className="eyebrow">Notes for the elves</span>
            <textarea className="input" rows={2} placeholder="e.g. the kids come down these stairs first" value={notes} onChange={(e) => setNotes(e.target.value)} />
          </label>
          <div className="list">
            <button className="list-row set-row" role="switch" aria-checked={kids} onClick={() => setKids(!kids)}>
              <Baby size={18} strokeWidth={1.8} className="row-icon" aria-hidden="true" />
              <span className="row-label">
                A child&apos;s bedroom
                <span className="row-sub">Used sparingly, never above the bed</span>
              </span>
              <span className={`switch ${kids ? "on" : ""}`} aria-hidden="true">
                <i />
              </span>
            </button>
            <button
              className="list-row set-row"
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
              <Trash2 size={18} strokeWidth={1.8} className="row-icon" aria-hidden="true" />
              <span className="row-label acc">Delete this room</span>
            </button>
          </div>
        </Sheet>
      )}
    </div>
  );
}
