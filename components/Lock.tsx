"use client";
import { Check, Delete, Lock as LockIcon, ShieldCheck } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { api, ApiError } from "@/lib/client/api";

export function Lock({ mode, onUnlocked, waitSeconds = 0 }: { mode: "unlock" | "create"; onUnlocked: () => void; waitSeconds?: number }) {
  const [pin, setPin] = useState("");
  const [confirm, setConfirm] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [wait, setWait] = useState(waitSeconds);
  const [busy, setBusy] = useState(false);
  const [shake, setShake] = useState(0);

  useEffect(() => {
    if (wait <= 0) return;
    const t = setTimeout(() => setWait((w) => w - 1), 1000);
    return () => clearTimeout(t);
  }, [wait]);

  async function submit(value: string) {
    if (busy) return;
    setError(null);
    if (mode === "create") {
      if (confirm === null) {
        setConfirm(value);
        setPin("");
        return;
      }
      if (confirm !== value) {
        setError("PINs didn't match, start again");
        setShake((n) => n + 1);
        setConfirm(null);
        setPin("");
        return;
      }
    }
    setBusy(true);
    try {
      if (mode === "create") await api.setPin(value);
      else await api.unlock(value);
      onUnlocked();
    } catch (err) {
      setPin("");
      if (err instanceof ApiError) {
        setError(err.message);
        setShake((n) => n + 1);
        if (err.waitSeconds) setWait(err.waitSeconds);
      } else setError("Something went wrong");
    } finally {
      setBusy(false);
    }
  }

  const press = useCallback(
    (d: string) => {
      if (wait > 0 || busy) return;
      setError(null);
      setPin((p) => (p + d).slice(0, 8));
    },
    [wait, busy],
  );

  // Laptop keyboards: digits, Backspace and Enter.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (/^[0-9]$/.test(e.key)) press(e.key);
      else if (e.key === "Backspace") setPin((p) => p.slice(0, -1));
      else if (e.key === "Enter" && pin.length >= 4) void submit(pin);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [press, pin]);

  const creating = mode === "create";
  const title = !creating ? "Enter your PIN" : confirm === null ? "Create a PIN" : "Confirm your PIN";
  const sub = !creating ? null : confirm === null ? "4 to 8 digits. This is what stops the kids getting in." : "Type it once more to be sure.";

  return (
    <div className="screen full lock pin-screen">
      <div className="pin-top">
        <span className="pin-icon" aria-hidden="true">
          {creating ? <ShieldCheck size={24} strokeWidth={1.8} /> : <LockIcon size={22} strokeWidth={1.8} />}
        </span>
        {creating && <div className="eyebrow">Step {confirm === null ? 1 : 2} of 2</div>}
        <h1 className="pin-title">{title}</h1>
        {sub && <p className="muted pin-sub">{sub}</p>}
      </div>

      <div key={shake} className={`pin-dots ${shake ? "shake" : ""}`} role="status" aria-label={`${pin.length} digits entered`}>
        {Array.from({ length: Math.max(4, pin.length) }, (_, i) => (
          <i key={i} className={i < pin.length ? "on" : ""} />
        ))}
      </div>
      <p className={`pin-msg ${error || wait > 0 ? "error-text" : ""}`} aria-live="polite">
        {wait > 0 ? `Too many tries. Wait ${wait}s.` : (error ?? " ")}
      </p>

      <div className="keypad">
        {["1", "2", "3", "4", "5", "6", "7", "8", "9"].map((d) => (
          <button key={d} onClick={() => press(d)} aria-label={d} disabled={wait > 0}>
            {d}
          </button>
        ))}
        <button className="key-soft" onClick={() => setPin((p) => p.slice(0, -1))} aria-label="Delete" disabled={pin.length === 0}>
          <Delete size={22} strokeWidth={1.8} />
        </button>
        <button onClick={() => press("0")} aria-label="0" disabled={wait > 0}>
          0
        </button>
        <button className="key-go" disabled={pin.length < 4 || busy || wait > 0} onClick={() => void submit(pin)} aria-label="Confirm">
          <Check size={24} strokeWidth={2.2} />
        </button>
      </div>

      {!creating && (
        <button
          className="link-btn small pin-forgot"
          onClick={() =>
            void api
              .logout()
              .catch(() => {})
              .then(() => window.location.replace("/login"))
          }
        >
          Forgot your PIN? Sign out
        </button>
      )}
    </div>
  );
}
