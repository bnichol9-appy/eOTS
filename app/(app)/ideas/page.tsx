"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Bookmark, ChevronRight, Plus, Search, Sparkles, Trophy, User, Users, X } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useApp } from "@/components/AppContext";
import { SectionHead } from "@/components/home/Sections";
import { IdeaSheet } from "@/components/IdeaSheet";
import { PostCard } from "@/components/PostCard";
import { Actions, Chips, ICON_SM, Segment, Sheet, Topbar, Working } from "@/components/ui";
import { api } from "@/lib/client/api";
import { errorMessage, localDate, timeAgo } from "@/lib/client/utils";
import { samplePhoto } from "@/lib/placeholders";
import { ROOM_TYPES, formatWord, messWord, type Idea, type PostSummary, type Room } from "@/lib/types";

const SM = { size: 16, strokeWidth: 1.8 };
const TAB_KEY = "eots.ideasTab";
const SORTS = [
  { key: "hot", label: "Trending" },
  { key: "new", label: "New" },
  { key: "top", label: "All-time" },
];

const cap = (r: string) => r.charAt(0).toUpperCase() + r.slice(1);
const needsShopping = (i: Idea) => i.kit.some((k) => !k.commonlyAtHome);

/** Ideas: your own library as browsable shelves, and the other-elves community. */
export default function IdeasPage() {
  const [tab, setTab] = useState<"mine" | "elves">("mine");

  useEffect(() => {
    try {
      const t = new URLSearchParams(window.location.search).get("tab") ?? localStorage.getItem(TAB_KEY);
      if (t === "mine" || t === "elves") setTab(t);
    } catch {
      /* private mode */
    }
  }, []);

  function change(t: "mine" | "elves") {
    setTab(t);
    try {
      localStorage.setItem(TAB_KEY, t);
    } catch {
      /* private mode */
    }
  }

  return (
    <div className={`screen home ${tab === "mine" ? "has-actions" : ""}`}>
      <Topbar eyebrow="Ideas" title={tab === "mine" ? "For your house" : "Other elves"} />
      <Segment
        options={[
          { key: "mine" as const, label: "Your house" },
          {
            key: "elves" as const,
            label: (
              <>
                <Users {...ICON_SM} /> Other elves
              </>
            ),
          },
        ]}
        value={tab}
        onChange={change}
      />
      {tab === "mine" ? <YourHouse /> : <OtherElves />}
    </div>
  );
}

/* ---------- Your house ---------- */

function roomPhoto(rooms: Room[], idea: Idea) {
  const room = rooms.find((r) => r.name.toLowerCase() === idea.roomName.toLowerCase());
  return { url: room?.photos[0]?.url ?? samplePhoto(idea.roomName, room?.isKidsRoom), sample: !room?.photos[0] };
}

