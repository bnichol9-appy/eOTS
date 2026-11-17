"use client";
import Link from "next/link";
import { Camera, ChevronRight, Plus } from "lucide-react";
import { useApp } from "@/components/AppContext";
import { SectionHead } from "@/components/home/Sections";
import { ElfAvatar, Topbar } from "@/components/ui";
import { chosenIdea, roomRotation } from "@/lib/client/season";
import { localDate, weekday, dayNum } from "@/lib/client/utils";
import { samplePhoto } from "@/lib/placeholders";
import { elfNames, type Room } from "@/lib/types";

const SM = { size: 16, strokeWidth: 1.8 };

/** Rooms: where tonight happens, which rooms still need a photo, and every room with its rotation. */
export default function RoomsPage() {
  const { data } = useApp();
  const today = localDate();
  const spots = data.rooms.reduce((n, r) => n + (r.inventory?.spots.filter((s) => s.enabled && !s.unsafe).length ?? 0), 0);
  const needPhoto = data.rooms.filter((r) => r.photos.length === 0);
  const tonightDay = data.days.find((d) => d.date === today);
  const tonight = chosenIdea(tonightDay);
  const tonightRoom = tonight ? (data.rooms.find((r) => r.name.toLowerCase() === tonight.roomName.toLowerCase()) ?? null) : null;
  const elves = data.profile.elves;

  return (
    <div className="screen home">
      <Topbar eyebrow={`${elfNames(data.profile)}'s haunts`} title="Your house" />

      <div className="season-legend">
        <span>
          <strong>{data.rooms.length}</strong> {data.rooms.length === 1 ? "room" : "rooms"}
        </span>
        <span>
          <strong>{spots}</strong> hiding spots
        </span>
        {needPhoto.length > 0 && (
          <span>
            <strong>{needPhoto.length}</strong> to photograph
          </span>
        )}
      </div>

      {tonight && (
        <section aria-label="Tonight">
          <SectionHead title="Tonight" />
          <Link href={tonightRoom ? `/rooms/${tonightRoom.id}` : "/"} className="tonight-room">
            <span className="photo">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={tonightRoom?.photos[0]?.url ?? samplePhoto(tonight.roomName, tonightRoom?.isKidsRoom)} alt="" className={tonightRoom?.photos[0] ? undefined : "sample-img"} />
            </span>
            <span className="tonight-room-body">
              <span className="night-meta">{tonight.roomName}</span>
              <strong>{tonight.title}</strong>
              <span className="tonight-roles">
                {tonight.roles.map((r, i) => {
                  const elf = elves.find((e) => e.name === r.elf) ?? { name: r.elf || "?", color: "elf3" as const };
                  return (
                    <span key={i}>
                      <ElfAvatar elf={elf} /> {r.spotLabel || r.roomName}
                    </span>
                  );
                })}
              </span>
            </span>
            <ChevronRight {...SM} className="muted" aria-hidden="true" />
          </Link>
        </section>
      )}

      {needPhoto.length > 0 && data.rooms.length > needPhoto.length && (
        <section aria-label="Needs a photo">
          <SectionHead title="Needs a photo" />
          <div className="list">
            {needPhoto.map((r) => (
              <Link key={r.id} href={`/rooms/${r.id}`} className="list-row activity">
                <Camera {...SM} className="acc" aria-hidden="true" />
                <span className="grow">
                  <strong>{r.name}</strong>
                  <span className="muted small"> · the ideas will fit the real room</span>
                </span>
                <ChevronRight {...SM} className="muted" aria-hidden="true" />
              </Link>
            ))}
          </div>
        </section>
      )}

      <section aria-label="Every room">
        <SectionHead title={data.rooms.length ? "Every room" : "Start with a room"} />
        <div className="rooms-grid">
          {data.rooms.map((r) => (
            <RoomCard key={r.id} room={r} today={today} tonight={tonightRoom?.id === r.id} />
          ))}
          <Link href="/rooms/new" className="room-card">
            <div className="add-room">
              <Plus size={28} strokeWidth={1.8} />
              Add a room
            </div>
            <strong>Snap a photo</strong>
            <span>The elves find the hiding spots</span>
          </Link>
        </div>
        <p className="muted small">
          {elves.length > 1
            ? "Rooms rotate so no elf is in the same room two nights running, and split nights always use different rooms. Photos stay private to your family."
            : "Rooms rotate so the elf is never in the same place two nights running. Photos stay private to your family."}
        </p>
      </section>
    </div>
  );
}

function RoomCard({ room, today, tonight }: { room: Room; today: string; tonight: boolean }) {
  const { data } = useApp();
  const spots = room.inventory?.spots.filter((s) => s.enabled && !s.unsafe).length ?? 0;
  const rot = roomRotation(data.days, room.name, today);
  const rotation =
    rot.next && rot.next > today ? `Next: ${weekday(rot.next)} ${dayNum(rot.next)}` : rot.ago !== null ? (rot.ago <= 1 ? "Used last night" : `Rested ${rot.ago} nights`) : "Not used yet";
  return (
    <Link href={`/rooms/${room.id}`} className="room-card">
      <div className="photo">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={room.photos[0]?.url ?? samplePhoto(room.name, room.isKidsRoom)} alt="" className={room.photos[0] ? undefined : "sample-img"} />
        {!room.photos[0] && <span className="sample">Example photo</span>}
        {tonight ? <span className="tag">Tonight</span> : room.isKidsRoom ? <span className="tag dark">Sparingly</span> : null}
      </div>
      <strong>{room.name}</strong>
      <span>{room.photos[0] ? (room.inventory ? `${spots} spots` : "Not scanned") : "Needs a photo"}</span>
      <span className="room-rotation">{tonight ? "Tonight" : room.isKidsRoom ? `${rot.done.length} of ${room.maxNights ?? 2} nights used` : rotation}</span>
    </Link>
  );
}
