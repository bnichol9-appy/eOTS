"use client";
import Link from "next/link";
import { Bell as BellIcon, Check, Moon, X, type LucideIcon } from "lucide-react";
import { useEffect, useState, type ReactNode } from "react";
import type { Elf, ElfColor, Role } from "@/lib/types";

export const ICON = { size: 22, strokeWidth: 1.8 } as const;
export const ICON_SM = { size: 18, strokeWidth: 1.8 } as const;

export function ElfAvatar({ elf, size = "", className = "" }: { elf: { name: string; color: ElfColor }; size?: "" | "m" | "l" | "xl"; className?: string }) {
  return (
    <span className={`elf ${elf.color} ${size} ${className}`} aria-label={elf.name} title={elf.name}>
      {elf.name.trim().charAt(0).toUpperCase() || "?"}
    </span>
  );
}

export function ElfStack({ elves, size = "" }: { elves: Elf[]; size?: "" | "m" | "l" }) {
  return (
    <span className="elf-stack">
      {elves.map((e) => (
        <ElfAvatar key={e.name} elf={e} size={size} />
      ))}
    </span>
  );
}

/** A pill pin on a room photo: elf avatar (inverted) plus the spot label. */
export function Pin({ elf, label, x, y }: { elf: { name: string; color: ElfColor }; label: string; x: number; y: number }) {
  return (
    <span className={`pin ${elf.color}`} style={{ left: `${x * 100}%`, top: `${y * 100}%` }}>
      <span className="elf">{elf.name.charAt(0).toUpperCase()}</span>
      {label}
    </span>
  );
}

export function Tiles({ items }: { items: { label: string; value: string; outline?: boolean }[] }) {
  return (
    <div className="tiles">
      {items.map((t) => (
        <div key={t.label} className={`tile ${t.outline ? "outline" : ""}`}>
          <div className="meta">{t.label}</div>
          <strong>{t.value}</strong>
        </div>
      ))}
    </div>
  );
}

export function Checkbox({ on, onChange, disabled = false, label }: { on: boolean; onChange?: (v: boolean) => void; disabled?: boolean; label: string }) {
  return (
    <button type="button" className={`checkbox ${on ? "on" : ""}`} aria-label={label} aria-pressed={on} disabled={disabled} onClick={() => onChange?.(!on)}>
      {on && <Check size={16} strokeWidth={2.5} />}
    </button>
  );
}

export function Segment<T extends string>({ options, value, onChange }: { options: { key: T; label: ReactNode; disabled?: boolean }[]; value: T; onChange: (v: T) => void }) {
  return (
    <div className="segment" role="tablist">
      {options.map((o) => (
        <button key={o.key} role="tab" aria-selected={value === o.key} className={value === o.key ? "on" : ""} disabled={o.disabled} onClick={() => onChange(o.key)}>
          {o.label}
        </button>
      ))}
    </div>
  );
}

