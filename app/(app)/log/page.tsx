"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useApp } from "@/components/AppContext";
import { IdeaBody } from "@/components/IdeaBody";
import { Meters, PageHead, Sheet } from "@/components/ui";
import { api } from "@/lib/client/api";
import { errorMessage, localDate, prettyDate, REACTIONS } from "@/lib/client/utils";
import type { Idea } from "@/lib/types";

export default function LogPage() {
  const { data, actions } = useApp();
  const router = useRouter();
  const [tab, setTab] = useState<"saved" | "season" | "brain">("saved");
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(data.taste.profile);
  const [error, setError] = useState<string | null>(null);
  const [openIdea, setOpenIdea] = useState<Idea | null>(null);

  const days = data.days.filter((d) => d.status !== "open" || d.ideas.length > 0);

  async function saveTaste() {
    try {
      actions.setTaste(await api.saveTaste(draft));
      setEditing(false);
    } catch (e) {
      setError(errorMessage(e));
    }
  }

  async function unfavourite(idea: Idea) {
    try {
      await api.favourite(idea.id);
      actions.setFavourites((f) => f.filter((x) => x.id !== idea.id));
      setOpenIdea(null);
    } catch (e) {
      setError(errorMessage(e));
    }
  }

  async function useTonight(idea: Idea) {
    try {
      const r = await api.useIdea(idea.id, localDate());
      actions.setDay(r.day);
      router.push("/");
    } catch (e) {
      setError(errorMessage(e));
    }
  }

  return (
    <div>
      <PageHead title="Your log" sub={`${data.stats.nightsDone} nights done · ${data.stats.streak} night streak · ${data.stats.upvotesReceived} upvotes received`} />
      <div className="segment">
        <button className={tab === "saved" ? "on" : ""} onClick={() => setTab("saved")}>
          Saved ({data.favourites.length})
        </button>
        <button className={tab === "season" ? "on" : ""} onClick={() => setTab("season")}>
          Season
        </button>
        <button className={tab === "brain" ? "on" : ""} onClick={() => setTab("brain")}>
          Elf brain
        </button>
      </div>
      {error && <p className="error">{error}</p>}

      {tab === "saved" && (
        <>
          {data.favourites.length === 0 && (
            <div className="card notice">
              Tap ♡ on any idea on the Tonight tab, or Save a setup from <Link href="/community">other elves</Link>, and it lands here for a night you need it.
            </div>
          )}
          {data.favourites.map((idea) => (
            <button key={idea.id} className="card idea-row" onClick={() => setOpenIdea(idea)}>
              <p className="eyebrow">
                {idea.source === "community" ? "From the community" : "Your elf"} · {idea.roomName}
              </p>
              <h3>{idea.title}</h3>
              <p className="muted small">{idea.pitch}</p>
              <Meters chaos={idea.chaos} mess={idea.mess} minutes={idea.setupMinutes} />
            </button>
          ))}
        </>
      )}

      {tab === "season" && (
        <>
          {days.length === 0 && <p className="muted">No nights logged yet.</p>}
          {days.map((d) => {
            const chosen = d.ideas.find((i) => i.id === d.chosenIdeaId);
            return (
              <div key={d.date} className="card log">
                {d.result?.photoUrl && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={d.result.photoUrl} alt="" />
                )}
                <div>
                  <p className="eyebrow">
                    {prettyDate(d.date)} · {d.status}
                    {d.postId && " · shared"}
                  </p>
                  <h3>{chosen?.title ?? (d.status === "skipped" ? "Night off" : "Undecided")}</h3>
                  {d.result && (
                    <p className="small">
                      {REACTIONS[d.result.reaction - 1]} {d.result.feedbackTags.join(", ")}
                      {d.result.notes ? ` · ${d.result.notes}` : ""}
                    </p>
                  )}
                  {d.result?.learned && <p className="small learned">🧠 {d.result.learned}</p>}
                </div>
              </div>
            );
          })}
        </>
      )}

      {tab === "brain" && (
        <div className="card taste">
          <p className="muted small">Built from your photos and feedback. Fed into every new idea. Edit it if the elf has the wrong idea.</p>
          {editing ? (
            <>
              <textarea className="input" rows={12} value={draft} onChange={(e) => setDraft(e.target.value)} />
              <div className="row">
                <button className="btn primary" onClick={() => void saveTaste()}>
                  Save
                </button>
                <button className="btn ghost" onClick={() => setEditing(false)}>
                  Cancel
                </button>
              </div>
            </>
          ) : (
            <>
              {data.taste.profile ? <pre className="profile">{data.taste.profile}</pre> : <p className="muted">Nothing yet. Finish a night and tell the elf how it went.</p>}
              <div className="row">
                <button
                  className="btn ghost small"
                  onClick={() => {
                    setDraft(data.taste.profile);
                    setEditing(true);
                  }}
                >
                  Edit
                </button>
                {data.taste.profile && (
                  <button
                    className="btn ghost small"
                    onClick={() => {
                      if (confirm("Forget everything the elf has learned?")) api.resetTaste().then(actions.setTaste).catch((e) => setError(errorMessage(e)));
                    }}
                  >
                    Reset
                  </button>
                )}
              </div>
            </>
          )}
          {data.taste.updates.length > 0 && (
            <>
              <p className="eyebrow">Recent lessons</p>
              <ul className="small">
                {data.taste.updates.slice(0, 8).map((u, i) => (
                  <li key={i}>
                    <span className="muted">{prettyDate(u.date)}:</span> {u.summary}
                  </li>
                ))}
              </ul>
            </>
          )}
        </div>
      )}

      {openIdea && (
        <Sheet title={openIdea.title} onClose={() => setOpenIdea(null)}>
          <IdeaBody idea={openIdea} />
          <div className="row">
            <button className="btn primary" onClick={() => void useTonight(openIdea)}>
              Do this tonight
            </button>
            {openIdea.sourcePostId && (
              <Link className="btn ghost" href={`/community/${openIdea.sourcePostId}`}>
                See the post
              </Link>
            )}
            <button className="btn ghost" onClick={() => void unfavourite(openIdea)}>
              Remove
            </button>
          </div>
        </Sheet>
      )}
    </div>
  );
}
