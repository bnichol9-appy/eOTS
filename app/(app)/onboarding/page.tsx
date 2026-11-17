"use client";
import { APP_NAME } from "@/lib/brand";
import { useRouter } from "next/navigation";
import { ArrowRight } from "lucide-react";
import { useState } from "react";
import { useApp } from "@/components/AppContext";
import { ElfEditor } from "@/components/ElfEditor";
import { PhotoPicker } from "@/components/PhotoPicker";
import { RoomEditor } from "@/components/RoomEditor";
import { Actions, Checkbox, ICON_SM, Segment, Topbar, Working } from "@/components/ui";
import { api } from "@/lib/client/api";
import { errorMessage } from "@/lib/client/utils";
import type { AgeBand, Elf, Room } from "@/lib/types";

const BANDS: { key: AgeBand; label: string }[] = [
  { key: "under5", label: "Under 5" },
  { key: "5to8", label: "5–8" },
  { key: "9to12", label: "9–12" },
];
const SPOOK = ["", "Cosy", "A shiver", "Ghost stories", "Haunted", "Properly spooky"];

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

  const progress = (
    <div className="progress" aria-label={`Step ${step} of 4`}>
      {[1, 2, 3, 4].map((n) => (
        <i key={n} className={n <= step ? "on" : ""} />
      ))}
    </div>
  );

  return (
    <div className="screen has-actions">
      <header className="topbar">
        {step > 1 && (
          <button className="icon-btn" onClick={() => setStep(step - 1)} aria-label="Back">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
              <path d="M15 5l-7 7 7 7" />
            </svg>
          </button>
        )}
        {progress}
        <span className="muted small">{step} of 4</span>
      </header>
      {error && <p className="error">{error}</p>}

      {step === 1 && (
        <>
          <div className="brand">{APP_NAME}</div>
          <h1>
            The elves work
            <br />
            the night shift
          </h1>
          <p className="body">One set-up per night through December, built from photos of your own house, pitched at your kids and your energy levels. Big, physical, a little bit spooky, never scary.</p>
          <p className="body">Takes about two minutes to set up.</p>
        </>
      )}

      {step === 2 && (
        <>
          <h1>
            Who&apos;s on the
            <br />
            night shift?
          </h1>
          <p className="body">Tell us about your elves and your kids. Every idea gets pitched at the right level of mischief.</p>
          <div className="eyebrow">Your elves</div>
          <ElfEditor elves={elves} onChange={setElves} compact />
          <div className="eyebrow">Kids&apos; ages (pick all)</div>
          <div className="chips">
            {BANDS.map((b) => (
              <button key={b.key} className={`chip ${bands.includes(b.key) ? "on" : ""}`} aria-pressed={bands.includes(b.key)} onClick={() => setBands(bands.includes(b.key) ? bands.filter((x) => x !== b.key) : [...bands, b.key])}>
                {b.label}
              </button>
            ))}
          </div>
          <div className="between">
            <span className="eyebrow">Spook level</span>
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
          <div className="between">
            <span className="eyebrow">Chaos level</span>
            <strong>{["", "Gentle", "Playful", "Cheeky", "Chaotic", "Total mayhem"][chaos]}</strong>
          </div>
          <div className="dial" role="radiogroup" aria-label="Chaos level">
            {[1, 2, 3, 4, 5].map((n) => (
              <button key={n} role="radio" aria-checked={chaos === n} className={n <= chaos ? "on" : ""} onClick={() => setChaos(n)} aria-label={`Chaos ${n}`} />
            ))}
          </div>
          <div className="between small muted">
            <span>One spot, one scene</span>
            <span>Whole-room mayhem</span>
          </div>
          <div className="eyebrow">Most time you&apos;ll give it at 11pm</div>
          <div className="option-grid">
            {[5, 10, 20].map((m) => (
              <button key={m} className={`option ${minutes === m ? "on" : ""}`} aria-pressed={minutes === m} onClick={() => setMinutes(m)}>
                {m} min
              </button>
            ))}
          </div>
        </>
      )}

      {step === 3 && (
        <>
          <h1>
            Show us
            <br />
            your house
          </h1>
          <p className="body">One wide photo of the room the kids walk into first. We&apos;ll find the hiding spots. Photos stay private to your family.</p>
          {busy ? (
            <Working label="Finding the hiding spots…" />
          ) : room ? (
            <RoomEditor room={room} photo={room.photos[0]?.url ?? null} onToggle={(s, v) => void api.setSpot(room.id, s.id, v).then((r) => { setRoom(r); actions.setRooms((rs) => rs.map((x) => (x.id === r.id ? r : x))); })} />
          ) : (
            <>
              <input className="input" placeholder="Room name" value={roomName} onChange={(e) => setRoomName(e.target.value)} aria-label="Room name" />
              <PhotoPicker photos={photos} onChange={setPhotos} multiple={false} />
            </>
          )}
        </>
      )}

      {step === 4 && (
        <>
          <h1>
            Got an AI
            <br />
            assistant?
          </h1>
          <p className="body">{APP_NAME} can hand it jobs: buy the kit, remind you at set-up time. It opens WhatsApp or Messages with the text ready and you tap send. Skip this if you don&apos;t have one.</p>
          <Segment
            options={[
              { key: "whatsapp" as const, label: "WhatsApp" },
              { key: "imessage" as const, label: "iMessage" },
            ]}
            value={channel}
            onChange={setChannel}
          />
          <input className="input" type="tel" placeholder="Assistant's number, e.g. +44 7700 900123" value={phone} onChange={(e) => setPhone(e.target.value)} aria-label="Assistant's number" />
          <label className="check-line">
            <Checkbox on={true} disabled label="Remind me at set-up time" />
            Nudge me at set-up time if the elves haven&apos;t moved
          </label>
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
