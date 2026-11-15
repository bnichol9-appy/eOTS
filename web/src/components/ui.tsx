import { useEffect, useState } from "react";

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

export function Chips({
  options,
  value,
  onChange,
  multi = false,
}: {
  options: string[];
  value: string[];
  onChange: (v: string[]) => void;
  multi?: boolean;
}) {
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
  "Hiding the evidence (then un-hiding it)…",
];

export function Working({ label }: { label?: string }) {
  const [i, setI] = useState(() => Math.floor(Math.random() * LINES.length));
  useEffect(() => {
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

export function Sheet({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
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
