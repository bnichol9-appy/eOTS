"use client";
import { Camera, Info } from "lucide-react";
import { useState } from "react";
import { useApp } from "./AppContext";
import { PhotoPicker } from "./PhotoPicker";
import { Chips, ElfAvatar, Sheet, SheetSection, Working } from "./ui";
import { api, type DayResponse } from "@/lib/client/api";
import { chosenIdea } from "@/lib/client/season";
import { errorMessage, localDate, REACTIONS, shiftDate } from "@/lib/client/utils";

const TAGS = ["Messy", "Tidy", "Spooky", "Funny", "Big build", "Quick", "Chaos", "Prank", "Food", "Toys", "Pets", "Notes & letters"];

/**
 * "I went solo": log a night you did your own way. A photo of the aftermath, the room, which elves and a few tags.
 * Replaces whatever was planned for that night.
 */
export function SoloSheet({ date: initialDate, onClose, onDone }: { date?: string; onClose: () => void; onDone: (r: DayResponse) => void }) {
  const { data } = useApp();
  const today = localDate();
  const [date, setDate] = useState(initialDate && initialDate <= today ? initialDate : today);
  const [photos, setPhotos] = useState<string[]>([]);
  const [roomName, setRoomName] = useState(data.rooms[0]?.name ?? "");
  const [otherRoom, setOtherRoom] = useState("");
  const [elves, setElves] = useState<string[]>(data.profile.elves.map((e) => e.name));
  const [tags, setTags] = useState<string[]>([]);
  const [title, setTitle] = useState("");
  const [reaction, setReaction] = useState(4);
  const [notes, setNotes] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const day = data.days.find((d) => d.date === date);
  const planned = chosenIdea(day);
  const rooms = [...data.rooms.map((r) => r.name), "Somewhere else"];
  const room = roomName === "Somewhere else" ? otherRoom.trim() : roomName;
  const yesterday = shiftDate(today, -1);

  async function save() {
    setBusy(true);
    setError(null);
    try {
      const r = await api.solo(date, { photo: photos[0], title, roomName: room, elves, tags, reaction, notes });
      onDone(r);
    } catch (e) {
      setError(errorMessage(e));
      setBusy(false);
    }
  }

  return (
    <Sheet
      eyebrow="Went solo"
      title="Log your own set-up"
      onClose={onClose}
      footer={
        !busy && (
          <button className="btn primary large full" disabled={photos.length === 0} onClick={() => void save()}>
            <Camera size={18} strokeWidth={1.8} /> {photos.length ? "Log this night" : "Add a photo to log it"}
          </button>
        )
      }
    >
      {busy ? (
        <Working label="Studying the scene of the crime…" />
      ) : (
        <>
          <SheetSection title="Which night?">
            <div className="chips">
              {[
                { d: today, label: "Tonight" },
                { d: yesterday, label: "Last night" },
              ].map((o) => (
                <button key={o.d} className={`chip ${date === o.d ? "on" : ""}`} aria-pressed={date === o.d} onClick={() => setDate(o.d)}>
                  {o.label}
                </button>
              ))}
              <input className="input date-chip" type="date" max={today} value={date} onChange={(e) => e.target.value && setDate(e.target.value)} aria-label="Pick a date" />
            </div>
            {day?.status === "done" ? (
              <p className="solo-note">
                <Info size={16} strokeWidth={1.8} aria-hidden="true" /> This night is already logged{planned ? ` as ${planned.title}` : ""}. Yours will replace it.
              </p>
            ) : planned ? (
              <p className="solo-note">
                <Info size={16} strokeWidth={1.8} aria-hidden="true" /> Clears the plan for this night ({planned.title}).
              </p>
            ) : null}
          </SheetSection>

          <SheetSection title="The aftermath" hint="Required">
            <PhotoPicker photos={photos} onChange={setPhotos} multiple={false} label="Choose" />
          </SheetSection>

          <SheetSection title="Where?">
            <Chips options={rooms} value={roomName ? [roomName] : []} onChange={(v) => v[0] && setRoomName(v[0])} scroll />
            {roomName === "Somewhere else" && (
              <input className="input" placeholder="e.g. Garden, the car, Grandma's" value={otherRoom} onChange={(e) => setOtherRoom(e.target.value)} aria-label="Room name" />
            )}
          </SheetSection>

          {data.profile.elves.length > 1 && (
            <SheetSection title="Who was in on it?">
              <div className="chips">
                {data.profile.elves.map((e) => {
                  const on = elves.includes(e.name);
                  return (
                    <button key={e.name} className={`chip elf-chip ${on ? "on" : ""}`} aria-pressed={on} onClick={() => setElves(on ? elves.filter((n) => n !== e.name) : [...elves, e.name])}>
                      <ElfAvatar elf={e} /> {e.name}
                    </button>
                  );
                })}
              </div>
            </SheetSection>
          )}

          <SheetSection title="Tags" hint="Pick any">
            <Chips options={TAGS} value={tags} onChange={setTags} multi />
          </SheetSection>

          <SheetSection title="The kids" hint={REACTIONS[reaction - 1]}>
            <div className="reaction-scale" role="radiogroup" aria-label="Kids' reaction">
              {REACTIONS.map((r, i) => (
                <button key={r} role="radio" aria-checked={reaction === i + 1} className={reaction === i + 1 ? "on" : ""} onClick={() => setReaction(i + 1)}>
                  <span className="reaction-num">{i + 1}</span>
                  <span className="reaction-word">{r}</span>
                </button>
              ))}
            </div>
          </SheetSection>

          <SheetSection title="Name it" hint="Optional">
            <input className="input" placeholder="Leave blank and the elves will name it" value={title} onChange={(e) => setTitle(e.target.value)} aria-label="Title" maxLength={80} />
            <textarea className="input" rows={2} placeholder="What did you do? Anything the kids said?" value={notes} onChange={(e) => setNotes(e.target.value)} aria-label="Notes" />
          </SheetSection>
          {error && <p className="error">{error}</p>}
        </>
      )}
    </Sheet>
  );
}
