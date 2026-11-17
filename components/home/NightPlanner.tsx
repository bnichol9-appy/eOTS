"use client";
import Link from "next/link";
import { MessageSquare, Share2 } from "lucide-react";
import { type ReactNode, useEffect, useMemo, useState } from "react";
import { useApp } from "@/components/AppContext";
import { AssistantSheet } from "@/components/AssistantSheet";
import { IdeaSheet } from "@/components/IdeaSheet";
import { PhotoPicker } from "@/components/PhotoPicker";
import { Actions, Checkbox, Chips, ElfAvatar, ElfStack, ICON_SM, Pin, Segment, Sheet, Tiles, Working, rolesToElves } from "@/components/ui";
import { friendlyTime, remindMessage } from "@/lib/assistant";
import { api, type DayResponse } from "@/lib/client/api";
import { errorMessage, localDate, REACTIONS, shiftDate } from "@/lib/client/utils";
import { samplePhoto } from "@/lib/placeholders";
import { formatWord, messWord, type Day, type Idea, type PostSummary, type Room } from "@/lib/types";

const DIRECTIONS = ["Max chaos", "Quick & easy", "Low mess", "Bathroom", "Kitchen", "Prank the kids", "Use the pets", "Food-based", "Build something huge", "Properly spooky"];
const FEEDBACK = ["more like this", "bigger next time", "messier", "less mess", "funnier", "less effort", "more interactive", "too spooky", "never again"];

type Hero = { kind: "idea"; idea: Idea } | { kind: "pick"; post: PostSummary; reason: string };

/**
 * The plan for one night: options to pick from, the chosen set-up, logging how it went and sharing it.
 * Owns the pinned action bar and its sheets. The home screen decides which night it shows.
 */
