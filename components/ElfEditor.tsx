"use client";
import { Plus, X } from "lucide-react";
import { ELF_COLORS, type Elf } from "@/lib/types";
import { ElfAvatar } from "./ui";

/** Up to three elves, each with a fixed colour, a name and (in full mode) a personality. */
export function ElfEditor({ elves, onChange, compact = false }: { elves: Elf[]; onChange: (e: Elf[]) => void; compact?: boolean }) {
  const set = (i: number, patch: Partial<Elf>) => onChange(elves.map((e, j) => (j === i ? { ...e, ...patch } : e)));
  const colours = (list: Elf[]) => list.map((e, i) => ({ ...e, color: ELF_COLORS[i] ?? "elf3" }));
  return (
    <div className="elf-editor">
      {elves.map((e, i) => (
        <div key={i} className={`elf-edit-card ${compact ? "compact" : ""}`}>
          <ElfAvatar elf={{ ...e, name: e.name || String(i + 1) }} size="l" />
          <div className="elf-edit-fields">
            <input
              className="input elf-name-input"
              placeholder={i === 0 ? "Your elf's name" : `Elf ${i + 1}'s name`}
              value={e.name}
              onChange={(ev) => set(i, { name: ev.target.value })}
              aria-label={`Elf ${i + 1} name`}
            />
            {!compact && (
              <input
                className="input elf-personality-input"
                placeholder="Personality, e.g. the show-off, the worrier"
                value={e.personality}
                onChange={(ev) => set(i, { personality: ev.target.value })}
                aria-label={`Elf ${i + 1} personality`}
              />
            )}
          </div>
          {elves.length > 1 && (
            <button className="icon-btn plain" aria-label={`Remove ${e.name || "elf"}`} onClick={() => onChange(colours(elves.filter((_, j) => j !== i)))}>
              <X size={18} strokeWidth={1.8} />
            </button>
          )}
        </div>
      ))}
      {elves.length < 3 && (
        <button className="elf-add" onClick={() => onChange(colours([...elves, { name: "", personality: "", color: "elf1" }]))}>
          <Plus size={18} strokeWidth={1.8} aria-hidden="true" /> Add {elves.length ? "another" : "an"} elf
          <span className="muted small"> · up to 3</span>
        </button>
      )}
    </div>
  );
}
