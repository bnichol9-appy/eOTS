"use client";
import { APP_NAME } from "@/lib/brand";
import { useRouter } from "next/navigation";
import { useState } from "react";
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

  return (
    <div className="screen full lock">
      <div className="brand">{APP_NAME}</div>
      <h1>{mode === "login" ? "Welcome back" : "Start the night shift"}</h1>
      <p className="muted">One elf set-up per night, built from photos of your own house.</p>
      <form className="auth-form" onSubmit={submit}>
        {mode === "signup" && (
          <>
            <input className="input" placeholder="Your name (other parents see this)" value={displayName} onChange={(e) => setDisplayName(e.target.value)} required autoComplete="name" />
            {!familyCode && <input className="input" placeholder="Your elf's name" value={elfName} onChange={(e) => setElfName(e.target.value)} />}
            <input className="input" placeholder="Joining your partner's elf? Family code" value={familyCode} onChange={(e) => setFamilyCode(e.target.value.toUpperCase())} />
          </>
        )}
        <input className="input" type="email" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} required autoComplete="email" />
        <input
          className="input"
          type="password"
          placeholder={mode === "signup" ? "Password (8+ characters)" : "Password"}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          autoComplete={mode === "signup" ? "new-password" : "current-password"}
        />
        {error && <p className="error">{error}</p>}
        <button className="btn primary large full" disabled={busy}>
          {busy ? "…" : mode === "login" ? "Sign in" : "Create account"}
        </button>
        <button type="button" className="link-btn" onClick={() => setMode(mode === "login" ? "signup" : "login")}>
          {mode === "login" ? "New here? Create an account" : "Already have an account? Sign in"}
        </button>
      </form>
    </div>
  );
}
