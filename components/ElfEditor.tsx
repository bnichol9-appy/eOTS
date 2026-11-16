"use client";
import { Plus, X } from "lucide-react";
import { ELF_COLORS, type Elf } from "@/lib/types";
import { ElfAvatar } from "./ui";

/** Up to three elves, each with a fixed colour. */
export function ElfEditor({ elves, onChange, compact = false }: { elves: Elf[]; onChange: (e: Elf[]) => void; compact?: boolean }) {
  const set = (i: number, patch: Partial<Elf>) => onChange(elves.map((e, j) => (j === i ? { ...e, ...patch } : e)));
  const colours = (list: Elf[]) => list.map((e, i) => ({ ...e, color: ELF_COLORS[i] ?? "elf3" }));
  return (
    <div className="stack">
      <div className={compact ? "option-grid" : "stack"}>
        {elves.map((e, i) => (
          <div key={i} className="card filled" style={{ padding: 10, display: "flex", gap: 10, alignItems: "center", flex: 1 }}>
            <ElfAvatar elf={e} size="l" />
            <div className="grow stack" style={{ gap: 4 }}>
              <input className="input" style={{ minHeight: 40, padding: "6px 10px", background: "transparent", border: 0, fontSize: 18 }} placeholder={`Elf ${i + 1}`} value={e.name} onChange={(ev) => set(i, { name: ev.target.value })} aria-label={`Elf ${i + 1} name`} />
              {!compact && <input className="input" style={{ minHeight: 36, padding: "6px 10px", fontSize: 14 }} placeholder="Personality, e.g. the storyteller" value={e.personality} onChange={(ev) => set(i, { personality: ev.target.value })} aria-label={`Elf ${i + 1} personality`} />}
            </div>
            {elves.length > 1 && (
              <button className="icon-btn plain" aria-label={`Remove ${e.name || "elf"}`} onClick={() => onChange(colours(elves.filter((_, j) => j !== i)))}>
                <X size={18} strokeWidth={1.8} />
              </button>
            )}
          </div>
        ))}
      </div>
      {elves.length < 3 && (
        <button className="link-btn" style={{ alignSelf: "flex-start" }} onClick={() => onChange(colours([...elves, { name: "", personality: "", color: "elf1" }]))}>
          <Plus size={16} strokeWidth={2.2} style={{ verticalAlign: -3 }} /> Add {elves.length ? "another" : "an"} elf
        </button>
      )}
    </div>
  );
}
