"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { MessageSquare } from "lucide-react";
import { useState } from "react";
import { useApp } from "@/components/AppContext";
import { ElfEditor } from "@/components/ElfEditor";
import { Checkbox, ICON, Segment, Sheet, Topbar } from "@/components/ui";
import { friendlyTime } from "@/lib/assistant";
import { api } from "@/lib/client/api";
import { currentPushEndpoint, errorMessage, LOCK_KEY, lockAfterSeconds, subscribeToPush, timezone } from "@/lib/client/utils";
import type { AgeBand, Profile } from "@/lib/types";

const BANDS: { key: AgeBand; label: string }[] = [
  { key: "under5", label: "Under 5" },
  { key: "5to8", label: "5–8" },
  { key: "9to12", label: "9–12" },
];

export default function SettingsPage() {
  const router = useRouter();
  const { data, actions } = useApp();
  const [p, setP] = useState<Profile>(data.profile);
  const [displayName, setDisplayName] = useState(data.user.displayName);
  const [handle, setHandle] = useState(data.family.handle);
  const [error, setError] = useState<string | null>(null);
  const [sheet, setSheet] = useState<"none" | "elves" | "house" | "pin" | "family">("none");
  const [lockAfter, setLockAfter] = useState(() => lockAfterSeconds());
  const [pushBusy, setPushBusy] = useState(false);
  const [oldPin, setOldPin] = useState("");
  const [newPin, setNewPin] = useState("");
  const [familyCode, setFamilyCode] = useState("");
  const s = data.user.settings;
  const set = <K extends keyof Profile>(k: K, v: Profile[K]) => setP((cur) => ({ ...cur, [k]: v }));

  async function saveProfile(next: Profile = p) {
    setError(null);
    try {
      const r = await api.saveProfile({ ...next, displayName, handle });
      actions.setProfile(r.profile);
      await actions.reload();
      actions.toast("Saved.");
      setSheet("none");
    } catch (e) {
      setError(errorMessage(e));
    }
  }

  async function saveSetting(patch: Parameters<typeof api.saveSettings>[0]) {
    try {
      actions.setSettings(await api.saveSettings(patch));
    } catch (e) {
      setError(errorMessage(e));
    }
  }

  async function togglePush() {
    setPushBusy(true);
    setError(null);
    try {
      if (data.user.pushEnabled) {
        await api.pushUnsubscribe((await currentPushEndpoint()) ?? undefined);
      } else {
        const info = await api.pushInfo();
        if (!info.available || !info.publicKey) throw new Error("Push isn't set up on the server yet (VAPID keys).");
        await api.pushSubscribe(await subscribeToPush(info.publicKey));
        await api.saveSettings({ timezone: timezone() });
      }
      await actions.reload();
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setPushBusy(false);
    }
  }

  const Row = ({ label, value, onClick, sub }: { label: React.ReactNode; value?: React.ReactNode; onClick?: () => void; sub?: string }) => (
    <button className="list-row" onClick={onClick} disabled={!onClick}>
      <span>
        {label}
        {sub && <span className="muted"> ({sub})</span>}
      </span>
      {value !== undefined && <span className="right">{value}</span>}
    </button>
  );
  const Toggle = ({ label, on, onChange, sub }: { label: string; on: boolean; onChange: (v: boolean) => void; sub?: string }) => (
    <label className="list-row" style={{ cursor: "pointer" }}>
      <span>
        {label}
        {sub && <span className="muted"> ({sub})</span>}
      </span>
      <span className="right">
        <Checkbox on={on} onChange={onChange} label={label} />
      </span>
    </label>
  );

  return (
    <div className="screen">
      <Topbar title="Settings" back={() => router.back()} />
      {error && <p className="error">{error}</p>}

      <div className="eyebrow">Appearance</div>
      <Segment
        options={[
          { key: "light" as const, label: "Light" },
          { key: "dark" as const, label: "Dark" },
          { key: "system" as const, label: "Match phone" },
        ]}
        value={s.theme}
        onChange={(theme) => void saveSetting({ theme })}
      />

      <div className="eyebrow">Your elves</div>
      <div className="list">
        {data.profile.elves.map((e) => (
          <Row key={e.name} label={<span className="row"><span className={`elf xl ${e.color}`}>{e.name.charAt(0).toUpperCase()}</span> <strong>{e.name}</strong></span>} value={e.personality || "no personality yet"} onClick={() => setSheet("elves")} />
        ))}
      </div>
      <button className="link-btn" style={{ alignSelf: "flex-start" }} onClick={() => setSheet("elves")}>
        {data.profile.elves.length < 3 ? "+ Add an elf" : "Edit elves"}
      </button>

      <div className="eyebrow">Your house rules</div>
      <div className="list">
        <Row label="Kids' ages" value={p.ageBands.map((b) => BANDS.find((x) => x.key === b)?.label).join(", ") || "not set"} onClick={() => setSheet("house")} />
        <Row label="Spook level" value={`${p.spookLevel} / 5`} onClick={() => setSheet("house")} />
        <Row label="Chaos level" value={`${p.chaosLevel} / 5`} onClick={() => setSheet("house")} />
        <Row label="Time at 11pm" value={`${p.maxSetupMinutes} min`} onClick={() => setSheet("house")} />
        <Row label="Season" value={`${p.seasonStart} to ${p.seasonEnd}`} onClick={() => setSheet("house")} />
      </div>

      <div className="eyebrow">My AI assistant</div>
      <div className="list">
        <Row label={<span className="row"><MessageSquare {...ICON} className="pine" /> Send via</span>} value={<strong style={{ color: "var(--text)" }}>{s.assistant.channel === "whatsapp" ? "WhatsApp" : "iMessage"}</strong>} onClick={() => void saveSetting({ assistant: { channel: s.assistant.channel === "whatsapp" ? "imessage" : "whatsapp" } })} />
        <div className="list-row">
          <span>Assistant&apos;s number</span>
          <input className="input" style={{ maxWidth: 190, marginLeft: "auto", minHeight: 40, textAlign: "right" }} type="tel" placeholder="+44 …" value={s.assistant.phone} onChange={(e) => actions.setSettings({ ...s, assistant: { ...s.assistant, phone: e.target.value } })} onBlur={(e) => void saveSetting({ assistant: { phone: e.target.value } })} aria-label="Assistant's number" />
        </div>
        <Toggle label="Buy kit items for me" on={s.assistant.autoBuy} onChange={(autoBuy) => void saveSetting({ assistant: { autoBuy } })} />
        <Toggle label="Remind me at set-up time" sub={friendlyTime(s.eveningReminder ?? "21:00")} on={s.assistant.remindSetup} onChange={(remindSetup) => void saveSetting({ assistant: { remindSetup } })} />
        <Toggle label="Warn me before busy nights" on={s.assistant.warnBusy} onChange={(warnBusy) => void saveSetting({ assistant: { warnBusy } })} />
      </div>

      <div className="eyebrow">Reminders</div>
      <div className="list">
        <Toggle label="Push notifications on this device" on={data.user.pushEnabled} onChange={() => void togglePush()} sub={!data.pushAvailable ? "not configured on the server" : pushBusy ? "…" : undefined} />
        <div className="list-row">
          <span>Evening nudge</span>
          <select className="input" style={{ maxWidth: 130, marginLeft: "auto", minHeight: 40 }} value={s.eveningReminder ?? ""} onChange={(e) => void saveSetting({ eveningReminder: e.target.value || null })} aria-label="Evening nudge time">
            <option value="">Off</option>
            {["18:00", "18:30", "19:00", "19:30", "20:00", "20:30", "21:00", "21:30", "22:00", "22:30"].map((t) => (
              <option key={t} value={t}>{t}</option>
            ))}
          </select>
        </div>
        <div className="list-row">
          <span>Morning &quot;how did it go?&quot;</span>
          <select className="input" style={{ maxWidth: 130, marginLeft: "auto", minHeight: 40 }} value={s.morningReminder ?? ""} onChange={(e) => void saveSetting({ morningReminder: e.target.value || null })} aria-label="Morning nudge time">
            <option value="">Off</option>
            {["06:30", "07:00", "07:30", "08:00", "08:30", "09:00"].map((t) => (
              <option key={t} value={t}>{t}</option>
            ))}
          </select>
        </div>
        <Row label="Timezone" value={s.timezone} onClick={s.timezone !== timezone() ? () => void saveSetting({ timezone: timezone() }) : undefined} sub={s.timezone !== timezone() ? `tap to use ${timezone()}` : undefined} />
      </div>

      <div className="eyebrow">Co-parents and community</div>
      <div className="list">
        <Row label="Everyone on this elf" value={data.family.members.map((m) => m.displayName).join(", ")} />
        <Row label="Family code" value={<span className="code">{data.family.inviteCode}</span>} onClick={() => setSheet("family")} />
        <Row label="Your name" value={displayName} onClick={() => setSheet("family")} />
        <Row label="Elf page handle" value={`@${handle}`} onClick={() => setSheet("family")} />
        <Link href="/settings/badges" className="list-row">
          <span>Badges</span>
          <span className="right">{data.badges.filter((b) => b.awardedAt).length} of {data.badges.length}</span>
        </Link>
      </div>

      <div className="eyebrow">Lock</div>
      <div className="list">
        <div className="list-row">
          <span>Lock after being in the background for</span>
          <select className="input" style={{ maxWidth: 130, marginLeft: "auto", minHeight: 40 }} value={lockAfter} onChange={(e) => { const v = Number(e.target.value); setLockAfter(v); localStorage.setItem(LOCK_KEY, String(v)); }} aria-label="Lock delay">
            <option value={0}>Straight away</option>
            <option value={30}>30 seconds</option>
            <option value={60}>1 minute</option>
            <option value={300}>5 minutes</option>
            <option value={1800}>30 minutes</option>
          </select>
        </div>
        <Row label="Change PIN" onClick={() => setSheet("pin")} />
        <Row label="Lock now" onClick={actions.lock} />
        <Row label="Sign out" value={data.user.email} onClick={() => void api.logout().then(() => router.replace("/login"))} />
      </div>
      <p className="muted small center">Trick or Tinsel · model {data.model}</p>

      {sheet === "elves" && (
        <Sheet eyebrow="Your elves" title="Who's on the night shift?" onClose={() => setSheet("none")}>
          <ElfEditor elves={p.elves.length ? p.elves : [{ name: "", personality: "", color: "elf1" }]} onChange={(elves) => set("elves", elves)} />
          <p className="muted small">Each elf keeps its colour everywhere: avatar, pins, calendar dots and kit tags.</p>
          <button className="btn primary full" onClick={() => void saveProfile()}>Save</button>
        </Sheet>
      )}

      {sheet === "house" && (
        <Sheet eyebrow="House rules" title="How far can the elves go?" onClose={() => setSheet("none")}>
          <div className="eyebrow">Kids&apos; ages</div>
          <div className="chips">
            {BANDS.map((b) => (
              <button key={b.key} className={`chip ${p.ageBands.includes(b.key) ? "on" : ""}`} aria-pressed={p.ageBands.includes(b.key)} onClick={() => set("ageBands", p.ageBands.includes(b.key) ? p.ageBands.filter((x) => x !== b.key) : [...p.ageBands, b.key])}>{b.label}</button>
            ))}
          </div>
          <div className="eyebrow">Kids&apos; names (never shared)</div>
          <textarea className="input" rows={2} placeholder={"Ava 7\nMax 4"} defaultValue={p.kids.map((k) => (k.age ? `${k.name} ${k.age}` : k.name)).join("\n")} onChange={(e) => set("kids", e.target.value.split("\n").map((l) => l.trim()).filter(Boolean).map((l) => { const m = l.match(/^(.*?)[\s,]+(\d{1,2})$/); return m ? { name: m[1].trim(), age: Number(m[2]) } : { name: l, age: null }; }))} />
          <div className="between"><span className="eyebrow">Spook level</span><strong>{p.spookLevel} / 5</strong></div>
          <div className="dial">{[1, 2, 3, 4, 5].map((n) => <button key={n} className={n <= p.spookLevel ? "on" : ""} onClick={() => set("spookLevel", n)} aria-label={`Spook ${n}`} />)}</div>
          <div className="between"><span className="eyebrow">Chaos level</span><strong>{p.chaosLevel} / 5</strong></div>
          <div className="dial">{[1, 2, 3, 4, 5].map((n) => <button key={n} className={n <= p.chaosLevel ? "on" : ""} onClick={() => set("chaosLevel", n)} aria-label={`Chaos ${n}`} />)}</div>
          <div className="eyebrow">Most time you&apos;ll give it at 11pm</div>
          <div className="option-grid">{[5, 10, 20, 30].map((m) => <button key={m} className={`option ${p.maxSetupMinutes === m ? "on" : ""}`} onClick={() => set("maxSetupMinutes", m)}>{m} min</button>)}</div>
          <div className="eyebrow">Mess tolerance</div>
          <Segment options={[{ key: "low" as const, label: "Low" }, { key: "medium" as const, label: "Medium" }, { key: "high" as const, label: "High" }]} value={p.messTolerance} onChange={(v) => set("messTolerance", v)} />
          <div className="field"><span className="eyebrow">Supplies you usually have</span><textarea className="input" rows={2} value={p.supplies} onChange={(e) => set("supplies", e.target.value)} /></div>
          <div className="field"><span className="eyebrow">Off limits and house rules</span><textarea className="input" rows={3} placeholder="e.g. nothing in the baby's room, no flour on the carpet, OK to cut up old socks" value={p.offLimits} onChange={(e) => set("offLimits", e.target.value)} /></div>
          <div className="field"><span className="eyebrow">Anything else the elves should know</span><textarea className="input" rows={2} value={p.notes} onChange={(e) => set("notes", e.target.value)} /></div>
          <div className="row">
            <div className="field grow"><span className="eyebrow">Season starts</span><input className="input" value={p.seasonStart} onChange={(e) => set("seasonStart", e.target.value)} placeholder="12-01" /></div>
            <div className="field grow"><span className="eyebrow">Season ends</span><input className="input" value={p.seasonEnd} onChange={(e) => set("seasonEnd", e.target.value)} placeholder="12-24" /></div>
          </div>
          <button className="btn primary full" onClick={() => void saveProfile()}>Save</button>
        </Sheet>
      )}

      {sheet === "family" && (
        <Sheet eyebrow="Co-parents" title="Your family" onClose={() => setSheet("none")}>
          <p className="body">Your partner signs up with this code and gets the same house, plan, log and elves. Whoever is up at 11pm sees the same thing.</p>
          <p className="body">Family code: <strong className="code">{data.family.inviteCode}</strong></p>
          <div className="field"><span className="eyebrow">Your name</span><input className="input" value={displayName} onChange={(e) => setDisplayName(e.target.value)} /></div>
          <div className="field"><span className="eyebrow">Elf page handle</span><input className="input" value={handle} onChange={(e) => setHandle(e.target.value.toLowerCase())} /></div>
          <button className="btn primary full" onClick={() => void saveProfile()}>Save</button>
          {data.family.members.length === 1 && data.stats.nightsDone === 0 && data.rooms.length === 0 && (
            <>
              <div className="eyebrow">Or join your partner&apos;s elf instead</div>
              <div className="row">
                <input className="input" placeholder="Their family code" value={familyCode} onChange={(e) => setFamilyCode(e.target.value.toUpperCase())} />
                <button className="btn" disabled={!familyCode} onClick={() => void api.joinFamily(familyCode).then(() => actions.reload()).then(() => setSheet("none")).catch((e) => setError(errorMessage(e)))}>Join</button>
              </div>
            </>
          )}
        </Sheet>
      )}

      {sheet === "pin" && (
        <Sheet title="Change PIN" onClose={() => setSheet("none")}>
          <input className="input" inputMode="numeric" placeholder="Current PIN" value={oldPin} onChange={(e) => setOldPin(e.target.value)} aria-label="Current PIN" />
          <input className="input" inputMode="numeric" placeholder="New PIN (4 to 8 digits)" value={newPin} onChange={(e) => setNewPin(e.target.value)} aria-label="New PIN" />
          <button className="btn primary full" disabled={!oldPin || !newPin} onClick={() => void api.setPin(newPin, oldPin).then(() => { actions.toast("PIN changed."); setSheet("none"); setOldPin(""); setNewPin(""); }).catch((e) => setError(errorMessage(e)))}>Change PIN</button>
        </Sheet>
      )}
    </div>
  );
}
