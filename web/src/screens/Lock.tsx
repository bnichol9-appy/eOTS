import { useEffect, useState } from "react";
import { api, ApiError } from "../api";

export function Lock({ onUnlocked }: { onUnlocked: () => void }) {
  const [setup, setSetup] = useState<boolean | null>(null);
  const [pin, setPin] = useState("");
  const [confirm, setConfirm] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [wait, setWait] = useState(0);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    api
      .authStatus()
      .then((s) => {
        setSetup(s.setup);
        setWait(s.waitSeconds);
      })
      .catch(() => setError("Can't reach the server"));
  }, []);

  useEffect(() => {
    if (wait <= 0) return;
    const t = setTimeout(() => setWait((w) => w - 1), 1000);
    return () => clearTimeout(t);
  }, [wait]);

  async function submit(value: string) {
    if (busy) return;
    setError(null);
    if (setup === false) {
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
      if (setup === false) await api.setupPin(value);
      else await api.login(value);
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
    const next = (pin + d).slice(0, 8);
    setPin(next);
  }

  const title = setup === null ? "eOTS" : setup ? "Enter PIN" : confirm === null ? "Create a PIN" : "Confirm your PIN";

  return (
    <div className="screen lock">
      <div className="lock-elf">🧝</div>
      <h1>eOTS</h1>
      <p className="muted">{setup === false ? "Pick a 4 to 8 digit PIN. The kids never see this screen's other side." : title}</p>
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
