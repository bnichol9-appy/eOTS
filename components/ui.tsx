"use client";
import { useEffect, useState, type ReactNode } from "react";

export function Meter({ label, value, max = 5, icon }: { label: string; value: number; max?: number; icon: string }) {
  return (
    <span className="meter" title={`${label} ${value}/${max}`}>
      <span className="meter-icon">{icon}</span>
      <span className="meter-dots">
        {Array.from({ length: max }, (_, i) => (
          <i key={i} className={i < value ? "on" : ""} />
        ))}
      </span>
    </span>
  );
}

export function Meters({ chaos, mess, minutes }: { chaos: number; mess: number; minutes: number }) {
  return (
    <div className="meters">
      <Meter label="Chaos" value={chaos} icon="🔥" />
      <Meter label="Mess" value={mess} icon="🧹" />
      <span className="meter">
        <span className="meter-icon">⏱</span> {minutes} min
      </span>
    </div>
  );
}

export function Chips({ options, value, onChange, multi = false }: { options: string[]; value: string[]; onChange: (v: string[]) => void; multi?: boolean }) {
  return (
    <div className="chips">
      {options.map((o) => {
        const on = value.includes(o);
        return (
          <button
            key={o}
            type="button"
            className={`chip ${on ? "on" : ""}`}
            onClick={() => {
              if (multi) onChange(on ? value.filter((v) => v !== o) : [...value, o]);
              else onChange(on ? [] : [o]);
            }}
          >
            {o}
          </button>
        );
      })}
    </div>
  );
}

const LINES = [
  "The elf is casing the joint…",
  "Measuring the hallway for toilet paper…",
  "Checking which socks are expendable…",
  "Consulting the naughty list (for inspiration)…",
  "Testing string strength for a zip line…",
  "Counting cushions…",
  "Drawing up a crime scene…",
  "Asking other elves what worked…",
];

export function Working({ label }: { label?: string }) {
  const [i, setI] = useState(0);
  useEffect(() => {
    setI(Math.floor(Math.random() * LINES.length));
    const t = setInterval(() => setI((n) => (n + 1) % LINES.length), 2200);
    return () => clearInterval(t);
  }, []);
  return (
    <div className="working">
      <div className="spinner" />
      <p>{label ?? LINES[i]}</p>
    </div>
  );
}

export function Sheet({ title, onClose, children }: { title: string; onClose: () => void; children: ReactNode }) {
  return (
    <div className="sheet-backdrop" onClick={onClose}>
      <div className="sheet" onClick={(e) => e.stopPropagation()}>
        <div className="sheet-head">
          <h2>{title}</h2>
          <button className="icon-btn" onClick={onClose} aria-label="Close">
            ✕
          </button>
        </div>
        <div className="sheet-body">{children}</div>
      </div>
    </div>
  );
}

export function PageHead({ title, sub, left, right }: { title: string; sub?: ReactNode; left?: ReactNode; right?: ReactNode }) {
  return (
    <header className={`page-head ${left || right ? "with-controls" : ""}`}>
      {left}
      <div>
        <h1>{title}</h1>
        {sub && <p className="muted small">{sub}</p>}
      </div>
      {right}
    </header>
  );
}
