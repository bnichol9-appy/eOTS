"use client";
import { Bookmark, Eye, ListChecks, MessageCircleHeart, ShoppingBag } from "lucide-react";
import type { Elf, Idea, KitItem, PostDetail } from "@/lib/types";
import { formatWord, messWord } from "@/lib/types";
import { ElfAvatar, Sheet, SheetSection, Tiles } from "./ui";

type IdeaLike = Pick<Idea, "title" | "pitch" | "roomName" | "format" | "roles" | "whatKidsSee" | "steps" | "kit" | "setupMinutes" | "chaos" | "mess" | "spook" | "elfNote" | "tags">;
const SM = { size: 18, strokeWidth: 1.8 };

/** Everything needed to pull an idea off: the story, who goes where, what the kids see, kit, steps and the elves' note. */
export function IdeaDetail({ idea, elves, showPitch = true }: { idea: IdeaLike | PostDetail; elves: Elf[]; showPitch?: boolean }) {
  const roles = "roles" in idea ? idea.roles : [];
  const elfNote = "elfNote" in idea ? idea.elfNote : "";
  return (
    <div className="idea-detail">
      {showPitch && <p className="body idea-pitch">{idea.pitch}</p>}
      <Tiles
        items={[
          { label: "Set-up", value: `${idea.setupMinutes} min` },
          { label: "Mess", value: messWord(idea.mess) },
          { label: "Spook", value: `${idea.spook} / 5` },
          { label: "Chaos", value: `${idea.chaos} / 5` },
        ]}
      />

      {roles.length > 0 && (
        <SheetSection title={roles.length > 1 ? `${formatWord(idea.format) || "Who goes where"}` : "Where the elf goes"}>
          <div className="role-list">
            {roles.map((r, i) => {
              const elf = elves.find((e) => e.name === r.elf) ?? { name: r.elf || "?", color: "elf3" as const };
              return (
                <div key={i} className="role-card">
                  <ElfAvatar elf={elf} size="l" />
                  <div className="grow">
                    <div className="role-where">
                      <strong>{r.elf}</strong>
                      <span className="muted small">{[r.roomName, r.spotLabel].filter(Boolean).join(" · ")}</span>
                    </div>
                    {r.action && <p className="body small">{r.action}</p>}
                  </div>
                </div>
              );
            })}
          </div>
        </SheetSection>
      )}

      {idea.whatKidsSee && (
        <div className="kids-see">
          <Eye {...SM} aria-hidden="true" />
          <div>
            <div className="eyebrow">What the kids see in the morning</div>
            <p className="body">{idea.whatKidsSee}</p>
          </div>
        </div>
      )}

      <SheetSection title="Kit" hint={idea.kit.length ? `${idea.kit.filter((k) => !k.commonlyAtHome).length} to buy` : undefined}>
        <KitList kit={idea.kit} />
      </SheetSection>

      {idea.steps.length > 0 && (
        <SheetSection title="Steps" hint={`${idea.setupMinutes} min`}>
          <ol className="step-list">
            {idea.steps.map((s, i) => (
              <li key={i}>
                <span className="step-num">{i + 1}</span>
                <span className="body">{s}</span>
              </li>
            ))}
          </ol>
        </SheetSection>
      )}

      {elfNote && (
        <SheetSection title="The note they leave">
          <div className="elf-note">
            <MessageCircleHeart {...SM} aria-hidden="true" />
            <p>{elfNote}</p>
          </div>
        </SheetSection>
      )}

      {idea.tags.length > 0 && (
        <div className="hooks">
          {idea.tags.map((t) => (
            <span key={t} className="tag line">
              #{t}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

export function KitList({ kit }: { kit: KitItem[] }) {
  if (kit.length === 0)
    return (
      <p className="muted small kit-none">
        <ListChecks size={16} strokeWidth={1.8} aria-hidden="true" /> Nothing needed. Everything&apos;s already in the house.
      </p>
    );
  return (
    <div className="list">
      {kit.map((k, i) => (
        <div key={i} className="list-row set-row kit-line">
          <ShoppingBag {...SM} className="row-icon" aria-hidden="true" />
          <span className="row-label">
            {k.name}
            {k.qty ? <span className="row-sub">{k.qty}</span> : null}
          </span>
          {k.commonlyAtHome ? <span className="muted small">At home</span> : <span className="tag">Buy</span>}
        </div>
      ))}
    </div>
  );
}

export function IdeaSheet({ idea, elves, onClose, onFavourite, actions }: { idea: Idea; elves: Elf[]; onClose: () => void; onFavourite?: () => void; actions?: React.ReactNode }) {
  return (
    <Sheet
      eyebrow={[idea.roomName, formatWord(idea.format)].filter(Boolean).join(" · ") || "Idea"}
      title={idea.title}
      onClose={onClose}
      footer={actions ? <div className="sheet-actions">{actions}</div> : undefined}
    >
      <div className="idea-sheet-top">
        <p className="body idea-pitch">{idea.pitch}</p>
        {onFavourite && (
          <button className={`btn small ${idea.favourite ? "on-pine" : ""}`} onClick={onFavourite} aria-pressed={idea.favourite}>
            <Bookmark size={16} strokeWidth={1.8} fill={idea.favourite ? "currentColor" : "none"} /> {idea.favourite ? "Saved" : "Save"}
          </button>
        )}
      </div>
      <IdeaDetail idea={idea} elves={elves} showPitch={false} />
    </Sheet>
  );
}
