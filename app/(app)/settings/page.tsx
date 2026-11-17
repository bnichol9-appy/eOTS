"use client";
import { APP_NAME } from "@/lib/brand";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  AtSign,
  Award,
  Bell,
  CalendarClock,
  ChevronRight,
  Clock,
  Globe,
  KeyRound,
  Lock,
  LogOut,
  MessageSquare,
  Moon,
  Phone,
  Plus,
  ShoppingBag,
  Sun,
  Timer,
  Trash2,
  User,
  Users,
  type LucideIcon,
} from "lucide-react";
import { useEffect, useState } from "react";
import { InviteShare } from "@/components/InviteShare";
import { familyInviteText, inviteLink } from "@/lib/invite";
import { useApp } from "@/components/AppContext";
import { ElfEditor } from "@/components/ElfEditor";
import { Checkbox, ElfAvatar, Segment, Sheet, Topbar } from "@/components/ui";
import { SectionHead } from "@/components/home/Sections";
import { friendlyTime } from "@/lib/assistant";
import { api } from "@/lib/client/api";
import { currentPushEndpoint, errorMessage, LOCK_KEY, lockAfterSeconds, subscribeToPush, timezone } from "@/lib/client/utils";
import type { AgeBand, Profile } from "@/lib/types";

const SM = { size: 18, strokeWidth: 1.8 };
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
  const [sheet, setSheet] = useState<"none" | "elves" | "house" | "pin" | "family" | "delete">("none");
  useEffect(() => {
    const s = new URLSearchParams(window.location.search).get("sheet");
    if (s === "family" || s === "elves") setSheet(s);
  }, []);
  const [deletePassword, setDeletePassword] = useState("");
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
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

  const Row = ({ icon: Icon, label, value, onClick, sub, href }: { icon?: LucideIcon; label: React.ReactNode; value?: React.ReactNode; onClick?: () => void; sub?: string; href?: string }) => {
    const inner = (
      <>
        {Icon && <Icon {...SM} className="row-icon" aria-hidden="true" />}
        <span className="row-label">
          {label}
          {sub && <span className="row-sub">{sub}</span>}
        </span>
        {value !== undefined && <span className="right">{value}</span>}
        {(onClick || href) && <ChevronRight {...SM} className="muted row-chevron" aria-hidden="true" />}
      </>
    );
    return href ? (
      <Link href={href} className="list-row set-row">
        {inner}
      </Link>
    ) : (
      <button className="list-row set-row" onClick={onClick} disabled={!onClick}>
        {inner}
      </button>
    );
  };
  const Toggle = ({ icon: Icon, label, on, onChange, sub, disabled }: { icon?: LucideIcon; label: string; on: boolean; onChange: (v: boolean) => void; sub?: string; disabled?: boolean }) => (
    <button className="list-row set-row" role="switch" aria-checked={on} onClick={() => onChange(!on)} disabled={disabled}>
      {Icon && <Icon {...SM} className="row-icon" aria-hidden="true" />}
      <span className="row-label">
        {label}
        {sub && <span className="row-sub">{sub}</span>}
      </span>
      <span className={`switch ${on ? "on" : ""}`} aria-hidden="true">
        <i />
      </span>
    </button>
  );
  const Select = ({
    icon: Icon,
    label,
    value,
    onChange,
    options,
    sub,
  }: {
    icon?: LucideIcon;
    label: string;
    value: string;
    onChange: (v: string) => void;
    options: { value: string; label: string }[];
    sub?: string;
  }) => (
    <div className="list-row set-row">
      {Icon && <Icon {...SM} className="row-icon" aria-hidden="true" />}
      <span className="row-label">
        {label}
        {sub && <span className="row-sub">{sub}</span>}
      </span>
      <select className="input set-select" value={value} onChange={(e) => onChange(e.target.value)} aria-label={label}>
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </div>
  );

  const elves = data.profile.elves;
  const parents = data.family.members.map((m) => m.displayName.split(" ")[0]);
  const earned = data.badges.filter((b) => b.awardedAt).length;
  const timeOpts = (times: string[]) => [{ value: "", label: "Off" }, ...times.map((t) => ({ value: t, label: friendlyTime(t) }))];
  const seasonLabel = (mmdd: string) => new Date(`2000-${mmdd}T12:00:00`).toLocaleDateString(undefined, { day: "numeric", month: "short" });

  return (
    <div className="screen home">
      <Topbar eyebrow={data.user.email} title="Settings" back={() => router.back()} />
      {error && <p className="error">{error}</p>}

      <section className="countdown family-card" aria-label="Your family">
        <div className="family-top">
          <div className="family-elves" aria-hidden="true">
            {(elves.length ? elves : [{ name: "?", personality: "", color: "elf1" as const }]).map((e) => (
              <ElfAvatar key={e.name} elf={e} size="xl" />
            ))}
          </div>
          <div className="grow">
            <div className="eyebrow">Your elf family</div>
            <h2 className="card-title">{elves.length ? elves.map((e) => e.name).join(" & ") : "No elves yet"}</h2>
            <p className="muted small">Run by {parents.join(" and ")}</p>
          </div>
        </div>
        <div className="invite-row">
          <button className="btn" onClick={() => setSheet("elves")}>
            {elves.length < 3 ? "Edit or add elves" : "Edit elves"}
          </button>
          <button className="btn" onClick={() => setSheet("family")}>
            {data.family.members.length > 1 ? "Your family" : "Invite co-parent"}
          </button>
        </div>
      </section>

      <section aria-label="Your elves">
        <SectionHead title="Your elves" />
        <div className="list">
          {elves.map((e) => (
            <button key={e.name} className="list-row set-row" onClick={() => setSheet("elves")}>
              <ElfAvatar elf={e} size="l" />
              <span className="row-label">
                <strong>{e.name}</strong>
                <span className="row-sub">{e.personality || "No personality yet. Tap to give them one."}</span>
              </span>
              <ChevronRight {...SM} className="muted row-chevron" aria-hidden="true" />
            </button>
          ))}
          {elves.length < 3 && <Row icon={Plus} label={<span className="acc bold">Add an elf</span>} onClick={() => setSheet("elves")} />}
        </div>
      </section>

      <section aria-label="House rules">
        <SectionHead title="House rules" />
        <div className="rule-grid">
          {[
            { label: "Kids' ages", value: p.ageBands.map((b) => BANDS.find((x) => x.key === b)?.label).join(", ") || "Not set" },
            { label: "Spook", value: `${p.spookLevel} / 5` },
            { label: "Chaos", value: `${p.chaosLevel} / 5` },
            { label: "Mess", value: p.messTolerance.charAt(0).toUpperCase() + p.messTolerance.slice(1) },
            { label: "Time at 11pm", value: `${p.maxSetupMinutes} min` },
            { label: "Season", value: `${seasonLabel(p.seasonStart)} to ${seasonLabel(p.seasonEnd)}` },
          ].map((t) => (
            <button key={t.label} className="tile rule-tile" onClick={() => setSheet("house")}>
              <span className="meta">{t.label}</span>
              <strong>{t.value}</strong>
            </button>
          ))}
        </div>
        {(p.offLimits || p.kids.length > 0) && (
          <p className="muted small">
            {p.kids.length > 0 && `Kids: ${p.kids.map((k) => k.name).join(", ")}. `}
            {p.offLimits && `Off limits: ${p.offLimits}`}
          </p>
        )}
      </section>

      <section aria-label="Reminders">
        <SectionHead title="Reminders" />
        <div className="list">
          <Toggle
            icon={Bell}
            label="Notifications on this device"
            on={data.user.pushEnabled}
            onChange={() => void togglePush()}
            disabled={pushBusy || !data.pushAvailable}
            sub={!data.pushAvailable ? "Not set up on the server yet" : pushBusy ? "Working…" : data.user.pushEnabled ? "On. You'll get nudges here." : "Off. Turn on to get nudges."}
          />
          <Select
            icon={Moon}
            label="Evening nudge"
            sub="If tonight isn't planned yet"
            value={s.eveningReminder ?? ""}
            onChange={(v) => void saveSetting({ eveningReminder: v || null })}
            options={timeOpts(["18:00", "18:30", "19:00", "19:30", "20:00", "20:30", "21:00", "21:30", "22:00", "22:30"])}
          />
          <Select
            icon={Sun}
            label="Morning check-in"
            sub="How did it go?"
            value={s.morningReminder ?? ""}
            onChange={(v) => void saveSetting({ morningReminder: v || null })}
            options={timeOpts(["06:30", "07:00", "07:30", "08:00", "08:30", "09:00"])}
          />
          <Row
            icon={Globe}
            label="Timezone"
            value={s.timezone}
            onClick={s.timezone !== timezone() ? () => void saveSetting({ timezone: timezone() }) : undefined}
            sub={s.timezone !== timezone() ? `Tap to switch to ${timezone()}` : undefined}
          />
        </div>
      </section>

      <section aria-label="AI assistant">
        <SectionHead title="AI assistant" />
        <p className="muted small">Hand jobs to your assistant: it opens {s.assistant.channel === "whatsapp" ? "WhatsApp" : "Messages"} with the text ready and you tap send.</p>
        <div className="list">
          <Row
            icon={MessageSquare}
            label="Send via"
            value={<strong className="text">{s.assistant.channel === "whatsapp" ? "WhatsApp" : "iMessage"}</strong>}
            onClick={() => void saveSetting({ assistant: { channel: s.assistant.channel === "whatsapp" ? "imessage" : "whatsapp" } })}
          />
          <div className="list-row set-row">
            <Phone {...SM} className="row-icon" aria-hidden="true" />
            <span className="row-label">Assistant&apos;s number</span>
            <input
              className="input set-select"
              type="tel"
              placeholder="+44 …"
              value={s.assistant.phone}
              onChange={(e) => actions.setSettings({ ...s, assistant: { ...s.assistant, phone: e.target.value } })}
              onBlur={(e) => void saveSetting({ assistant: { phone: e.target.value } })}
              aria-label="Assistant's number"
            />
          </div>
          <Toggle icon={ShoppingBag} label="Buy kit items for me" on={s.assistant.autoBuy} onChange={(autoBuy) => void saveSetting({ assistant: { autoBuy } })} />
          <Toggle
            icon={Clock}
            label="Remind me at set-up time"
            sub={friendlyTime(s.eveningReminder ?? "21:00")}
            on={s.assistant.remindSetup}
            onChange={(remindSetup) => void saveSetting({ assistant: { remindSetup } })}
          />
          <Toggle icon={CalendarClock} label="Warn me before busy nights" on={s.assistant.warnBusy} onChange={(warnBusy) => void saveSetting({ assistant: { warnBusy } })} />
        </div>
      </section>

      <section aria-label="Family and community">
        <SectionHead title="Family and community" />
        <div className="list">
          <Row
            icon={Users}
            label="Invite your co-parent"
            sub={data.family.members.length > 1 ? data.family.members.map((m) => m.displayName).join(", ") : "Send them a link on WhatsApp"}
            onClick={() => setSheet("family")}
          />
          <Row icon={User} label="Your name" value={displayName} onClick={() => setSheet("family")} />
          <Row icon={AtSign} label="Elf page" value={`@${handle}`} href={`/ideas/elf/${handle}`} />
          <Row icon={Award} label="Badges" value={`${earned} of ${data.badges.length}`} href="/settings/badges" />
        </div>
      </section>

      <section aria-label="Appearance">
        <SectionHead title="Appearance" />
        <Segment
          options={[
            { key: "light" as const, label: "Light" },
            { key: "dark" as const, label: "Dark" },
            { key: "system" as const, label: "Match phone" },
          ]}
          value={s.theme}
          onChange={(theme) => void saveSetting({ theme })}
        />
      </section>

      <section aria-label="Lock and account">
        <SectionHead title="Lock and account" />
        <div className="list">
          <Select
            icon={Timer}
            label="Auto-lock"
            sub="When you leave the app"
            value={String(lockAfter)}
            onChange={(v) => {
              const n = Number(v);
              setLockAfter(n);
              try {
                localStorage.setItem(LOCK_KEY, String(n));
              } catch {
                /* private mode */
              }
            }}
            options={[
              { value: "0", label: "Straight away" },
              { value: "30", label: "After 30 sec" },
              { value: "60", label: "After 1 min" },
              { value: "300", label: "After 5 min" },
              { value: "1800", label: "After 30 min" },
            ]}
          />
          <Row icon={KeyRound} label="Change PIN" onClick={() => setSheet("pin")} />
          <Row icon={Lock} label="Lock now" onClick={actions.lock} />
          <Row icon={LogOut} label="Sign out" onClick={() => void api.logout().then(() => router.replace("/login"))} />
          <Row
            icon={Trash2}
            label={<span className="acc">Delete account</span>}
            onClick={() => {
              setDeletePassword("");
              setDeleteError(null);
              setSheet("delete");
            }}
          />
        </div>
      </section>
      <p className="muted small center">
        {APP_NAME} · model {data.model}
      </p>

      {sheet === "elves" && (
        <Sheet eyebrow="Your elves" title="Who's on the night shift?" onClose={() => setSheet("none")}>
          <ElfEditor elves={p.elves.length ? p.elves : [{ name: "", personality: "", color: "elf1" }]} onChange={(elves) => set("elves", elves)} />
          <p className="muted small">Each elf keeps its colour everywhere: avatar, pins, calendar dots and kit tags.</p>
          <button className="btn primary full" onClick={() => void saveProfile()}>
            Save
          </button>
        </Sheet>
      )}

      {sheet === "house" && (
        <Sheet eyebrow="House rules" title="How far can the elves go?" onClose={() => setSheet("none")}>
          <div className="eyebrow">Kids&apos; ages</div>
          <div className="chips">
            {BANDS.map((b) => (
              <button
                key={b.key}
                className={`chip ${p.ageBands.includes(b.key) ? "on" : ""}`}
                aria-pressed={p.ageBands.includes(b.key)}
                onClick={() => set("ageBands", p.ageBands.includes(b.key) ? p.ageBands.filter((x) => x !== b.key) : [...p.ageBands, b.key])}
              >
                {b.label}
              </button>
            ))}
          </div>
          <div className="eyebrow">Kids&apos; names (never shared)</div>
          <textarea
            className="input"
            rows={2}
            placeholder={"Ava 7\nMax 4"}
            defaultValue={p.kids.map((k) => (k.age ? `${k.name} ${k.age}` : k.name)).join("\n")}
            onChange={(e) =>
              set(
                "kids",
                e.target.value
                  .split("\n")
                  .map((l) => l.trim())
                  .filter(Boolean)
                  .map((l) => {
                    const m = l.match(/^(.*?)[\s,]+(\d{1,2})$/);
                    return m ? { name: m[1].trim(), age: Number(m[2]) } : { name: l, age: null };
                  }),
              )
            }
          />
          <div className="between">
            <span className="eyebrow">Spook level</span>
            <strong>{p.spookLevel} / 5</strong>
          </div>
          <div className="dial">
            {[1, 2, 3, 4, 5].map((n) => (
              <button key={n} className={n <= p.spookLevel ? "on" : ""} onClick={() => set("spookLevel", n)} aria-label={`Spook ${n}`} />
            ))}
          </div>
          <div className="between">
            <span className="eyebrow">Chaos level</span>
            <strong>{p.chaosLevel} / 5</strong>
          </div>
          <div className="dial">
            {[1, 2, 3, 4, 5].map((n) => (
              <button key={n} className={n <= p.chaosLevel ? "on" : ""} onClick={() => set("chaosLevel", n)} aria-label={`Chaos ${n}`} />
            ))}
          </div>
          <div className="eyebrow">Most time you&apos;ll give it at 11pm</div>
          <div className="option-grid">
            {[5, 10, 20, 30].map((m) => (
              <button key={m} className={`option ${p.maxSetupMinutes === m ? "on" : ""}`} onClick={() => set("maxSetupMinutes", m)}>
                {m} min
              </button>
            ))}
          </div>
          <div className="eyebrow">Mess tolerance</div>
          <Segment
            options={[
              { key: "low" as const, label: "Low" },
              { key: "medium" as const, label: "Medium" },
              { key: "high" as const, label: "High" },
            ]}
            value={p.messTolerance}
            onChange={(v) => set("messTolerance", v)}
          />
          <div className="field">
            <span className="eyebrow">Supplies you usually have</span>
            <textarea className="input" rows={2} value={p.supplies} onChange={(e) => set("supplies", e.target.value)} />
          </div>
          <div className="field">
            <span className="eyebrow">Off limits and house rules</span>
            <textarea
              className="input"
              rows={3}
              placeholder="e.g. nothing in the baby's room, no flour on the carpet, OK to cut up old socks"
              value={p.offLimits}
              onChange={(e) => set("offLimits", e.target.value)}
            />
          </div>
          <div className="field">
            <span className="eyebrow">Anything else the elves should know</span>
            <textarea className="input" rows={2} value={p.notes} onChange={(e) => set("notes", e.target.value)} />
          </div>
          <div className="row">
            <div className="field grow">
              <span className="eyebrow">Season starts</span>
              <input className="input" value={p.seasonStart} onChange={(e) => set("seasonStart", e.target.value)} placeholder="12-01" />
            </div>
            <div className="field grow">
              <span className="eyebrow">Season ends</span>
              <input className="input" value={p.seasonEnd} onChange={(e) => set("seasonEnd", e.target.value)} placeholder="12-24" />
            </div>
          </div>
          <button className="btn primary full" onClick={() => void saveProfile()}>
            Save
          </button>
        </Sheet>
      )}

      {sheet === "family" && (
        <Sheet eyebrow="Co-parents" title="Your family" onClose={() => setSheet("none")}>
          <p className="body">Send your partner this link. They get the same house, plan, log and elves, so whoever is up at 11pm sees the same thing.</p>
          <InviteShare link={inviteLink(data.family.inviteCode)} text={familyInviteText(p.elves.map((e) => e.name).filter(Boolean), inviteLink(data.family.inviteCode))} />
          <p className="muted small">
            Or they can type the family code when they sign up: <strong className="code">{data.family.inviteCode}</strong>
          </p>
          <div className="field">
            <span className="eyebrow">Your name</span>
            <input className="input" value={displayName} onChange={(e) => setDisplayName(e.target.value)} />
          </div>
          <div className="field">
            <span className="eyebrow">Elf page handle</span>
            <input className="input" value={handle} onChange={(e) => setHandle(e.target.value.toLowerCase())} />
          </div>
          <button className="btn primary full" onClick={() => void saveProfile()}>
            Save
          </button>
          {data.family.members.length === 1 && data.stats.nightsDone === 0 && data.rooms.length === 0 && (
            <>
              <div className="eyebrow">Or join your partner&apos;s elf instead</div>
              <div className="row">
                <input className="input" placeholder="Their family code" value={familyCode} onChange={(e) => setFamilyCode(e.target.value.toUpperCase())} />
                <button
                  className="btn"
                  disabled={!familyCode}
                  onClick={() =>
                    void api
                      .joinFamily(familyCode)
                      .then(() => actions.reload())
                      .then(() => setSheet("none"))
                      .catch((e) => setError(errorMessage(e)))
                  }
                >
                  Join
                </button>
              </div>
            </>
          )}
        </Sheet>
      )}

      {sheet === "delete" && (
        <Sheet eyebrow="Account" title="Delete your account?" onClose={() => setSheet("none")}>
          {data.family.members.length > 1 ? (
            <p className="body">
              This removes you, your posts, votes and comments. Your family&apos;s rooms, nights and elves stay with{" "}
              {data.family.members
                .filter((m) => m.id !== data.user.id)
                .map((m) => m.displayName)
                .join(" and ")}
              .
            </p>
          ) : (
            <p className="body">
              This permanently deletes your account and everything in it: your rooms and photos, every planned and logged night, your elves, posts and circles. It can&apos;t be undone.
            </p>
          )}
          <div className="field">
            <span className="eyebrow">Type your password to confirm</span>
            <input className="input" type="password" autoComplete="current-password" value={deletePassword} onChange={(e) => setDeletePassword(e.target.value)} aria-label="Password" />
          </div>
          {deleteError && <p className="error">{deleteError}</p>}
          <button
            className="btn outline-accent full"
            disabled={!deletePassword || deleting}
            onClick={() => {
              setDeleting(true);
              setDeleteError(null);
              void api
                .deleteAccount(deletePassword)
                .then(() => router.replace("/login"))
                .catch((e) => setDeleteError(errorMessage(e)))
                .finally(() => setDeleting(false));
            }}
          >
            {deleting ? "Deleting…" : "Delete my account"}
          </button>
          <button className="btn full" onClick={() => setSheet("none")}>
            Keep my account
          </button>
        </Sheet>
      )}

      {sheet === "pin" && (
        <Sheet title="Change PIN" onClose={() => setSheet("none")}>
          <input className="input" inputMode="numeric" placeholder="Current PIN" value={oldPin} onChange={(e) => setOldPin(e.target.value)} aria-label="Current PIN" />
          <input className="input" inputMode="numeric" placeholder="New PIN (4 to 8 digits)" value={newPin} onChange={(e) => setNewPin(e.target.value)} aria-label="New PIN" />
          <button
            className="btn primary full"
            disabled={!oldPin || !newPin}
            onClick={() =>
              void api
                .setPin(newPin, oldPin)
                .then(() => {
                  actions.toast("PIN changed.");
                  setSheet("none");
                  setOldPin("");
                  setNewPin("");
                })
                .catch((e) => setError(errorMessage(e)))
            }
          >
            Change PIN
          </button>
        </Sheet>
      )}
    </div>
  );
}