function YourHouse() {
  const { data, actions } = useApp();
  const router = useRouter();
  const [q, setQ] = useState("");
  const [room, setRoom] = useState<string | null>(null);
  const [open, setOpen] = useState<Idea | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const today = localDate();
  const todayDay = data.days.find((d) => d.date === today);
  const tonightId = todayDay?.chosenIdeaId ?? null;
  const lib = data.library;
  const twoElves = data.profile.elves.length > 1;

  const searching = q.trim().length > 0 || room !== null;
  const results = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return lib.filter((i) => {
      if (room && i.roomName.toLowerCase() !== room.toLowerCase()) return false;
      if (needle && ![i.title, i.pitch, i.roomName, ...i.tags, ...i.kit.map((k) => k.name)].join(" ").toLowerCase().includes(needle)) return false;
      return true;
    });
  }, [lib, q, room]);

  const rooms = useMemo(() => {
    const counts = new Map<string, number>();
    for (const i of lib) counts.set(i.roomName, (counts.get(i.roomName) ?? 0) + 1);
    return [...counts.entries()].sort((a, b) => b[1] - a[1]).map(([name]) => name);
  }, [lib]);

  const shelves = [
    { key: "saved", title: "Saved", items: lib.filter((i) => i.favourite) },
    { key: "quick", title: "Quick wins · 5 minutes or less", items: lib.filter((i) => i.setupMinutes <= 5) },
    ...(twoElves ? [{ key: "duo", title: "Both elves", items: lib.filter((i) => i.format !== "single") }] : []),
    { key: "nobuy", title: "Nothing to buy", items: lib.filter((i) => !needsShopping(i)) },
    { key: "spooky", title: "Properly spooky", items: lib.filter((i) => i.spook >= 4) },
  ].filter((s) => s.items.length > 0);

  async function toggleFavourite(idea: Idea) {
    try {
      const updated = await api.favourite(idea.id);
      actions.setFavourites((f) => (updated.favourite ? [updated, ...f.filter((x) => x.id !== updated.id)] : f.filter((x) => x.id !== updated.id)));
      await actions.reload();
      if (open?.id === idea.id) setOpen(updated);
    } catch (e) {
      setError(errorMessage(e));
    }
  }

  async function dreamUp() {
    setBusy(true);
    setError(null);
    try {
      const target = !todayDay || todayDay.status === "open" ? today : (data.days.filter((d) => d.date > today && d.status === "open").sort((a, b) => a.date.localeCompare(b.date))[0]?.date ?? today);
      const r = await api.generate(target, q.trim(), null);
      actions.setDay(r.day);
      await actions.reload();
      actions.toast(target === today ? "Three new ideas are on Home for tonight." : `Three new ideas added for ${target}.`);
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setBusy(false);
    }
  }

  const tile = (i: Idea) => <IdeaTile key={i.id} idea={i} photo={roomPhoto(data.rooms, i)} tonight={i.id === tonightId} onOpen={() => setOpen(i)} onSave={() => void toggleFavourite(i)} />;

  return (
    <>
      <div className="search">
        <Search {...ICON_SM} />
        <input className="input" placeholder="Search: torch, socks, bathroom…" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Search ideas" />
        {q && (
          <button className="search-clear" onClick={() => setQ("")} aria-label="Clear search">
            <X {...SM} />
          </button>
        )}
      </div>
      {rooms.length > 1 && <Chips options={rooms} value={room ? [room] : []} onChange={(v) => setRoom(v[0] ?? null)} scroll />}
      {error && <p className="error">{error}</p>}
      {busy && <Working />}

      {lib.length === 0 && !busy ? (
        <section className="countdown">
          <div className="eyebrow">Your library</div>
          <h2 className="card-title">Every idea you&apos;re shown lands here</h2>
          <p className="body">Plan a night (or tap below) and the set-ups the elves come up with collect here, saved or not, ready to reuse on a busy night.</p>
        </section>
      ) : searching ? (
        <section aria-label="Results">
          <SectionHead title={`${results.length} idea${results.length === 1 ? "" : "s"}`} />
          {results.length === 0 ? (
            <p className="muted">Nothing matches. Try another word, or dream up new ones with that in mind.</p>
          ) : (
            <div className="idea-list">
              {results.map((i) => (
                <IdeaRow key={i.id} idea={i} photo={roomPhoto(data.rooms, i)} tonight={i.id === tonightId} onOpen={() => setOpen(i)} />
              ))}
            </div>
          )}
        </section>
      ) : (
        <>
          {shelves.map((s) => (
            <section key={s.key} aria-label={s.title}>
              <SectionHead title={s.title} action={<span className="muted small">{s.items.length}</span>} />
              <div className="post-strip" role="list">
                {s.items.slice(0, 10).map(tile)}
              </div>
            </section>
          ))}
          <section aria-label="Everything">
            <SectionHead title="Everything" action={<span className="muted small">{lib.length}</span>} />
            <div className="idea-list">
              {lib.map((i) => (
                <IdeaRow key={i.id} idea={i} photo={roomPhoto(data.rooms, i)} tonight={i.id === tonightId} onOpen={() => setOpen(i)} />
              ))}
            </div>
          </section>
        </>
      )}

      <Actions>
        <button className="btn primary" onClick={() => void dreamUp()} disabled={busy}>
          <Sparkles {...ICON_SM} /> {q.trim() ? `Dream up 3 with "${q.trim().slice(0, 18)}"` : "Dream up 3 more"}
        </button>
      </Actions>

      {open && (
        <IdeaSheet
          idea={open}
          elves={data.profile.elves}
          onClose={() => setOpen(null)}
          onFavourite={() => void toggleFavourite(open)}
          actions={
            open.id === tonightId ? (
              <Link href="/" className="btn primary full">
                It&apos;s tonight&apos;s plan · open Home
              </Link>
            ) : (
              <button
                className="btn primary full"
                onClick={() =>
                  void api
                    .useIdea(open.id, today)
                    .then((r) => {
                      actions.setDay(r.day);
                      router.push("/");
                    })
                    .catch((e) => setError(errorMessage(e)))
                }
              >
                Do this tonight
              </button>
            )
          }
        />
      )}
    </>
  );
}

