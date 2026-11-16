"use client";
import { samplePhoto } from "@/lib/placeholders";
import Link from "next/link";
import { Moon, Plus } from "lucide-react";
import { useApp } from "@/components/AppContext";
import { ICON, Topbar } from "@/components/ui";
import { localDate } from "@/lib/client/utils";
import { elfNames } from "@/lib/types";

export default function RoomsPage() {
  const { data } = useApp();
  const spots = data.rooms.reduce((n, r) => n + (r.inventory?.spots.filter((s) => s.enabled).length ?? 0), 0);
  const today = data.days.find((d) => d.date === localDate());
  const tonight = today?.ideas.find((i) => i.id === today.chosenIdeaId);
  const tonightRooms = new Set((tonight ? [tonight.roomName, ...tonight.roles.map((r) => r.roomName)] : []).map((r) => r.toLowerCase()));

  return (
    <div className="screen">
      <Topbar
        eyebrow={`${elfNames(data.profile)}'s haunts`}
        title="Your house"
        right={
          <div style={{ textAlign: "right" }}>
            <div>
              <strong style={{ fontSize: 22 }}>{data.rooms.length}</strong> <span className="muted">rooms</span>
            </div>
            <div>
              <strong style={{ fontSize: 22 }}>{spots}</strong> <span className="muted">hiding spots</span>
            </div>
          </div>
        }
      />
      <div className="card filled notice">
        <Moon {...ICON} />
        <p>
          {data.profile.elves.length > 1
            ? "Rooms rotate so no elf is in the same room two nights running. On split nights they're always in different rooms."
            : "Rooms rotate so the elf is never in the same place two nights running. Photos stay private to your family."}
        </p>
      </div>
      <div className="rooms-grid">
        {data.rooms.map((r) => {
          const enabled = r.inventory?.spots.filter((s) => s.enabled).length ?? 0;
          const isTonight = tonightRooms.has(r.name.toLowerCase());
          return (
            <Link key={r.id} href={`/rooms/${r.id}`} className="room-card">
              <div className="photo">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={r.photos[0]?.url ?? samplePhoto(r.name, r.isKidsRoom)} alt="" className={r.photos[0] ? undefined : "sample-img"} />
                {!r.photos[0] && <span className="sample">Example photo</span>}
                {isTonight ? <span className="tag">Tonight{tonight && tonight.format === "duo" && data.profile.elves.length > 1 ? " · both" : ""}</span> : r.isKidsRoom ? <span className="tag dark">Sparingly</span> : null}
              </div>
              <strong>{r.name}</strong>
              <span>
                {r.inventory ? `${enabled} spots` : "Not scanned"} · {r.isKidsRoom ? `max ${r.maxNights ?? 2} nights` : `used ${r.usedCount}×`}
              </span>
            </Link>
          );
        })}
        <Link href="/rooms/new" className="room-card">
          <div className="add-room">
            <Plus size={28} strokeWidth={1.8} />
            Add a room
          </div>
          <strong>Photo</strong>
          <span>We&apos;ll find the spots</span>
        </Link>
      </div>
    </div>
  );
}
