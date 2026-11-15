import { useEffect, useState } from "react";
import { api } from "../api";
import type { AppActions, AppData } from "../App";
import type { Day, Idea } from "../types";
import { errorMessage, localDate, prettyDate, shiftDate } from "../utils";
import { Chips, Meter, Sheet, Working } from "../components/ui";
import { PhotoPicker } from "../components/PhotoPicker";

const SLOTS = ["Full send", "Quick hit", "Wildcard"];
const DIRECTIONS = ["Max chaos", "Quick & easy", "Low mess", "Bathroom", "Kitchen", "Prank the kids", "Use the pets", "Food-based", "Build something huge"];
const FEEDBACK = ["more like this", "bigger next time", "messier", "less mess", "funnier", "less effort", "more interactive", "kids were scared", "never again"];
const REACTIONS = ["😴", "😐", "🙂", "😂", "🤯"];

export function Today({ data, actions }: { data: AppData; actions: AppActions }) {
  const [date, setDate] = useState(localDate());
  const [meta, setMeta] = useState<{ dayNumber: number | null; seasonLength: number }>({ dayNumber: null, seasonLength: 24 });
  const [direction, setDirection] = useState<string[]>([]);
  const [custom, setCustom] = useState("");
  const [focusRoomId, setFocusRoomId] = useState<string>("");
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [open, setOpen] = useState<string | null>(null);
  const [remixing, setRemixing] = useState<string | null>(null);
  const [showComplete, setShowComplete] = useState(false);

  const day: Day = data.days[date] ?? { date, ideas: [], chosenIdeaId: null, direction: "", status: "open", result: null, generatedAt: null };
  const chosen = day.ideas.find((i) => i.id === day.chosenIdeaId) ?? null;

  useEffect(() => {
    api
      .getDay(date)
      .then((r) => {
        actions.setDay(r.day);
        setMeta({ dayNumber: r.dayNumber ?? null, seasonLength: r.seasonLength ?? 24 });
      })
      .catch((e) => setError(errorMessage(e)));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [date]);

  async function run(label: string, fn: () => Promise<{ day: Day; taste?: AppData["taste"] }>) {
    setBusy(label);
    setError(null);
    try {
      const r = await fn();
      actions.setDay(r.day);
      if (r.taste) actions.setTaste(r.taste);
      return true;
    } catch (e) {
      setError(errorMessage(e));
      return false;
    } finally {
      setBusy(null);
    }
  }

  const fullDirection = [...direction, custom.trim()].filter(Boolean).join(". ");

  function generate() {
    void run("generate", () => api.generate(date, fullDirection, focusRoomId || null));
  }

  const header = (
    <header className="day-head">
      <button className="icon-btn" onClick={() => setDate(shiftDate(date, -1))} aria-label="Previous day">
        ‹
      </button>
      <div>
        <h1>{date === localDate() ? "Tonight" : prettyDate(date)}</h1>
        <p className="muted small">
          {date === localDate() ? prettyDate(date) + " · " : ""}
          {meta.dayNumber ? `Day ${meta.dayNumber} of ${meta.seasonLength}` : "Bonus night"}
        </p>
      </div>
      <button className="icon-btn" onClick={() => setDate(shiftDate(date, 1))} aria-label="Next day">
        ›
      </button>
    </header>
  );

  if (busy === "generate") {
    return (
      <div>
        {header}
        <Working />
      </div>
    );
  }

  return (
    <div>
      {header}
      {error && <p className="error">{error}</p>}

      {data.rooms.length === 0 && day.ideas.length === 0 && (
        <div className="card notice">
          <strong>Tip:</strong> photograph a few areas of your house in the <em>House</em> tab first. Ideas get much better when the elf knows your actual hallway.
        </div>
      )}

      {day.status === "skipped" && (
        <div className="card">
          <h3>Elf took the night off</h3>
          <button className="btn ghost" onClick={() => void run("reopen", () => api.reopen(date))}>
            Reopen
          </button>
        </div>
      )}

      {day.status === "done" && day.result && (
        <div className="card done">
          <h3>✅ {chosen?.title ?? "Done"}</h3>
          {day.result.photoId && <img className="result-photo" src={`/api/photos/${day.result.photoId}`} alt="" />}
          <p>
            Reaction {REACTIONS[day.result.reaction - 1]} · {day.result.feedbackTags.join(", ") || "no tags"}
          </p>
          {day.result.learned && <p className="learned">🧠 {day.result.learned}</p>}
          <button className="btn ghost small" onClick={() => void run("reopen", () => api.reopen(date))}>
            Undo
          </button>
        </div>
      )}

      {day.status === "planned" && chosen && (
        <div className="card plan">
          <p className="eyebrow">Tonight's plan</p>
          <IdeaBody idea={chosen} expanded />
          <div className="row">
            <button className="btn primary" onClick={() => setShowComplete(true)}>
              Done, how did it go?
            </button>
            <button className="btn ghost" onClick={() => void run("unchoose", () => api.unchoose(date))}>
              Change my mind
            </button>
          </div>
        </div>
      )}

      {day.status === "open" && (
        <>
          {day.ideas.length > 0 && (
            <div className="ideas">
              {day.ideas.map((idea, i) => (
                <div key={idea.id} className={`card idea ${open === idea.id ? "open" : ""}`}>
                  <button className="idea-head" onClick={() => setOpen(open === idea.id ? null : idea.id)}>
                    <span className="eyebrow">{SLOTS[i] ?? "Option"} · {idea.roomName}</span>
                    <h3>{idea.title}</h3>
                    <p>{idea.pitch}</p>
                    <div className="meters">
                      <Meter label="Chaos" value={idea.chaos} icon="🔥" />
                      <Meter label="Mess" value={idea.mess} icon="🧹" />
                      <span className="meter">
                        <span className="meter-icon">⏱</span> {idea.setupMinutes} min
                      </span>
                    </div>
                  </button>
                  {open === idea.id && (
                    <>
                      <IdeaBody idea={idea} />
                      {remixing === idea.id ? (
                        <RemixBox
                          busy={busy === "remix"}
                          onCancel={() => setRemixing(null)}
                          onGo={(dir) =>
                            void run("remix", () => api.remix(date, idea.id, dir)).then((ok) => ok && setRemixing(null))
                          }
                        />
                      ) : (
                        <div className="row">
                          <button className="btn primary" onClick={() => void run("choose", () => api.choose(date, idea.id))}>
                            Do this one
                          </button>
                          <button className="btn ghost" onClick={() => setRemixing(idea.id)}>
                            ↻ Remix
                          </button>
                        </div>
                      )}
                    </>
                  )}
                </div>
              ))}
            </div>
          )}

          <div className="card gen">
            <h3>{day.ideas.length ? "Fresh batch" : "What's the elf up to tonight?"}</h3>
            <Chips options={DIRECTIONS} value={direction} onChange={setDirection} multi />
            <input className="input" placeholder="Anything else? e.g. it's a school day, grandma is staying…" value={custom} onChange={(e) => setCustom(e.target.value)} />
            {data.rooms.length > 0 && (
              <select className="input" value={focusRoomId} onChange={(e) => setFocusRoomId(e.target.value)}>
                <option value="">Any area</option>
                {data.rooms.map((r) => (
                  <option key={r.id} value={r.id}>
                    Focus on {r.name}
                  </option>
                ))}
              </select>
            )}
            <div className="row">
              <button className="btn primary big" onClick={generate}>
                {day.ideas.length ? "Give me 3 new ideas" : "Plan tonight's mischief"}
              </button>
              {day.ideas.length === 0 && (
                <button className="btn ghost" onClick={() => void run("skip", () => api.skip(date))}>
                  Night off
                </button>
              )}
            </div>
            {busy && busy !== "generate" && <Working label="Working…" />}
          </div>
        </>
      )}

      {showComplete && (
        <CompleteSheet
          busy={busy === "complete"}
          onClose={() => setShowComplete(false)}
          onSubmit={(body) =>
            void run("complete", () => api.complete(date, body)).then((ok) => ok && setShowComplete(false))
          }
        />
      )}
    </div>
  );
}

function IdeaBody({ idea, expanded = false }: { idea: Idea; expanded?: boolean }) {
  return (
    <div className="idea-body">
      {expanded && (
        <>
          <h3>{idea.title}</h3>
          <p className="muted">{idea.roomName}</p>
          <p>{idea.pitch}</p>
          <div className="meters">
            <Meter label="Chaos" value={idea.chaos} icon="🔥" />
            <Meter label="Mess" value={idea.mess} icon="🧹" />
            <span className="meter">
              <span className="meter-icon">⏱</span> {idea.setupMinutes} min
            </span>
          </div>
        </>
      )}
      <p className="eyebrow">What the kids see</p>
      <p className="scene">{idea.whatKidsSee}</p>
      <p className="eyebrow">You'll need</p>
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

function RemixBox({ busy, onGo, onCancel }: { busy: boolean; onGo: (dir: string) => void; onCancel: () => void }) {
  const [dir, setDir] = useState<string[]>([]);
  const [custom, setCustom] = useState("");
  const full = [...dir, custom.trim()].filter(Boolean).join(". ");
  if (busy) return <Working label="Remixing…" />;
  return (
    <div className="remix">
      <Chips options={["Bigger", "Simpler", "Different room", "Less mess", "Funnier", "More interactive"]} value={dir} onChange={setDir} multi />
      <input className="input" placeholder="Or tell the elf what you want…" value={custom} onChange={(e) => setCustom(e.target.value)} />
      <div className="row">
        <button className="btn primary" onClick={() => onGo(full)}>
          Remix this one
        </button>
        <button className="btn ghost" onClick={onCancel}>
          Cancel
        </button>
      </div>
    </div>
  );
}

function CompleteSheet({
  busy,
  onClose,
  onSubmit,
}: {
  busy: boolean;
  onClose: () => void;
  onSubmit: (body: { photo: string | null; reaction: number; feedbackTags: string[]; notes: string }) => void;
}) {
  const [photos, setPhotos] = useState<string[]>([]);
  const [reaction, setReaction] = useState(4);
  const [tags, setTags] = useState<string[]>([]);
  const [notes, setNotes] = useState("");
  return (
    <Sheet title="How did it go?" onClose={onClose}>
      {busy ? (
        <Working label="The elf is taking notes…" />
      ) : (
        <>
          <p className="eyebrow">Photo of what you built (the elf learns from this)</p>
          <PhotoPicker photos={photos} onChange={setPhotos} multiple={false} label="Photo" />
          <p className="eyebrow">Kids' reaction</p>
          <div className="reactions">
            {REACTIONS.map((r, i) => (
              <button key={r} className={`reaction ${reaction === i + 1 ? "on" : ""}`} onClick={() => setReaction(i + 1)}>
                {r}
              </button>
            ))}
          </div>
          <p className="eyebrow">Tell the elf</p>
          <Chips options={FEEDBACK} value={tags} onChange={setTags} multi />
          <textarea className="input" rows={3} placeholder="What actually happened? What would you change?" value={notes} onChange={(e) => setNotes(e.target.value)} />
          <button className="btn primary big" onClick={() => onSubmit({ photo: photos[0] ?? null, reaction, feedbackTags: tags, notes })}>
            Save &amp; learn
          </button>
        </>
      )}
    </Sheet>
  );
}