export function Chips({ options, value, onChange, multi = false, scroll = false }: { options: string[]; value: string[]; onChange: (v: string[]) => void; multi?: boolean; scroll?: boolean }) {
  return (
    <div className={`chips ${scroll ? "scroll" : ""}`}>
      {options.map((o) => {
        const on = value.includes(o);
        return (
          <button
            key={o}
            type="button"
            className={`chip ${on ? "on" : ""}`}
            aria-pressed={on}
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
  "The elves are casing the joint…",
  "Measuring the hallway for toilet paper…",
  "Checking which socks are expendable…",
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
    <div className="working" role="status">
      <span className="working-moon" aria-hidden="true">
        <Moon size={22} strokeWidth={1.8} />
      </span>
      <p className="working-line">{label ?? LINES[i]}</p>
      <span className="working-dots" aria-hidden="true">
        <i />
        <i />
        <i />
      </span>
    </div>
  );
}

/** Bottom sheet: display title, a close button, a scrolling body and an optional pinned footer for the main actions. */
export function Sheet({ eyebrow, title, onClose, children, footer }: { eyebrow?: string; title: string; onClose: () => void; children: ReactNode; footer?: ReactNode }) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [onClose]);
  return (
    <div className="scrim" onClick={onClose}>
      <div className="sheet" role="dialog" aria-modal="true" aria-label={title} onClick={(e) => e.stopPropagation()}>
        <div className="handle" />
        <div className="sheet-head">
          <div className="grow">
            {eyebrow && <div className="eyebrow">{eyebrow}</div>}
            <h2 className="sheet-title">{title}</h2>
          </div>
          <button className="icon-btn sheet-close" onClick={onClose} aria-label="Close">
            <X size={18} strokeWidth={1.8} />
          </button>
        </div>
        <div className="sheet-body">{children}</div>
        {footer && <div className="sheet-foot">{footer}</div>}
      </div>
    </div>
  );
}

/** A titled group inside a sheet. */
export function SheetSection({ title, hint, children }: { title: string; hint?: ReactNode; children: ReactNode }) {
  return (
    <section className="sheet-section">
      <div className="sheet-section-head">
        <h3>{title}</h3>
        {hint && <span className="muted small">{hint}</span>}
      </div>
      {children}
    </section>
  );
}

export function Topbar({ eyebrow, title, back, right, display = true }: { eyebrow?: ReactNode; title: ReactNode; back?: () => void; right?: ReactNode; display?: boolean }) {
  return (
    <header className="topbar">
      {back && (
        <button className="icon-btn" onClick={back} aria-label="Back">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
            <path d="M15 5l-7 7 7 7" />
          </svg>
        </button>
      )}
      <div className="titles">
        {eyebrow && <div className="eyebrow">{eyebrow}</div>}
        {display ? <h1>{title}</h1> : <div className="brand">{title}</div>}
      </div>
      {right}
    </header>
  );
}

export function Bell({ unread }: { unread: number }) {
  return (
    <Link href="/inbox" className="icon-btn" aria-label={`Notifications${unread ? `, ${unread} unread` : ""}`}>
      <BellIcon {...ICON} />
      {unread > 0 && <span className="badge-count">{unread > 9 ? "9+" : unread}</span>}
    </Link>
  );
}

/** The light-theme garland above the brand mark on Tonight. Hidden in dark mode by CSS. */
export function Garland() {
  return (
    <svg className="garland" width="120" height="12" viewBox="0 0 120 12" aria-hidden="true">
      <path d="M0 2 Q30 12 60 2 T120 2" fill="none" stroke="var(--dash)" strokeWidth="1" />
      <circle cx="15" cy="6" r="2.5" fill="var(--accent)" />
      <path d="M38 4l1.2 2.4 2.6.4-1.9 1.8.5 2.6-2.4-1.3-2.4 1.3.5-2.6-1.9-1.8 2.6-.4z" fill="var(--pine)" />
      <circle cx="60" cy="5" r="2.5" fill="var(--accent)" />
      <path d="M82 4l1.2 2.4 2.6.4-1.9 1.8.5 2.6-2.4-1.3-2.4 1.3.5-2.6-1.9-1.8 2.6-.4z" fill="var(--pine)" />
      <circle cx="105" cy="6" r="2.5" fill="var(--accent)" />
    </svg>
  );
}

export function Actions({ children, stacked = false, noTabs = false }: { children: ReactNode; stacked?: boolean; noTabs?: boolean }) {
  return (
    <div className={`actions ${noTabs ? "no-tabs" : ""}`}>
      <div className={`actions-inner ${stacked ? "stacked" : ""}`}>{children}</div>
    </div>
  );
}

export function IconLabel({ icon: Icon, children }: { icon: LucideIcon; children: ReactNode }) {
  return (
    <span className="row">
      <Icon {...ICON_SM} />
      {children}
    </span>
  );
}

/** Which elves are in a role list, mapped to the family's elves (falls back to all elves). */
export function rolesToElves(roles: Role[], elves: Elf[]): Elf[] {
  const named = roles.map((r) => elves.find((e) => e.name === r.elf)).filter((e): e is Elf => Boolean(e));
  return named.length ? [...new Map(named.map((e) => [e.name, e])).values()] : elves;
}
