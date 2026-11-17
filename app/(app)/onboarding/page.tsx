"use client";
import { APP_NAME } from "@/lib/brand";
import { useRouter } from "next/navigation";
import { ArrowRight, Camera, ChevronLeft, Moon, Users } from "lucide-react";
import { useState } from "react";
import { useApp } from "@/components/AppContext";
import { ElfEditor } from "@/components/ElfEditor";
import { PhotoPicker } from "@/components/PhotoPicker";
import { RoomEditor } from "@/components/RoomEditor";
import { Actions, Chips, Garland, ICON, ICON_SM, Segment, Working } from "@/components/ui";
import { SectionHead } from "@/components/home/Sections";
import { InviteShare } from "@/components/InviteShare";
import { familyInviteText, inviteLink } from "@/lib/invite";
import { seasonFor } from "@/lib/client/season";
import { localDate } from "@/lib/client/utils";
import { samplePhoto } from "@/lib/placeholders";
import { api } from "@/lib/client/api";
import { errorMessage } from "@/lib/client/utils";
import type { AgeBand, Elf, Room } from "@/lib/types";

const BANDS: { key: AgeBand; label: string }[] = [
  { key: "under5", label: "Under 5" },
  { key: "5to8", label: "5–8" },
  { key: "9to12", label: "9–12" },
];
const SPOOK = ["", "Cosy", "A shiver", "Ghost stories", "Haunted", "Properly spooky"];
const CHAOS = ["", "Gentle", "Playful", "Cheeky", "Chaotic", "Total mayhem"];
const SM = { size: 20, strokeWidth: 1.8 };

