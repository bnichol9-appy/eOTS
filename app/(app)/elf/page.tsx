"use client";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useApp } from "@/components/AppContext";
import { PageHead } from "@/components/ui";
import { api } from "@/lib/client/api";
import { currentPushEndpoint, errorMessage, LOCK_KEY, lockAfterSeconds, subscribeToPush, timezone } from "@/lib/client/utils";
import type { Profile } from "@/lib/types";

export default function ElfSettingsPage() {
  const { data, actions } = useApp();
  const router = useRouter();
  const [p, setP] = useState<Profile>(data.profile);
  const [displayName, setDisplayName] = useState(data.user.displayName);
  const [handle, setHandle] = useState(data.family.handle);
  const [familyCode, setFamilyCode] = useState("");
  const [familyMsg, setFamilyMsg] = useState<string | null>(null);
  const [pushBusy, setPushBusy] = useState(false);
  const [pushMsg, setPushMsg] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lockAfter, setLockAfter] = useState(() => lockAfterSeconds());
  const [oldPin, setOldPin] = useState("");
  const [newPin, setNewPin] = useState("");
  const [pinMsg, setPinMsg] = useState<string | null>(null);

  const set = <K extends keyof Profile>(k: K, v: Profile[K]) => setP((cur) => ({ ...cur, [k]: v }));

  async function save() {
    setError(null);
    try {
      const r = await api.saveProfile({ ...p, displayName, handle });
      actions.setProfile(r.profile);
      await actions.reload();
      setSaved(true);
      setTimeout(() => setSaved(false), 1500);
    } catch (e) {
      setError(errorMessage(e));
    }
  }

  async function changePin() {
    setPinMsg(null);
    try {
      await api.setPin(newPin, oldPin);
      setPinMsg("PIN changed");
      setOldPin("");
      setNewPin("");
    } catch (e) {
      setPinMsg(errorMessage(e));
    }
  }

  async function enablePush() {
    setPushBusy(true);
    setPushMsg(null);
    try {
      const info = await api.pushInfo();
      if (!info.available || !info.publicKey) throw new Error("Push isn't set up on the server yet (VAPID keys).");
      const sub = await subscribeToPush(info.publicKey);
      await api.pushSubscribe(sub);
      await api.saveSettings({ timezone: timezone() });
      await actions.reload();
      setPushMsg("Reminders are on. You should have just got a hello.");
    } catch (e) {
      setPushMsg(errorMessage(e));
    } finally {
      setPushBusy(false);
    }
  }

  async function disablePush() {
    setPushBusy(true);
    try {
      await api.pushUnsubscribe((await currentPushEndpoint()) ?? undefined);
      await actions.reload();
      setPushMsg("Reminders are off on this device.");
    } catch (e) {
      setPushMsg(errorMessage(e));
    } finally {
      setPushBusy(false);
    }
  }

  async function saveSetting(patch: Parameters<typeof api.saveSettings>[0]) {
    try {
      actions.setSettings(await api.saveSettings(patch));
    } catch (e) {
      setError(errorMessage(e));
    }
  }

  const s = data.user.settings;
  const withCurrent = (opts: string[], cur: string | null) => (cur && !opts.includes(cur) ? [...opts, cur].sort() : opts);
  const timeOptions = withCurrent(["18:00", "18:30", "19:00", "19:30", "20:00", "20:30", "21:00", "21:30", "22:00", "22:30"], s.eveningReminder);
  const morningOptions = withCurrent(["06:30", "07:00", "07:30", "08:00", "08:30", "09:00"], s.morningReminder);

  return (
    <div>
      <PageHead title="Your elf" sub="Who the elf is and how far it's allowed to go." />
      {error && <p className="error">{error}</p>}

      <div className="card form">
        <label>
          Elf&apos;s name
          <input className="input" value={p.elfName} onChange={(e) => set("elfName", e.target.value)} placeholder="e.g. Sprout" />
        </label>
        <label>
          Personality
          <textarea className="input" rows={2} value={p.elfPersonality} onChange={(e) => set("elfPersonality", e.target.value)} />
        </label>
        <label>
          Kids (name and age, one per line; never shared)
          <textarea
            className="input"
            rows={3}
            placeholder={"Ava 7\nMax 4"}
            defaultValue={p.kids.map((k) => (k.age ? `${k.name} ${k.age}` : k.name)).join("\n")}
            onChange={(e) =>
              set(
                "kids",
                e.target.value
                  .split("\n")
                  .map((line) => line.trim())
                  .filter(Boolean)
                  .map((line) => {
                    const m = line.match(/^(.*?)[\s,]+(\d{1,2})$/);
                    return m ? { name: m[1].trim(), age: Number(m[2]) } : { name: line, age: null };
                  }),
              )
            }
          />
        </label>
        <label>
          Chaos level: <strong>{["", "Gentle", "Playful", "Cheeky", "Chaotic", "Total mayhem"][p.chaosLevel]}</strong>
          <input type="range" min={1} max={5} value={p.chaosLevel} onChange={(e) => set("chaosLevel", Number(e.target.value))} />
        </label>
        <label>
          Mess tolerance
          <select className="input" value={p.messTolerance} onChange={(e) => set("messTolerance", e.target.value as Profile["messTolerance"])}>
            <option value="low">Low, I&apos;m tired</option>
            <option value="medium">Medium</option>
            <option value="high">High, bring it on</option>
          </select>
        </label>
        <label>
          Supplies you usually have
          <textarea className="input" rows={2} value={p.supplies} onChange={(e) => set("supplies", e.target.value)} />
        </label>
        <label>
          Off limits and house rules
          <textarea
            className="input"
            rows={3}
            placeholder="e.g. nothing in the baby's room, no flour on the carpet, OK to cut up old socks and t-shirts, dog must stay out of it"
            value={p.offLimits}
            onChange={(e) => set("offLimits", e.target.value)}
          />
        </label>
        <label>
          Anything else the elf should know
          <textarea className="input" rows={3} placeholder="Family jokes, what the kids are into, what's worked before…" value={p.notes} onChange={(e) => set("notes", e.target.value)} />
        </label>
        <div className="row">
          <label className="half">
            Season starts (MM-DD)
            <input className="input" value={p.seasonStart} onChange={(e) => set("seasonStart", e.target.value)} />
          </label>
          <label className="half">
            Season ends (MM-DD)
            <input className="input" value={p.seasonEnd} onChange={(e) => set("seasonEnd", e.target.value)} />
          </label>
        </div>
        <p className="eyebrow">How other parents see you</p>
        <label>
          Your name
          <input className="input" value={displayName} onChange={(e) => setDisplayName(e.target.value)} />
        </label>
        <label>
          Handle
          <input className="input" value={handle} onChange={(e) => setHandle(e.target.value.toLowerCase())} />
        </label>
        <button className="btn primary big" onClick={() => void save()}>
          {saved ? "Saved ✓" : "Save"}
        </button>
      </div>

      <h2 className="section">Reminders</h2>
      <div className="card form">
        <p className="muted small">
          A nudge at bedtime if the elf hasn&apos;t moved, and one in the morning if you haven&apos;t logged how it went. Upvotes, comments and remakes of your setups also ping you.
          {data.pushAvailable ? "" : " (Push isn't configured on the server yet, so these only show in your inbox.)"}
        </p>
        {data.user.pushEnabled ? (
          <button className="btn ghost" disabled={pushBusy} onClick={() => void disablePush()}>
            Turn off push on this device
          </button>
        ) : (
          <button className="btn primary" disabled={pushBusy || !data.pushAvailable} onClick={() => void enablePush()}>
            {pushBusy ? "…" : "Turn on push notifications"}
          </button>
        )}
        {pushMsg && <p className="small">{pushMsg}</p>}
        <label>
          Evening nudge
          <select className="input" value={s.eveningReminder ?? ""} onChange={(e) => void saveSetting({ eveningReminder: e.target.value || null })}>
            <option value="">Off</option>
            {timeOptions.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
        </label>
        <label>
          Morning &quot;how did it go?&quot;
          <select className="input" value={s.morningReminder ?? ""} onChange={(e) => void saveSetting({ morningReminder: e.target.value || null })}>
            <option value="">Off</option>
            {morningOptions.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
        </label>
        <p className="muted small">
          Times are in {s.timezone}.{" "}
          {s.timezone !== timezone() && (
            <button className="link-btn" onClick={() => void saveSetting({ timezone: timezone() })}>
              Use this device&apos;s timezone ({timezone()})
            </button>
          )}
        </p>
      </div>

      <h2 className="section">Co-parents</h2>
      <div className="card form">
        <p className="muted small">Everyone on this elf: {data.family.members.map((m) => m.displayName).join(", ")}.</p>
        <p>
          Your family code: <strong className="code">{data.family.inviteCode}</strong>
        </p>
        <p className="muted small">Your partner signs up with this code and gets the same house, plan, log and elf. Whoever is up at 11pm sees the same thing.</p>
        {data.family.members.length === 1 && data.stats.nightsDone === 0 && data.rooms.length === 0 && (
          <>
            <p className="eyebrow">Or join your partner&apos;s elf instead</p>
            <div className="row">
              <input className="input" placeholder="Their family code" value={familyCode} onChange={(e) => setFamilyCode(e.target.value.toUpperCase())} />
              <button
                className="btn ghost"
                disabled={!familyCode}
                onClick={() =>
                  void api
                    .joinFamily(familyCode)
                    .then(() => actions.reload())
                    .then(() => setFamilyMsg("Joined!"))
                    .catch((e) => setFamilyMsg(errorMessage(e)))
                }
              >
                Join
              </button>
            </div>
            {familyMsg && <p className="small">{familyMsg}</p>}
          </>
        )}
      </div>

      <h2 className="section">Lock</h2>
      <div className="card form">
        <label>
          Lock when the app is in the background for
          <select
            className="input"
            value={lockAfter}
            onChange={(e) => {
              const v = Number(e.target.value);
              setLockAfter(v);
              localStorage.setItem(LOCK_KEY, String(v));
            }}
          >
            <option value={0}>Immediately</option>
            <option value={30}>30 seconds</option>
            <option value={60}>1 minute</option>
            <option value={300}>5 minutes</option>
            <option value={1800}>30 minutes</option>
          </select>
        </label>
        <p className="muted small">The PIN is always required when the app is opened fresh.</p>
        <div className="row">
          <button className="btn ghost" onClick={actions.lock}>
            Lock now
          </button>
          <button
            className="btn ghost"
            onClick={() => {
              void api.logout().then(() => router.replace("/login"));
            }}
          >
            Sign out
          </button>
        </div>
      </div>

      <h2 className="section">Change PIN</h2>
      <div className="card form">
        <input className="input" inputMode="numeric" placeholder="Current PIN" value={oldPin} onChange={(e) => setOldPin(e.target.value)} />
        <input className="input" inputMode="numeric" placeholder="New PIN (4 to 8 digits)" value={newPin} onChange={(e) => setNewPin(e.target.value)} />
        {pinMsg && <p className="small">{pinMsg}</p>}
        <button className="btn ghost" disabled={!oldPin || !newPin} onClick={() => void changePin()}>
          Change PIN
        </button>
      </div>

      <p className="muted small center">
        eOTS · {data.user.email} · model {data.model}
      </p>
    </div>
  );
}
