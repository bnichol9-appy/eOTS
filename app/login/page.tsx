"use client";
import { APP_NAME } from "@/lib/brand";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Eye, EyeOff, Moon, Users } from "lucide-react";
import { Garland, Segment } from "@/components/ui";
import { api } from "@/lib/client/api";
import { errorMessage, timezone } from "@/lib/client/utils";

export default function LoginPage() {
  const router = useRouter();
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [elfName, setElfName] = useState("");
  const [familyCode, setFamilyCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [invited, setInvited] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  // Worked out in the browser only, so the server and the phone never disagree about the date.
  const [sleeps, setSleeps] = useState(0);
  useEffect(() => {
    const today = new Date();
    const year = today.getMonth() === 11 && today.getDate() > 24 ? today.getFullYear() + 1 : today.getFullYear();
    setSleeps(Math.ceil((new Date(year, 11, 1).getTime() - today.getTime()) / 86_400_000));
  }, []);

  // Arriving from an invite link: /login?mode=signup&code=FAM-XXXX-XXXX
  useEffect(() => {
    const sp = new URLSearchParams(window.location.search);
    if (sp.get("mode") === "signup") setMode("signup");
    const code = (sp.get("code") ?? "").toUpperCase();
    if (code.startsWith("FAM-")) {
      setFamilyCode(code);
      setInvited(true);
    }
  }, []);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      if (mode === "login") await api.login(email, password);
      else await api.signup({ email, password, displayName, elfName, familyCode, timezone: timezone() });
      router.replace("/");
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  const signup = mode === "signup";

  return (
    <div className="screen login">
      <header className="login-head">
        <Garland />
        <div className="brand">{APP_NAME}</div>
      </header>

      <div className="login-photos" aria-hidden="true">
        {["living-room", "hallway", "kitchen"].map((n) => (
          // eslint-disable-next-line @next/next/no-img-element
          <img key={n} src={`/placeholders/${n}.jpg`} alt="" />
        ))}
      </div>

      <div>
        {sleeps > 0 && sleeps < 60 && (
          <span className="sleeps-pill">
            <Moon size={14} strokeWidth={1.8} aria-hidden="true" /> {sleeps} {sleeps === 1 ? "sleep" : "sleeps"} until the elves arrive
          </span>
        )}
        <h1 className="onb-title">{!signup ? "Welcome back" : invited ? "Join the night shift" : "Start the night shift"}</h1>
        <p className="body">One elf set-up per night, built from photos of your own house.</p>
      </div>

      <Segment
        options={[
          { key: "login" as const, label: "Sign in" },
          { key: "signup" as const, label: "Create account" },
        ]}
        value={mode}
        onChange={(m) => {
          setMode(m);
          setError(null);
        }}
      />

      <form className="countdown auth-card" onSubmit={submit}>
        {signup && invited && (
          <div className="invited-note">
            <Users size={18} strokeWidth={1.8} aria-hidden="true" />
            <span>You&apos;re joining your partner&apos;s elf. Just add your own details.</span>
          </div>
        )}
        {signup && (
          <>
            <label className="field">
              <span className="eyebrow">Your name</span>
              <input className="input" placeholder="Other parents see this" value={displayName} onChange={(e) => setDisplayName(e.target.value)} required autoComplete="name" />
            </label>
            {!familyCode && (
              <label className="field">
                <span className="eyebrow">Your elf&apos;s name</span>
                <input className="input" placeholder="e.g. Pip" value={elfName} onChange={(e) => setElfName(e.target.value)} />
              </label>
            )}
          </>
        )}
        <label className="field">
          <span className="eyebrow">Email</span>
          <input className="input" type="email" placeholder="you@example.com" value={email} onChange={(e) => setEmail(e.target.value)} required autoComplete="email" />
        </label>
        <label className="field">
          <span className="eyebrow">Password</span>
          <span className="password-wrap">
            <input
              className="input"
              type={showPassword ? "text" : "password"}
              placeholder={signup ? "8 or more characters" : "Your password"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              autoComplete={signup ? "new-password" : "current-password"}
            />
            <button type="button" className="password-toggle" onClick={() => setShowPassword(!showPassword)} aria-label={showPassword ? "Hide password" : "Show password"}>
              {showPassword ? <EyeOff size={18} strokeWidth={1.8} /> : <Eye size={18} strokeWidth={1.8} />}
            </button>
          </span>
        </label>
        {signup && !invited && (
          <details className="at-home family-code" open={Boolean(familyCode)}>
            <summary>Joining your partner&apos;s elf?</summary>
            <label className="field">
              <span className="muted small">Type their family code (it&apos;s in their Settings), or ask them to send you an invite link.</span>
              <input className="input" placeholder="FAM-XXXX-XXXX" value={familyCode} onChange={(e) => setFamilyCode(e.target.value.toUpperCase())} aria-label="Family code" />
            </label>
          </details>
        )}
        {error && <p className="error">{error}</p>}
        <button className="btn primary large full" disabled={busy}>
          {busy ? "One moment…" : signup ? "Create account" : "Sign in"}
        </button>
      </form>

      <p className="muted small center">Your house photos stay private to your family. A PIN keeps the kids out.</p>
    </div>
  );
}
