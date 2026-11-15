import { useState } from "react";
import { api } from "../api";
import type { AppActions, AppData } from "../App";
import { errorMessage, prettyDate } from "../utils";

const REACTIONS = ["😴", "😐", "🙂", "😂", "🤯"];

export function History({ data, actions }: { data: AppData; actions: AppActions }) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(data.taste.profile);
  const [error, setError] = useState<string | null>(null);

  const days = Object.values(data.days)
    .filter((d) => d.status !== "open" || d.ideas.length > 0)
    .sort((a, b) => b.date.localeCompare(a.date));

  async function saveTaste() {
    try {
      actions.setTaste(await api.saveTaste(draft));
      setEditing(false);
    } catch (e) {
      setError(errorMessage(e));
    }
  }

  return (
    <div>
      <header className="day-head">
        <div>
          <h1>What the elf has learned</h1>
          <p className="muted small">Built from your photos and feedback. Feeds every new idea.</p>
        </div>
      </header>
      {error && <p className="error">{error}</p>}

      <div className="card taste">
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
      </div>

      <h2 className="section">Season log</h2>
      {days.length === 0 && <p className="muted">No nights logged yet.</p>}
      {days.map((d) => {
        const chosen = d.ideas.find((i) => i.id === d.chosenIdeaId);
        return (
          <div key={d.date} className="card log">
            {d.result?.photoId && <img src={`/api/photos/${d.result.photoId}`} alt="" />}
            <div>
              <p className="eyebrow">
                {prettyDate(d.date)} · {d.status}
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
    </div>
  );
}