export function NightPlanner({
  date,
  setDate,
  heading,
  homeDate,
  homeLabel = "Back to tonight",
  emptyText,
  openComplete,
  onCompleteOpened,
}: {
  date: string;
  setDate: (d: string) => void;
  heading: ReactNode;
  homeDate: string;
  homeLabel?: string;
  emptyText?: string;
  openComplete?: boolean;
  onCompleteOpened?: () => void;
}) {
  const { data, actions } = useApp();
  const today = localDate();
  const [meta, setMeta] = useState<{ dayNumber: number | null; seasonLength: number }>({ dayNumber: null, seasonLength: 24 });
  const [heroIdx, setHeroIdx] = useState(0);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [sheet, setSheet] = useState<"none" | "idea" | "tweak" | "complete" | "share" | "remind">("none");
  const [direction, setDirection] = useState<string[]>([]);
  const [custom, setCustom] = useState("");
  const [focusRoomId, setFocusRoomId] = useState("");

  const empty: Day = { id: "", date, ideas: [], chosenIdeaId: null, direction: "", status: "open", isBusy: false, kitState: {}, result: null, postId: null, communityPick: null, generatedAt: null };
  const day: Day = data.days.find((d) => d.date === date) ?? empty;
  const chosen = day.ideas.find((i) => i.id === day.chosenIdeaId) ?? null;
  const elves = data.profile.elves;

  useEffect(() => {
    if (openComplete && day.status === "planned") {
      setSheet("complete");
      onCompleteOpened?.();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [openComplete, day.status]);

  useEffect(() => {
    setHeroIdx(0);
    api
      .getDay(date)
      .then((r) => {
        actions.setDay(r.day);
        setMeta({ dayNumber: r.dayNumber ?? null, seasonLength: r.seasonLength ?? 24 });
      })
      .catch((e) => setError(errorMessage(e)));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [date]);

  const heroes: Hero[] = useMemo(() => {
    const list: Hero[] = day.ideas.filter((i) => (i.slot ?? 0) <= 2).map((idea) => ({ kind: "idea", idea }));
    if (day.communityPick) list.push({ kind: "pick", post: day.communityPick.post, reason: day.communityPick.reason });
    return list;
  }, [day.ideas, day.communityPick]);

  const hero: Hero | null = chosen ? { kind: "idea", idea: chosen } : (heroes[heroIdx % Math.max(1, heroes.length)] ?? null);
  const heroIdea = hero?.kind === "idea" ? hero.idea : null;
  const roomName = heroIdea ? heroIdea.roomName : hero?.kind === "pick" ? hero.post.roomType : "";
  const room: Room | null = heroIdea
    ? (data.rooms.find((r) => r.name.toLowerCase() === heroIdea.roomName.toLowerCase()) ??
      data.rooms.find((r) => heroIdea.roles.some((x) => x.roomName.toLowerCase() === r.name.toLowerCase())) ??
      null)
    : null;

  async function run(label: string, fn: () => Promise<DayResponse>) {
    setBusy(label);
    setError(null);
    try {
      const r = await fn();
      actions.setDay(r.day);
      if (r.taste) actions.setTaste(r.taste);
      if (r.newBadges?.length) actions.toast(`New badge${r.newBadges.length > 1 ? "s" : ""} earned. See Settings › Badges.`);
      return r;
    } catch (e) {
      setError(errorMessage(e));
      return null;
    } finally {
      setBusy(null);
    }
  }

  const fullDirection = [...direction, custom.trim()].filter(Boolean).join(". ");

  async function generate() {
    setSheet("none");
    await run("generate", () => api.generate(date, fullDirection, focusRoomId || null));
    setHeroIdx(0);
  }

  function shuffle() {
    if (heroes.length <= 1) {
      void run("generate", () => api.generate(date, fullDirection, null)).then(() => setHeroIdx(0));
      return;
    }
    const next = (heroIdx + 1) % heroes.length;
    setHeroIdx(next);
    if (next === 0) actions.toast("Back to the first option. Want three new ones? Tap Tweak.");
  }

  async function markSetUp() {
    if (!hero) return;
    if (hero.kind === "pick") await run("choose", () => api.usePick(date));
    else await run("choose", () => api.choose(date, hero.idea.id));
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

  const kit = heroIdea?.kit ?? [];
  const toBuy = kit.filter((k) => !(day.kitState[k.name.trim().toLowerCase()] ?? k.commonlyAtHome)).length;
  const setupTime = data.user.settings.eveningReminder ?? "21:00";
  const pinElves = heroIdea ? rolesToElves(heroIdea.roles, elves) : elves;

  return (
    <section className="planner" aria-label="Night plan">
      <div className="section-head">
        <h2 className="section-title">{heading}</h2>
        {date !== homeDate && (
          <button className="link-btn small" onClick={() => setDate(homeDate)}>
            {homeLabel}
          </button>
        )}
      </div>
      {error && <p className="error">{error}</p>}

      {busy === "generate" ? (
        <Working />
      ) : hero ? (
        <>
          <div className="between">
            <span className="eyebrow">
              {meta.dayNumber ? `Night ${meta.dayNumber}` : "Bonus night"} · {roomName}
              {day.isBusy ? " · busy" : ""}
            </span>
            {hero.kind === "pick" ? (
              <span className="format-badge">From {hero.post.author.elfName}</span>
            ) : elves.length > 1 && heroIdea ? (
              <span className="format-badge">
                <ElfStack elves={pinElves} /> {formatWord(heroIdea.format) || "Night"}
              </span>
            ) : elves[0] ? (
              <ElfAvatar elf={elves[0]} />
            ) : null}
          </div>

          <button className="photo" onClick={() => setSheet("idea")} aria-label="Open the full plan" style={{ padding: 0, cursor: "pointer" }}>
            {hero.kind === "pick" ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={hero.post.photoUrl} alt="" />
            ) : room?.photos[0] ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={room.photos[0].url} alt="" />
            ) : (
              <>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={samplePhoto(room?.name ?? roomName, room?.isKidsRoom)} alt="" className="sample-img" />
                <span className="sample">Example photo · {room ? `add your ${room.name.toLowerCase()}` : roomName ? `add your ${roomName.toLowerCase()} in Rooms` : "add a room photo"}</span>
              </>
            )}
            {heroIdea &&
              heroIdea.roles.map((r, i) => {
                const elf = elves.find((e) => e.name === r.elf) ?? { name: r.elf, color: "elf3" as const };
                const spot = room?.inventory?.spots.find((s) => s.label.toLowerCase() === r.spotLabel.toLowerCase());
                const x = spot?.x ?? 0.25 + (i * 0.5) / Math.max(1, heroIdea.roles.length - 1 || 1);
                const y = spot?.y ?? 0.4 + i * 0.25;
                return <Pin key={i} elf={elf} label={r.spotLabel || r.roomName} x={Math.min(0.85, Math.max(0.15, x))} y={Math.min(0.85, Math.max(0.15, y))} />;
              })}
          </button>

          <button className="card" style={{ border: 0, padding: 0 }} onClick={() => setSheet("idea")}>
            <h3 className="title">{hero.kind === "idea" ? hero.idea.title : hero.post.title}</h3>
            <p className="body" style={{ marginTop: 8 }}>
              {hero.kind === "idea" ? hero.idea.pitch : hero.post.pitch}
            </p>
            {hero.kind === "pick" && (
              <p className="muted small" style={{ marginTop: 6 }}>
                {hero.reason}
              </p>
            )}
          </button>

          <Tiles
            items={
              hero.kind === "idea"
                ? [
                    { label: "Set-up", value: `${hero.idea.setupMinutes} min` },
                    { label: "Mess", value: messWord(hero.idea.mess) },
                    { label: "Spook", value: `${hero.idea.spook} / 5` },
                  ]
                : [
                    { label: "Set-up", value: `${hero.post.setupMinutes} min` },
                    { label: "Mess", value: messWord(hero.post.mess) },
                    { label: "Spook", value: `${hero.post.spook} / 5` },
                  ]
            }
          />

          <div className="pills">
            <Link href={`/kit?from=${date}`} className="pill between">
              <span>{kit.length === 0 ? "Kit: nothing needed" : toBuy === 0 ? "Kit: all at home" : `Kit: ${toBuy} to buy`}</span>
              <span className="acc bold">›</span>
            </Link>
            <button className="pill" onClick={() => setSheet("remind")}>
              <MessageSquare {...ICON_SM} className="pine" /> Remind me {friendlyTime(setupTime)}
            </button>
          </div>

          {day.status === "done" && day.result && (
            <div className="card filled stack">
              <div className="eyebrow">Done · the kids {REACTIONS[day.result.reaction - 1]?.toLowerCase()}</div>
              {day.result.photoUrl && (
                <div className="photo">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={day.result.photoUrl} alt="" />
                </div>
              )}
              {day.result.learned && <p className="body">{day.result.learned}</p>}
              {day.postId ? (
                <Link href={`/ideas/${day.postId}`} className="link-btn small">
                  Shared with other elves ›
                </Link>
              ) : (
                <button className="link-btn small" onClick={() => void run("reopen", () => api.reopen(date))}>
                  Undo
                </button>
              )}
            </div>
          )}
        </>
      ) : (
        <div className="card filled stack">
          {meta.dayNumber && (
            <div className="eyebrow">
              Night {meta.dayNumber} of {meta.seasonLength}
            </div>
          )}
          <h3 className="card-title">Nothing planned yet</h3>
          <p className="body">
            {emptyText ??
              (data.rooms.length === 0
                ? "Add a couple of rooms first and the ideas will fit your actual house. Or just plan tonight and the elves will improvise."
                : "Tap Plan for three options built for your rooms, plus one from another family.")}
          </p>
          {data.challenge && (
            <Link href={`/ideas/challenges/${data.challenge.id}`} className="link-btn small">
              This week&apos;s challenge: {data.challenge.title} ›
            </Link>
          )}
          {day.status === "skipped" && (
            <p className="muted small">
              The elves had the night off.{" "}
              <button className="link-btn small" onClick={() => void run("reopen", () => api.reopen(date))}>
                Reopen
              </button>
            </p>
          )}
        </div>
      )}

      <Actions>
        {day.status === "planned" && chosen && date > today ? (
          <>
            <button className="btn secondary" onClick={() => void run("unchoose", () => api.unchoose(date))} disabled={busy !== null}>
              Change
            </button>
            <Link href={`/kit?from=${date}`} className="btn primary">
              {toBuy > 0 ? `Kit bag · ${toBuy} to buy` : "Check the kit bag"}
            </Link>
          </>
        ) : day.status === "planned" && chosen ? (
          <>
            <button className="btn secondary" onClick={() => void run("unchoose", () => api.unchoose(date))} disabled={busy !== null}>
              Change
            </button>
            <button className="btn primary" onClick={() => setSheet("complete")} disabled={busy !== null}>
              How did it go?
            </button>
          </>
        ) : day.status === "done" ? (
          <>
            <button className="btn secondary" onClick={() => setDate(shiftDate(date, 1))}>
              Tomorrow
            </button>
            {day.result?.photoUrl && !day.postId ? (
              <button className="btn primary" onClick={() => setSheet("share")}>
                <Share2 {...ICON_SM} /> Share with other elves
              </button>
            ) : (
              <Link href="/ideas" className="btn primary">
                See other elves
              </Link>
            )}
          </>
        ) : hero ? (
          <>
            <button className="btn secondary" onClick={shuffle} disabled={busy !== null}>
              Shuffle
            </button>
            <button className="btn primary" onClick={() => void markSetUp()} disabled={busy !== null}>
              {busy === "choose" ? "…" : "Mark as set up"}
            </button>
          </>
        ) : (
          <>
            <button className="btn secondary" onClick={() => setSheet("tweak")} disabled={busy !== null}>
              Tweak
            </button>
            <button className="btn primary" onClick={() => void generate()} disabled={busy !== null}>
              {date === today ? "Plan tonight" : "Plan this night"}
            </button>
          </>
        )}
      </Actions>

      {sheet === "idea" && hero?.kind === "idea" && (
        <IdeaSheet
          idea={hero.idea}
          elves={elves}
          onClose={() => setSheet("none")}
          onFavourite={() => void toggleFavourite(hero.idea)}
          actions={
            day.status === "open" && (
              <>
                <button className="btn" onClick={() => setSheet("tweak")}>
                  Remix this one
                </button>
                <button className="btn primary" onClick={() => void markSetUp().then(() => setSheet("none"))}>
                  Mark as set up
                </button>
              </>
            )
          }
        />
      )}
      {sheet === "idea" && hero?.kind === "pick" && (
        <Sheet eyebrow={`From ${hero.post.author.elfName}'s house`} title={hero.post.title} onClose={() => setSheet("none")}>
          <p className="body">{hero.reason}</p>
          <Link href={`/ideas/${hero.post.id}`} className="btn full">
            See the full post
          </Link>
          <button className="btn primary full" onClick={() => void markSetUp().then(() => setSheet("none"))}>
            Do this tonight
          </button>
        </Sheet>
      )}

      {sheet === "tweak" && (
        <Sheet eyebrow={heroIdea ? "Remix or fresh batch" : "Tonight"} title="What's the mood?" onClose={() => setSheet("none")}>
          <Chips options={DIRECTIONS} value={direction} onChange={setDirection} multi />
          <input className="input" placeholder="Anything else? e.g. school day, grandma is staying" value={custom} onChange={(e) => setCustom(e.target.value)} />
          {data.rooms.length > 0 && (
            <select className="input" value={focusRoomId} onChange={(e) => setFocusRoomId(e.target.value)} aria-label="Focus room">
              <option value="">Any room</option>
              {data.rooms.map((r) => (
                <option key={r.id} value={r.id}>
                  Focus on {r.name}
                </option>
              ))}
            </select>
          )}
          <label className="check-line">
            <Checkbox on={day.isBusy} onChange={(v) => void run("busy", () => api.setBusy(date, v))} label="Busy night" />
            Busy night: 5 minutes, no mess, nothing to buy
          </label>
          {heroIdea && (
            <button className="btn full" onClick={() => void run("remix", () => api.remix(date, heroIdea.id, fullDirection)).then(() => setSheet("none"))}>
              Remix just this idea
            </button>
          )}
          <button className="btn primary full large" onClick={() => void generate()}>
            {heroIdea ? "Three new ideas" : "Plan tonight"}
          </button>
          {day.ideas.length === 0 && (
            <button className="link-btn" onClick={() => void run("skip", () => api.skip(date)).then(() => setSheet("none"))}>
              The elves are having the night off
            </button>
          )}
        </Sheet>
      )}

      {sheet === "complete" && (
        <CompleteSheet
          busy={busy === "complete"}
          onClose={() => setSheet("none")}
          onSubmit={(b) =>
            void run("complete", () => api.complete(date, b)).then((r) => {
              if (r) setSheet(b.photo ? "share" : "none");
            })
          }
        />
      )}

      {sheet === "share" && (
        <ShareSheet
          busy={busy === "share"}
          hasCircles={data.circles.length > 0}
          challenge={data.challenge && date >= data.challenge.startsOn && date <= data.challenge.endsOn ? data.challenge.title : null}
          onClose={() => setSheet("none")}
          onSubmit={(b) => void run("share", () => api.share(date, b)).then((r) => r && setSheet("none"))}
        />
      )}

      {sheet === "remind" && hero && (
        <AssistantSheet
          title={`Remind me at ${friendlyTime(setupTime)}`}
          message={remindMessage(
            friendlyTime(setupTime),
            hero.kind === "idea" ? hero.idea.title : hero.post.title,
            roomName || "house",
            kit.map((k) => k.name),
          )}
          settings={data.user.settings.assistant}
          onChannel={(channel) => void api.saveSettings({ assistant: { channel } }).then(actions.setSettings)}
          onClose={() => setSheet("none")}
        />
      )}
    </section>
  );
}

function CompleteSheet({ busy, onClose, onSubmit }: { busy: boolean; onClose: () => void; onSubmit: (b: { photo: string | null; reaction: number; feedbackTags: string[]; notes: string }) => void }) {
  const [photos, setPhotos] = useState<string[]>([]);
  const [reaction, setReaction] = useState(4);
  const [tags, setTags] = useState<string[]>([]);
  const [notes, setNotes] = useState("");
  return (
    <Sheet eyebrow="Morning after" title="How did it go?" onClose={onClose}>
      {busy ? (
        <Working label="The elves are taking notes…" />
      ) : (
        <>
          <div className="eyebrow">Photo of what you built (the elves learn from this)</div>
          <PhotoPicker photos={photos} onChange={setPhotos} multiple={false} label="Choose" />
          <div className="eyebrow">The kids</div>
          <div className="reactions" role="radiogroup" aria-label="Kids' reaction">
            {REACTIONS.map((r, i) => (
              <button key={r} role="radio" aria-checked={reaction === i + 1} className={reaction === i + 1 ? "on" : ""} onClick={() => setReaction(i + 1)}>
                {r}
              </button>
            ))}
          </div>
          <div className="eyebrow">Tell the elves</div>
          <Chips options={FEEDBACK} value={tags} onChange={setTags} multi />
          <textarea className="input" rows={3} placeholder="What actually happened? What would you change?" value={notes} onChange={(e) => setNotes(e.target.value)} />
          <button className="btn primary large full" onClick={() => onSubmit({ photo: photos[0] ?? null, reaction, feedbackTags: tags, notes })}>
            Save and learn
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
    <Sheet eyebrow="Other elves" title="Share this night" onClose={onClose}>
      {busy ? (
        <Working label="Packaging it up for other parents…" />
      ) : (
        <>
          <p className="body">
            Your photo plus a how-to written from what you actually built. Other families can upvote it, save it and do it in their own house. Your kids&apos; names and your room photos are never
            shared.
          </p>
          <textarea className="input" rows={3} placeholder="Anything to add? What you changed, a tip for other parents" value={description} onChange={(e) => setDescription(e.target.value)} />
          <Segment
            options={[
              { key: "public" as const, label: "Everyone" },
              { key: "circles" as const, label: "Just my circles", disabled: !hasCircles },
            ]}
            value={visibility}
            onChange={setVisibility}
          />
          {challenge && (
            <label className="check-line">
              <Checkbox on={enterChallenge} onChange={setEnterChallenge} label="Enter the challenge" />
              <span>
                Enter this week&apos;s challenge: <strong>{challenge}</strong>
              </span>
            </label>
          )}
          <button className="btn primary large full" onClick={() => onSubmit({ description, visibility, enterChallenge })}>
            Share it
          </button>
          <button className="link-btn" onClick={onClose}>
            Not this one
          </button>
        </>
      )}
    </Sheet>
  );
}