function IdeaTile({ idea, photo, tonight, onOpen, onSave }: { idea: Idea; photo: { url: string; sample: boolean }; tonight: boolean; onOpen: () => void; onSave: () => void }) {
  return (
    <div className="post-mini idea-tile" role="listitem">
      <button className="idea-tile-open" onClick={onOpen} aria-label={`${idea.title}: open`}>
        <span className="photo">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={photo.url} alt="" loading="lazy" className={photo.sample ? "sample-img" : undefined} />
          {tonight && <span className="tag corner-tag">Tonight</span>}
        </span>
        <span className="post-mini-body">
          <span className="eyebrow">
            {idea.roomName}
            {idea.format !== "single" ? ` · ${formatWord(idea.format).replace(" night", "")}` : ""}
          </span>
          <strong>{idea.title}</strong>
          <span className="post-mini-stats">
            <span>{idea.setupMinutes} min</span>
            <span>{messWord(idea.mess)} mess</span>
            <span>Spook {idea.spook}</span>
          </span>
        </span>
      </button>
      <button className={`tile-save ${idea.favourite ? "on" : ""}`} onClick={onSave} aria-label={idea.favourite ? "Remove from saved" : "Save"} aria-pressed={idea.favourite}>
        <Bookmark size={18} strokeWidth={1.8} fill={idea.favourite ? "currentColor" : "none"} />
      </button>
    </div>
  );
}

function IdeaRow({ idea, photo, tonight, onOpen }: { idea: Idea; photo: { url: string; sample: boolean }; tonight: boolean; onOpen: () => void }) {
  return (
    <button className="idea-row" onClick={onOpen}>
      <span className="idea-thumb">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={photo.url} alt="" loading="lazy" />
      </span>
      <span className="grow">
        <span className="night-meta">
          {idea.roomName}
          {idea.format !== "single" ? ` · ${formatWord(idea.format).replace(" night", "")}` : ""} · {idea.setupMinutes} min
        </span>
        <span className="night-title">{idea.title}</span>
      </span>
      {tonight ? (
        <span className="tag">Tonight</span>
      ) : idea.favourite ? (
        <Bookmark size={16} strokeWidth={1.8} fill="currentColor" className="acc" aria-label="Saved" />
      ) : (
        <ChevronRight {...SM} className="muted" aria-hidden="true" />
      )}
    </button>
  );
}

/* ---------- Other elves ---------- */