export default function OnboardingPage() {
  const router = useRouter();
  const { data, actions } = useApp();
  const [step, setStep] = useState(1);
  const [elves, setElves] = useState<Elf[]>(data.profile.elves.length ? data.profile.elves : [{ name: "", personality: "", color: "elf1" }]);
  const [bands, setBands] = useState<AgeBand[]>(data.profile.ageBands);
  const [spook, setSpook] = useState(data.profile.spookLevel);
  const [chaos, setChaos] = useState(data.profile.chaosLevel);
  const [minutes, setMinutes] = useState(data.profile.maxSetupMinutes);
  const [roomName, setRoomName] = useState("Kitchen");
  const [photos, setPhotos] = useState<string[]>([]);
  const [room, setRoom] = useState<Room | null>(null);
  const [channel, setChannel] = useState(data.user.settings.assistant.channel);
  const [phone, setPhone] = useState(data.user.settings.assistant.phone);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function saveHousehold() {
    setBusy(true);
    setError(null);
    try {
      const r = await api.saveProfile({ ...data.profile, elves: elves.filter((e) => e.name.trim()), ageBands: bands, spookLevel: spook, chaosLevel: chaos, maxSetupMinutes: minutes });
      actions.setProfile(r.profile);
      setStep(3);
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setBusy(false);
    }
  }

  async function scanRoom() {
    setBusy(true);
    setError(null);
    try {
      const r = await api.addRoom(roomName, "", photos, false);
      setRoom(r);
      actions.setRooms((rs) => [...rs, r]);
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setBusy(false);
    }
  }

  async function finish(withAssistant: boolean) {
    setBusy(true);
    setError(null);
    try {
      if (withAssistant) actions.setSettings(await api.saveSettings({ assistant: { channel, phone } }));
      const r = await api.saveProfile({ ...data.profile, elves: elves.filter((e) => e.name.trim()), ageBands: bands, spookLevel: spook, chaosLevel: chaos, maxSetupMinutes: minutes, onboarded: true });
      actions.setProfile(r.profile);
      await actions.reload();
      router.replace("/");
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setBusy(false);
    }
  }

  const season = seasonFor(data.profile, localDate());
  const STEPS = ["Welcome", "Elves and kids", "Your house", "Assistant"];
  const ROOM_CHOICES = ["Living room", "Kitchen", "Hallway", "Kids' room"];

  return (
    <div className="screen home has-actions onboarding">
      <header className="onb-head">
        {step > 1 ? (
          <button className="icon-btn" onClick={() => setStep(step - 1)} aria-label="Back">
            <ChevronLeft {...ICON} size={20} />
          </button>
        ) : (
          <Garland />
        )}
        <div className="onb-progress" aria-label={`Step ${step} of 4: ${STEPS[step - 1]}`}>
          {[1, 2, 3, 4].map((n) => (
            <i key={n} className={n < step ? "done" : n === step ? "on" : ""} />
          ))}
        </div>
        <span className="muted small">{step} of 4</span>
      </header>
      {error && <p className="error">{error}</p>}

      {step === 1 && (
        <>
          <div>
            <div className="brand">{APP_NAME}</div>
            <h1 className="onb-title">The elves work the night shift. You just set it up.</h1>
          </div>
          <section className="countdown">
            <div className="eyebrow">{season.phase === "pre" ? "The build-up starts now" : season.phase === "in" ? "You're just in time" : "Next season"}</div>
            <div className="countdown-num">
              {season.phase === "pre" ? season.daysUntil : season.phase === "in" ? season.nightNumber : season.length}
              <span>{season.phase === "pre" ? (season.daysUntil === 1 ? "sleep to go" : "sleeps to go") : season.phase === "in" ? `of ${season.length} nights` : "nights of mischief"}</span>
            </div>
            <p className="countdown-line">
              {season.phase === "pre"
                ? "until the elves arrive. Plenty of time to get the first week sorted."
                : season.phase === "in"
                  ? "Tonight's set-up can be ready in a couple of minutes."
                  : "Get set up now and you're ready for next December."}
            </p>
          </section>
          <div className="list">
            {[
              { icon: Camera, title: "Built from your house", sub: "Snap a room and the ideas fit your actual shelves and stairs" },
              { icon: Moon, title: "One set-up a night", sub: "Pitched at your kids and your 11pm energy levels" },
              { icon: Users, title: "Shared with your people", sub: "Your partner sees the same plan; friends swap ideas in circles" },
            ].map((r) => (
              <div key={r.title} className="list-row set-row">
                <r.icon {...SM} className="row-icon" aria-hidden="true" />
                <span className="row-label">
                  <strong>{r.title}</strong>
                  <span className="row-sub">{r.sub}</span>
                </span>
              </div>
            ))}
          </div>
          <div className="post-strip onb-strip" aria-hidden="true">
            {["living-room", "hallway", "kitchen", "kids-room", "bathroom"].map((n) => (
              // eslint-disable-next-line @next/next/no-img-element
              <img key={n} src={`/placeholders/${n}.jpg`} alt="" />
            ))}
          </div>
          <p className="muted small center">Takes about two minutes. Big, physical, a little bit spooky, never scary.</p>
        </>
      )}

      {step === 2 && (
        <>
          <div>
            <div className="eyebrow">Step 2 · {STEPS[1]}</div>
            <h1 className="onb-title">Who&apos;s on the night shift?</h1>
            <p className="body">Every idea gets pitched at the right level of mischief.</p>
          </div>
          <section aria-label="Your elves">
            <SectionHead title="Your elves" />
            <ElfEditor elves={elves} onChange={setElves} compact />
          </section>
          <section aria-label="Your kids">
            <SectionHead title="Your kids" />
            <div className="chips">
              {BANDS.map((b) => (
                <button
                  key={b.key}
                  className={`chip ${bands.includes(b.key) ? "on" : ""}`}
                  aria-pressed={bands.includes(b.key)}
                  onClick={() => setBands(bands.includes(b.key) ? bands.filter((x) => x !== b.key) : [...bands, b.key])}
                >
                  {b.label}
                </button>
              ))}
            </div>
            <p className="muted small">Pick every age that applies.</p>
          </section>
          <section aria-label="How far can the elves go">
            <SectionHead title="How far can they go?" />
            <div className="onb-dial">
              <div className="between">
                <span className="eyebrow">Spook</span>
                <strong>{SPOOK[spook]}</strong>
              </div>
              <div className="dial" role="radiogroup" aria-label="Spook level">
                {[1, 2, 3, 4, 5].map((n) => (
                  <button key={n} role="radio" aria-checked={spook === n} className={n <= spook ? "on" : ""} onClick={() => setSpook(n)} aria-label={SPOOK[n]} />
                ))}
              </div>
              <div className="between small muted">
                <span>Cosy</span>
                <span>Properly spooky</span>
              </div>
            </div>
            <div className="onb-dial">
              <div className="between">
                <span className="eyebrow">Chaos</span>
                <strong>{CHAOS[chaos]}</strong>
              </div>
              <div className="dial" role="radiogroup" aria-label="Chaos level">
                {[1, 2, 3, 4, 5].map((n) => (
                  <button key={n} role="radio" aria-checked={chaos === n} className={n <= chaos ? "on" : ""} onClick={() => setChaos(n)} aria-label={CHAOS[n]} />
                ))}
              </div>
              <div className="between small muted">
                <span>One spot, one scene</span>
                <span>Whole-room mayhem</span>
              </div>
            </div>
          </section>
          <section aria-label="Time at 11pm">
            <SectionHead title="Time at 11pm" />
            <div className="option-grid">
              {[5, 10, 20].map((m) => (
                <button key={m} className={`option ${minutes === m ? "on" : ""}`} aria-pressed={minutes === m} onClick={() => setMinutes(m)}>
                  {m} min
                </button>
              ))}
            </div>
          </section>
        </>
      )}

      {step === 3 && (
        <>
          <div>
            <div className="eyebrow">Step 3 · {STEPS[2]}</div>
            <h1 className="onb-title">Show us the room they see first</h1>
            <p className="body">One wide photo and the elves find the hiding spots. Photos stay private to your family.</p>
          </div>
          {busy ? (
            <Working label="Finding the hiding spots…" />
          ) : room ? (
            <RoomEditor
              room={room}
              photo={room.photos[0]?.url ?? null}
              onToggle={(s, v) =>
                void api.setSpot(room.id, s.id, v).then((r) => {
                  setRoom(r);
                  actions.setRooms((rs) => rs.map((x) => (x.id === r.id ? r : x)));
                })
              }
            />
          ) : (
            <section className="countdown" aria-label="Room photo">
              <div className="eyebrow">Which room?</div>
              <Chips options={ROOM_CHOICES} value={ROOM_CHOICES.includes(roomName) ? [roomName] : []} onChange={(v) => v[0] && setRoomName(v[0])} scroll />
              <input className="input" placeholder="Or type a room name" value={roomName} onChange={(e) => setRoomName(e.target.value)} aria-label="Room name" />
              <PhotoPicker photos={photos} onChange={setPhotos} multiple={false} />
              {photos.length === 0 && (
                <div className="photo sample-preview">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={samplePhoto(roomName)} alt="" className="sample-img" />
                  <span className="sample">Example of a good photo</span>
                </div>
              )}
            </section>
          )}
        </>
      )}

      {step === 4 && (
        <>
          <div>
            <div className="eyebrow">Step 4 · {STEPS[3]}</div>
            <h1 className="onb-title">Got an AI assistant?</h1>
            <p className="body">
              {APP_NAME} can hand it jobs: buy the kit, remind you at set-up time. It opens WhatsApp or Messages with the text ready and you tap send. Skip this if you don&apos;t have one.
            </p>
          </div>
          <section aria-label="Assistant">
            <Segment
              options={[
                { key: "whatsapp" as const, label: "WhatsApp" },
                { key: "imessage" as const, label: "iMessage" },
              ]}
              value={channel}
              onChange={setChannel}
            />
            <input className="input" type="tel" placeholder="Assistant's number, e.g. +44 7700 900123" value={phone} onChange={(e) => setPhone(e.target.value)} aria-label="Assistant's number" />
          </section>
          {data.family.members.length < 2 && (
            <section aria-label="Invite your co-parent">
              <SectionHead title="Bring in your co-parent" />
              <p className="muted small">Optional. They get the same house, plan and elves, so whoever is up at 11pm sees the same thing.</p>
              <InviteShare link={inviteLink(data.family.inviteCode)} text={familyInviteText(elves.map((e) => e.name.trim()).filter(Boolean), inviteLink(data.family.inviteCode))} />
            </section>
          )}
        </>
      )}

      <Actions stacked noTabs>
        {step === 1 && (
          <button className="btn primary large" onClick={() => setStep(2)}>
            Let&apos;s go <ArrowRight {...ICON_SM} />
          </button>
        )}
        {step === 2 && (
          <button className="btn primary large" disabled={busy || !elves.some((e) => e.name.trim())} onClick={() => void saveHousehold()}>
            Next: show us your house <ArrowRight {...ICON_SM} />
          </button>
        )}
        {step === 3 && !room && (
          <>
            <button className="btn primary large" disabled={busy || !roomName.trim() || photos.length === 0} onClick={() => void scanRoom()}>
              Find the spots <ArrowRight {...ICON_SM} />
            </button>
            <button className="link-btn" onClick={() => setStep(4)}>
              Add rooms later
            </button>
          </>
        )}
        {step === 3 && room && (
          <button className="btn primary large" onClick={() => setStep(4)}>
            Next: your assistant <ArrowRight {...ICON_SM} />
          </button>
        )}
        {step === 4 && (
          <>
            <button className="btn primary large" disabled={busy} onClick={() => void finish(Boolean(phone.trim()))}>
              {phone.trim() ? "Save and start" : "Start without an assistant"}
            </button>
            {phone.trim() && (
              <button className="link-btn" disabled={busy} onClick={() => void finish(false)}>
                Skip for now
              </button>
            )}
          </>
        )}
      </Actions>
    </div>
  );
}
