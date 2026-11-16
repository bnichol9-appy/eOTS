"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { useApp } from "@/components/AppContext";
import { IdeaBody } from "@/components/IdeaBody";
import { PhotoPicker } from "@/components/PhotoPicker";
import { Bell, Chips, Meters, PageHead, Sheet, Working } from "@/components/ui";
import { api, type DayResponse } from "@/lib/client/api";
import { errorMessage, localDate, prettyDate, REACTIONS, shiftDate, SLOTS } from "@/lib/client/utils";
import type { Day, Idea } from "@/lib/types";

const DIRECTIONS = ["Max chaos", "Quick & easy", "Low mess", "Bathroom", "Kitchen", "Prank the kids", "Use the pets", "Food-based", "Build something huge"];
const FEEDBACK = ["more like this", "bigger next time", "messier", "less mess", "funnier", "less effort", "more interactive", "kids were scared", "never again"];

export default function TonightPage() {
  const { data, actions } = useApp();
  const [date, setDate] = useState(localDate());
  const [meta, setMeta] = useState<{ dayNumber: number | null; seasonLength: number }>({ dayNumber: null, seasonLength: 24 });
  const [direction, setDirection] = useState<string[]>([]);
  const [custom, setCustom] = useState("");
  const [focusRoomId, setFocusRoomId] = useState("");
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [open, setOpen] = useState<string | null>(null);
  const [remixing, setRemixing] = useState<string | null>(null);
  const [showComplete, setShowComplete] = useState(false);
  const [showShare, setShowShare] = useState(false);

  const empty: Day = { id: "", date, ideas: [], chosenIdeaId: null, direction: "", status: "open", result: null, postId: null, communityPick: null, generatedAt: null };
  const day: Day = data.days.find((d) => d.date === date) ?? empty;
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

  async function run(label: string, fn: () => Promise<DayResponse>) {
    setBusy(label);
    setError(null);
    try {
      const r = await fn();
      actions.setDay(r.day);
      if (r.taste) actions.setTaste(r.taste);
      if (r.newBadges?.length) actions.toast(`🏅 New badge${r.newBadges.length > 1 ? "s" : ""} earned! See your Log.`);
      return r;
    } catch (e) {
      setError(errorMessage(e));
      return null;
    } finally {
      setBusy(null);
    }
  }

  async function toggleFavourite(idea: Idea) {
    try {
      const updated = await api.favourite(idea.id);
      actions.setDay({ ...day, ideas: day.ideas.map((i) => (i.id === updated.id ? updated : i)) });
      actions.setFavourites((f) => (updated.favourite ? [updated, ...f.filter((x) => x.id !== updated.id)] : f.filter((x) => x.id !== updated.id)));
    } catch (e) {
      setError(errorMessage(e));
    }
  }

  const fullDirection = [...direction, custom.trim()].filter(Boolean).join(". ");
  const isToday = date === localDate();

  const header = (
    <PageHead
      title={isToday ? "Tonight" : prettyDate(date)}
      sub={`${isToday ? prettyDate(date) + " · " : ""}${meta.dayNumber ? `Day ${meta.dayNumber} of ${meta.seasonLength}` : "Bonus night"}`}
      left={
        <button className="icon-btn" onClick={() => setDate(shiftDate(date, -1))} aria-label="Previous day">
          ‹
        </button>
      }
      right={
        <>
          <button className="icon-btn" onClick={() => setDate(shiftDate(date, 1))} aria-label="Next day">
            ›
          </button>
          <Bell unread={data.unread} />
        </>
      }
    />
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

      {data.challenge && day.status === "open" && (
        <Link href={`/community/challenges/${data.challenge.id}`} className="card challenge-banner">
          <span className="eyebrow">This week&apos;s challenge</span>
          <strong>🎯 {data.challenge.title}</strong>
          <span className="small muted">{data.challenge.description}</span>
        </Link>
      )}

      {data.rooms.length === 0 && day.ideas.length === 0 && (
        <div className="card notice">
          <strong>Tip:</strong> photograph a few areas of your house in the <Link href="/house">House</Link> tab first. Ideas get much better when the elf knows your actual hallway.
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
          {day.result.photoUrl && (
            // eslint-disable-next-line @next/next/no-img-element
            <img className="result-photo" src={day.result.photoUrl} alt="" />
          )}
          <p>
            Reaction {REACTIONS[day.result.reaction - 1]} · {day.result.feedbackTags.join(", ") || "no tags"}
          </p>
          {day.result.learned && <p className="learned">🧠 {day.result.learned}</p>}
          <div className="row">
            {day.postId ? (
              <Link className="btn ghost" href={`/community/${day.postId}`}>
                Shared with the elves ✓
              </Link>
            ) : day.result.photoUrl ? (
              <button className="btn primary" onClick={() => setShowShare(true)}>
                Share with other parents
              </button>
            ) : null}
            <button className="btn ghost small" onClick={() => void run("reopen", () => api.reopen(date))}>
              Undo
            </button>
          </div>
        </div>
      )}

      {day.status === "planned" && chosen && (
        <div className="card plan">
          <p className="eyebrow">Tonight&apos;s plan{chosen.source === "community" ? " · from the community" : ""}</p>
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
              {day.ideas.map((idea) => (
                <div key={idea.id} className={`card idea ${open === idea.id ? "open" : ""}`}>
                  <button className="idea-head" onClick={() => setOpen(open === idea.id ? null : idea.id)}>
                    <span className="eyebrow">
                      {SLOTS[idea.slot ?? 4] ?? "Option"} · {idea.roomName}
                    </span>
                    <h3>{idea.title}</h3>
                    <p>{idea.pitch}</p>
                    <Meters chaos={idea.chaos} mess={idea.mess} minutes={idea.setupMinutes} />
                  </button>
                  <button className={`heart ${idea.favourite ? "on" : ""}`} onClick={() => void toggleFavourite(idea)} aria-label="Favourite">
                    {idea.favourite ? "♥" : "♡"}
                  </button>
                  {open === idea.id && (
                    <>
                      <IdeaBody idea={idea} />
                      {remixing === idea.id ? (
                        <RemixBox
                          busy={busy === "remix"}
                          onCancel={() => setRemixing(null)}
                          onGo={(dir) => void run("remix", () => api.remix(date, idea.id, dir)).then((ok) => ok && setRemixing(null))}
                        />
                      ) : (
                        <div className="row pad">
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

              {day.communityPick && (
                <div className="card idea community-pick">
                  <Link href={`/community/${day.communityPick.post.id}`} className="idea-head">
                    <span className="eyebrow">From the community · {day.communityPick.post.author.elfName}</span>
                    <div className="pick-row">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={day.communityPick.post.photoUrl} alt="" />
                      <div>
                        <h3>{day.communityPick.post.title}</h3>
                        <p className="small">
                          ▲ {day.communityPick.post.upvotes} · done by {day.communityPick.post.uses} {day.communityPick.post.uses === 1 ? "family" : "families"}
                        </p>
                      </div>
                    </div>
                    <p className="why">🧝 {day.communityPick.reason}</p>
                    <Meters chaos={day.communityPick.post.chaos} mess={day.communityPick.post.mess} minutes={day.communityPick.post.setupMinutes} />
                  </Link>
                  <div className="row pad">
                    <button className="btn primary" onClick={() => void run("pick", () => api.usePick(date))}>
                      Do this one
                    </button>
                    <Link className="btn ghost" href={`/community/${day.communityPick.post.id}`}>
                      See the full post
                    </Link>
                  </div>
                </div>
              )}
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
              <button className="btn primary big" onClick={() => void run("generate", () => api.generate(date, fullDirection, focusRoomId || null))}>
                {day.ideas.length ? "Give me 3 new ideas" : "Plan tonight's mischief"}
              </button>
              {day.ideas.length === 0 && (
                <button className="btn ghost" onClick={() => void run("skip", () => api.skip(date))}>
                  Night off
                </button>
              )}
            </div>
            {data.favourites.length > 0 && (
              <p className="muted small">
                Or pick one of your <Link href="/log">saved ideas</Link> or browse what <Link href="/community">other elves</Link> did.
              </p>
            )}
            {busy && busy !== "generate" && busy !== "remix" && <Working label="Working…" />}
          </div>
        </>
      )}

      {showComplete && (
        <CompleteSheet
          busy={busy === "complete"}
          onClose={() => setShowComplete(false)}
          onSubmit={(b) =>
            void run("complete", () => api.complete(date, b)).then((r) => {
              if (r) {
                setShowComplete(false);
                if (b.photo) setShowShare(true);
              }
            })
          }
        />
      )}

      {showShare && (
        <ShareSheet
          busy={busy === "share"}
          hasCircles={data.circles.length > 0}
          challenge={data.challenge && date >= data.challenge.startsOn && date <= data.challenge.endsOn ? data.challenge.title : null}
          onClose={() => setShowShare(false)}
          onSubmit={(b) => void run("share", () => api.share(date, b)).then((r) => r && setShowShare(false))}
        />
      )}
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

function CompleteSheet({ busy, onClose, onSubmit }: { busy: boolean; onClose: () => void; onSubmit: (b: { photo: string | null; reaction: number; feedbackTags: string[]; notes: string }) => void }) {
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
          <p className="eyebrow">Kids&apos; reaction</p>
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

function ShareSheet({
  busy,
  hasCircles,
  challenge,
  onClose,
  onSubmit,
}: {
  busy: boolean;
  hasCircles: boolean;
  challenge: string | null;
  onClose: () => void;
  onSubmit: (b: { description: string; visibility: "public" | "circles"; enterChallenge: boolean }) => void;
}) {
  const [description, setDescription] = useState("");
  const [visibility, setVisibility] = useState<"public" | "circles">("public");
  const [enterChallenge, setEnterChallenge] = useState(Boolean(challenge));
  return (
    <Sheet title="Share with other parents" onClose={onClose}>
      {busy ? (
        <Working label="Packaging it up for the community…" />
      ) : (
        <>
          <p className="muted">
            Your photo plus a how-to written from what you actually built. Other families can upvote it, save it and do it in their own house. Your kids&apos; names and your room photos are never shared.
          </p>
          <textarea className="input" rows={3} placeholder="Anything to add? e.g. what you changed, a tip for other parents" value={description} onChange={(e) => setDescription(e.target.value)} />
          <div className="segment">
            <button className={visibility === "public" ? "on" : ""} onClick={() => setVisibility("public")}>
              🌍 Everyone
            </button>
            <button className={visibility === "circles" ? "on" : ""} disabled={!hasCircles} onClick={() => setVisibility("circles")}>
              👥 Just my circles
            </button>
          </div>
          {challenge && (
            <label className="check">
              <input type="checkbox" checked={enterChallenge} onChange={(e) => setEnterChallenge(e.target.checked)} /> Enter this week&apos;s challenge: <strong>{challenge}</strong>
            </label>
          )}
          <button className="btn primary big" onClick={() => onSubmit({ description, visibility, enterChallenge })}>
            Share it
          </button>
          <button className="btn ghost big" onClick={onClose}>
            Not this one
          </button>
        </>
      )}
    </Sheet>
  );
}
