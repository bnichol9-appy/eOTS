"use client";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useApp } from "@/components/AppContext";
import { PageHead } from "@/components/ui";
import { api } from "@/lib/client/api";
import { errorMessage, LOCK_KEY, lockAfterSeconds } from "@/lib/client/utils";
import type { Profile } from "@/lib/types";

export default function ElfSettingsPage() {
  const { data, actions } = useApp();
  const router = useRouter();
  const [p, setP] = useState<Profile>(data.profile);
  const [displayName, setDisplayName] = useState(data.user.displayName);
  const [handle, setHandle] = useState(data.user.handle);
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
      actions.setUser(r.user);
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