function OtherElves() {
  const { data, actions } = useApp();
  const [sort, setSort] = useState("hot");
  const [room, setRoom] = useState("");
  const [posts, setPosts] = useState<PostSummary[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [circleSheet, setCircleSheet] = useState(false);
  const today = localDate();
  const challenge = data.challenge;
  const daysLeft = challenge ? Math.max(0, Math.round((Date.parse(`${challenge.endsOn}T00:00:00Z`) - Date.parse(`${today}T00:00:00Z`)) / 86_400_000)) : 0;
  const activity = data.circles
    .flatMap((c) => c.recent.map((r) => ({ ...r, circle: c.name, circleId: c.id })))
    .sort((a, b) => b.date.localeCompare(a.date))
    .slice(0, 3);

  useEffect(() => {
    setPosts(null);
    api
      .feed({ sort, room })
      .then((r) => setPosts(r.posts))
      .catch((e) => setError(errorMessage(e)));
  }, [sort, room]);

  function patch(id: string, fn: (p: PostSummary) => PostSummary) {
    setPosts((ps) => ps && ps.map((p) => (p.id === id ? fn(p) : p)));
  }

  return (
    <>
      {challenge ? (
        <Link href={`/ideas/challenges/${challenge.id}`} className="challenge">
          <span className="challenge-icon" aria-hidden="true">
            <Trophy {...SM} size={20} />
          </span>
          <span className="grow">
            <span className="eyebrow">Challenge · {daysLeft === 0 ? "last day" : `${daysLeft} day${daysLeft === 1 ? "" : "s"} left`}</span>
            <strong>{challenge.title}</strong>
            <span className="muted small">
              {challenge.entries} {challenge.entries === 1 ? "entry" : "entries"}
              {challenge.description ? ` · ${challenge.description}` : ""}
            </span>
          </span>
          <ChevronRight {...SM} className="muted" aria-hidden="true" />
        </Link>
      ) : (
        <Link href="/ideas/challenges" className="challenge">
          <span className="challenge-icon" aria-hidden="true">
            <Trophy {...SM} size={20} />
          </span>
          <span className="grow">
            <strong>The season&apos;s challenges</strong>
            <span className="muted small">A theme each week. Share a night to enter.</span>
          </span>
          <ChevronRight {...SM} className="muted" aria-hidden="true" />
        </Link>
      )}

      <section aria-label="Your circles">
        <SectionHead
          title="Your circles"
          action={
            <Link href={`/ideas/elf/${data.family.handle}`} className="link-btn small">
              My elf page
            </Link>
          }
        />
        <div className="circle-strip">
          {data.circles.map((c) => (
            <Link key={c.id} href={`/ideas/circles/${c.id}`} className="circle-card">
              <span className="challenge-icon" aria-hidden="true">
                <Users {...SM} size={18} />
              </span>
              <strong>{c.name}</strong>
              <span className="muted small">
                {c.memberCount} {c.memberCount === 1 ? "family" : "families"}
              </span>
            </Link>
          ))}
          <button className="circle-card add" onClick={() => setCircleSheet(true)}>
            <span className="challenge-icon line" aria-hidden="true">
              <Plus {...SM} size={18} />
            </span>
            <strong>{data.circles.length ? "Add a circle" : "Start a circle"}</strong>
            <span className="muted small">School friends, cousins, your street</span>
          </button>
        </div>
        {activity.length > 0 && (
          <div className="list">
            {activity.map((a, i) => (
              <Link key={i} href={a.postId ? `/ideas/${a.postId}` : `/ideas/circles/${a.circleId}`} className="list-row activity">
                <User {...SM} className="pine" aria-hidden="true" />
                <span className="grow">
                  <strong>{a.elfName}</strong> did {a.title}
                  <span className="muted small">
                    {" "}
                    · {a.circle} · {timeAgo(`${a.date}T20:00:00`)}
                  </span>
                </span>
              </Link>
            ))}
          </div>
        )}
      </section>

      <section aria-label="Set-ups from other elves">
        <SectionHead title="Set-ups" />
        <Segment options={SORTS.map((s) => ({ key: s.key, label: s.label }))} value={sort} onChange={setSort} />
        <Chips
          options={["Any room", ...ROOM_TYPES.filter((r) => r !== "other").map(cap)]}
          value={[room ? cap(room) : "Any room"]}
          onChange={(v) => setRoom(v[0] && v[0] !== "Any room" ? v[0].toLowerCase() : "")}
          scroll
        />
        {error && <p className="error">{error}</p>}
        {posts === null ? (
          <Working label="Loading…" />
        ) : posts.length === 0 ? (
          <p className="muted">Nothing here yet. Finish a night, add a photo and share it, and yours will be the first.</p>
        ) : (
          posts.map((p) => (
            <PostCard
              key={p.id}
              post={p}
              onVote={(x) => {
                patch(x.id, (y) => ({ ...y, upvotes: y.upvotes + (y.viewer.voted ? -1 : 1), viewer: { ...y.viewer, voted: !y.viewer.voted } }));
                void api
                  .vote(x.id)
                  .then((v) => patch(x.id, (y) => ({ ...y, upvotes: v.upvotes, viewer: { ...y.viewer, voted: v.voted } })))
                  .catch((e) => setError(errorMessage(e)));
              }}
              onSave={(x) => {
                patch(x.id, (y) => ({ ...y, viewer: { ...y.viewer, saved: !y.viewer.saved } }));
                void api
                  .savePost(x.id)
                  .then((v) => patch(x.id, (y) => ({ ...y, viewer: { ...y.viewer, saved: v.saved } })))
                  .then(() => actions.reload())
                  .catch((e) => setError(errorMessage(e)));
              }}
            />
          ))
        )}
      </section>
      {circleSheet && <CircleSheet onClose={() => setCircleSheet(false)} />}
    </>
  );
}

function CircleSheet({ onClose }: { onClose: () => void }) {
  const { actions } = useApp();
  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function go(fn: () => Promise<unknown>) {
    setBusy(true);
    setError(null);
    try {
      await fn();
      await actions.reload();
      onClose();
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <Sheet eyebrow="Circles" title="Your people" onClose={onClose}>
      <p className="body">A private group: the school parents, the cousins, your street. Members see each other&apos;s nights and can share setups just to the circle.</p>
      <div className="eyebrow">Start one</div>
      <div className="row">
        <input className="input" placeholder="Name, e.g. Year 2 parents" value={name} onChange={(e) => setName(e.target.value)} />
        <button className="btn primary" disabled={!name.trim() || busy} onClick={() => void go(() => api.createCircle(name))}>
          Create
        </button>
      </div>
      <div className="eyebrow">Or join with a code</div>
      <div className="row">
        <input className="input" placeholder="CIR-XXXX-XXXX" value={code} onChange={(e) => setCode(e.target.value.toUpperCase())} />
        <button className="btn" disabled={!code.trim() || busy} onClick={() => void go(() => api.joinCircle(code))}>
          Join
        </button>
      </div>
      {error && <p className="error">{error}</p>}
    </Sheet>
  );
}
