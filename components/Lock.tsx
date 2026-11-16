"use client";
import { useEffect, useState } from "react";
import { api, ApiError } from "@/lib/client/api";

export function Lock({ mode, onUnlocked, waitSeconds = 0 }: { mode: "unlock" | "create"; onUnlocked: () => void; waitSeconds?: number }) {
  const [pin, setPin] = useState("");
  const [confirm, setConfirm] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [wait, setWait] = useState(waitSeconds);
  const [busy, setBusy] = useState(false);

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
        if (err.waitSeconds) setWait(err.waitSeconds);
      } else setError("Something went wrong");
    } finally {
      setBusy(false);
    }
  }

  function press(d: string) {
    if (wait > 0 || busy) return;
    setPin((p) => (p + d).slice(0, 8));
  }

  const title = mode === "unlock" ? "Enter PIN" : confirm === null ? "Create a PIN" : "Confirm your PIN";

  return (
    <div className="screen lock">
      <div className="lock-elf">🧝</div>
      <h1>eOTS</h1>
      <p className="muted">{mode === "create" && confirm === null ? "Pick a 4 to 8 digit PIN. This is what stops the kids getting in." : title}</p>
      <div className="pin-dots">
        {Array.from({ length: Math.max(4, pin.length) }, (_, i) => (
          <i key={i} className={i < pin.length ? "on" : ""} />
        ))}
      </div>
      {error && <p className="error">{error}</p>}
      {wait > 0 && <p className="error">Locked for {wait}s</p>}
      <div className="keypad">
        {["1", "2", "3", "4", "5", "6", "7", "8", "9"].map((d) => (
          <button key={d} onClick={() => press(d)}>
            {d}
          </button>
        ))}
        <button className="key-soft" onClick={() => setPin((p) => p.slice(0, -1))}>
          ⌫
        </button>
        <button onClick={() => press("0")}>0</button>
        <button className="key-go" disabled={pin.length < 4 || busy} onClick={() => void submit(pin)}>
          {busy ? "…" : "✓"}
        </button>
      </div>
    </div>
  );
}
