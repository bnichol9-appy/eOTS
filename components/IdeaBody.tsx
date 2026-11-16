"use client";
import type { Idea } from "@/lib/types";
import { Meters } from "./ui";

export function IdeaBody({ idea, expanded = false }: { idea: Idea | Omit<Idea, "id" | "dayId" | "slot" | "source" | "sourcePostId" | "favourite">; expanded?: boolean }) {
  return (
    <div className="idea-body">
      {expanded && (
        <>
          <h3>{idea.title}</h3>
          <p className="muted">{idea.roomName}</p>
          <p>{idea.pitch}</p>
          <Meters chaos={idea.chaos} mess={idea.mess} minutes={idea.setupMinutes} />
        </>
      )}
      <p className="eyebrow">What the kids see</p>
      <p className="scene">{idea.whatKidsSee}</p>
      <p className="eyebrow">You&apos;ll need</p>
      <p>{idea.supplies.join(" · ")}</p>
      <p className="eyebrow">Steps</p>
      <ol className="steps">
        {idea.steps.map((s, i) => (
          <li key={i}>
            <label>
              <input type="checkbox" /> <span>{s}</span>
            </label>
          </li>
        ))}
      </ol>
      {idea.elfNote && (
        <blockquote className="elf-note">
          <span className="eyebrow">Note from the elf</span>
          {idea.elfNote}
        </blockquote>
      )}
      <p className="tags">{idea.tags.map((t) => `#${t}`).join(" ")}</p>
    </div>
  );
}
