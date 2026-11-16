"use client";
import { Bookmark } from "lucide-react";
import type { Elf, Idea, KitItem, PostDetail } from "@/lib/types";
import { formatWord, messWord } from "@/lib/types";
import { ElfAvatar, ICON, Sheet, Tiles } from "./ui";

type IdeaLike = Pick<Idea, "title" | "pitch" | "roomName" | "format" | "roles" | "whatKidsSee" | "steps" | "kit" | "setupMinutes" | "chaos" | "mess" | "spook" | "elfNote" | "tags">;

export function IdeaDetail({ idea, elves }: { idea: IdeaLike | PostDetail; elves: Elf[] }) {
  const roles = "roles" in idea ? idea.roles : [];
  const elfNote = "elfNote" in idea ? idea.elfNote : "";
  return (
    <div className="stack">
      <p className="body">{idea.pitch}</p>
      <Tiles items={[{ label: "Set-up", value: `${idea.setupMinutes} min` }, { label: "Mess", value: messWord(idea.mess) }, { label: "Spook", value: `${idea.spook} / 5` }, { label: "Chaos", value: `${idea.chaos} / 5` }]} />
      {roles.length > 0 && (
        <div className="stack">
          <div className="eyebrow">{formatWord(idea.format) || "Roles"}</div>
          {roles.map((r, i) => {
            const elf = elves.find((e) => e.name === r.elf) ?? { name: r.elf, color: "elf3" as const };
            return (
              <div key={i} className="row">
                <ElfAvatar elf={elf} size="m" />
                <div>
                  <strong>{r.elf}</strong> <span className="muted small">{[r.roomName, r.spotLabel].filter(Boolean).join(" · ")}</span>
                  <p className="body">{r.action}</p>
                </div>
              </div>
            );
          })}
        </div>
      )}
      <div>
        <div className="eyebrow">What the kids see</div>
        <p className="body">{idea.whatKidsSee}</p>
      </div>
      <div>
        <div className="eyebrow">Kit</div>
        <KitList kit={idea.kit} />
      </div>
      <div>
        <div className="eyebrow">Steps</div>
        <ol className="steps">
          {idea.steps.map((s, i) => (
            <li key={i}>{s}</li>
          ))}
        </ol>
      </div>
      {elfNote && (
        <div>
          <div className="eyebrow">Note the elves leave</div>
          <blockquote className="quote">{elfNote}</blockquote>
        </div>
      )}
      <p className="muted small">{idea.tags.map((t) => `#${t}`).join(" ")}</p>
    </div>
  );
}

export function KitList({ kit }: { kit: KitItem[] }) {
  if (kit.length === 0) return <p className="muted small">Nothing needed.</p>;
  return (
    <p className="body">
      {kit.map((k, i) => (
        <span key={i}>
          {i > 0 && " · "}
          {k.name}
          {k.qty ? ` ${k.qty}` : ""}
          {!k.commonlyAtHome && <span className="tag" style={{ marginLeft: 6 }}>Buy</span>}
        </span>
      ))}
    </p>
  );
}

export function IdeaSheet({ idea, elves, onClose, onFavourite, actions }: { idea: Idea; elves: Elf[]; onClose: () => void; onFavourite?: () => void; actions?: React.ReactNode }) {
  return (
    <Sheet eyebrow={[formatWord(idea.format), idea.roomName].filter(Boolean).join(" · ") || idea.roomName} title={idea.title} onClose={onClose}>
      {onFavourite && (
        <button className={`mini ${idea.favourite ? "on" : ""}`} onClick={onFavourite} style={{ alignSelf: "flex-start" }}>
          <Bookmark {...ICON} size={16} /> {idea.favourite ? "Saved" : "Save"}
        </button>
      )}
      <IdeaDetail idea={idea} elves={elves} />
      {actions && <div className="stack">{actions}</div>}
    </Sheet>
  );
}
