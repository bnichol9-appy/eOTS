"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Bookmark, Search, Sparkles, Users } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useApp } from "@/components/AppContext";
import { IdeaSheet } from "@/components/IdeaSheet";
import { PostCard } from "@/components/PostCard";
import { Actions, Chips, ICON_SM, Segment, Sheet, Topbar, Working } from "@/components/ui";
import { api } from "@/lib/client/api";
import { errorMessage, localDate } from "@/lib/client/utils";
import { ROOM_TYPES, formatWord, messWord, type Idea, type PostSummary } from "@/lib/types";

const FILTERS = ["All", "Duo", "Split", "Under 5 min", "Nothing to buy", "Saved"];
const SORTS = [
  { key: "hot", label: "Trending" },
  { key: "new", label: "New" },
  { key: "top", label: "All-time" },
];

export default function IdeasPage() {
  const { data, actions } = useApp();
  const router = useRouter();
  const [tab, setTab] = useState<"mine" | "elves">("mine");
  const [q, setQ] = useState("");
  const [filter, setFilter] = useState<string[]>(["All"]);
  const [open, setOpen] = useState<Idea | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const today = localDate();
  const todayDay = data.days.find((d) => d.date === today);

  const mine = useMemo(() => {
    const f = filter[0] ?? "All";
    const needle = q.trim().toLowerCase();
    return data.library.filter((i) => {
      if (f === "Duo" && i.format !== "duo") return false;
      if (f === "Split" && i.format !== "split") return false;
      if (f === "Under 5 min" && i.setupMinutes > 5) return false;
      if (f === "Nothing to buy" && i.kit.some((k) => !k.commonlyAtHome)) return false;
      if (f === "Saved" && !i.favourite) return false;
      if (needle && ![i.title, i.pitch, i.roomName, ...i.tags, ...i.kit.map((k) => k.name)].join(" ").toLowerCase().includes(needle)) return false;
      return true;
    });
  }, [data.library, filter, q]);

  async function toggleFavourite(idea: Idea) {
    try {
      const updated = await api.favourite(idea.id);
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
      const target = !todayDay || todayDay.status === "open" ? today : data.days.filter((d) => d.date > today && d.status === "open").sort((a, b) => a.date.localeCompare(b.date))[0]?.date ?? today;
      const r = await api.generate(target, q.trim(), null);
      actions.setDay(r.day);
      await actions.reload();
      actions.toast(target === today ? "Three new ideas are on Tonight." : `Three new ideas added for ${target}.`);
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className={`screen ${tab === "mine" ? "has-actions" : ""}`}>
      <Topbar title={tab === "mine" ? "Ideas for your house" : "Other elves"} />
      <Segment
        options={[
          { key: "mine" as const, label: "Your house" },
          { key: "elves" as const, label: <><Users {...ICON_SM} /> Other elves</> },
        ]}
        value={tab}
        onChange={setTab}
      />
      {error && <p className="error">{error}</p>}

      {tab === "mine" ? (
        <>
          <div className="search">
            <Search {...ICON_SM} />
            <input className="input" placeholder="Search: torch, socks, bathroom…" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Search ideas" />
          </div>
          <Chips options={data.profile.elves.length > 1 ? FILTERS : FILTERS.filter((f) => f !== "Duo" && f !== "Split")} value={filter} onChange={(v) => setFilter(v.length ? v : ["All"])} scroll />
          {busy && <Working />}
          {mine.length === 0 && !busy && <div className="card filled body">Nothing here yet. Plan a night and every idea you&apos;re shown lands here, saved or not.</div>}
          {mine.map((i) => {
            const isTonight = todayDay?.chosenIdeaId === i.id;
            return (
              <article key={i.id} className={`card idea-card ${isTonight ? "filled" : ""}`}>
                <button className="link-btn" style={{ textAlign: "left", color: "inherit", fontWeight: 400, width: "100%" }} onClick={() => setOpen(i)}>
                  <div className="between">
                    <span className="muted small">
                      {i.format !== "single" ? `${formatWord(i.format).replace(" night", "")} · ` : ""}
                      {i.roomName}
                    </span>
                    {isTonight && <span className="tag">Tonight</span>}
                  </div>
                  <h3>{i.title}</h3>
                  {!isTonight && <p className="body">{i.pitch}</p>}
                  <div className="idea-meta">
                    <span>{i.setupMinutes} min</span>
                    <span>{messWord(i.mess)} mess</span>
                    <span>Spook {i.spook}/5</span>
                  </div>
                </button>
                {!isTonight && (
                  <button className={`bookmark ${i.favourite ? "on" : ""}`} onClick={() => void toggleFavourite(i)} aria-label={i.favourite ? "Remove from saved" : "Save"} aria-pressed={i.favourite}>
                    <Bookmark size={22} strokeWidth={1.8} fill={i.favourite ? "currentColor" : "none"} />
                  </button>
                )}
              </article>
            );
          })}
          <Actions stacked>
            <button className="btn outline-accent large" onClick={() => void dreamUp()} disabled={busy}>
              <Sparkles {...ICON_SM} /> Dream up 3 more for my house
            </button>
          </Actions>
          {open && (
            <IdeaSheet
              idea={open}
              elves={data.profile.elves}
              onClose={() => setOpen(null)}
              onFavourite={() => void toggleFavourite(open)}
              actions={
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
              }
            />
          )}
        </>
      ) : (
        <OtherElves />
      )}
    </div>
  );
}

function OtherElves() {
  const { data, actions } = useApp();
  const [sort, setSort] = useState("hot");
  const [room, setRoom] = useState("");
  const [posts, setPosts] = useState<PostSummary[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [circleSheet, setCircleSheet] = useState(false);

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
      {data.challenge ? (
        <Link href={`/ideas/challenges/${data.challenge.id}`} className="card accent-border stack" style={{ gap: 2 }}>
          <span className="eyebrow">This week&apos;s challenge · {data.challenge.entries} entries</span>
          <h3>{data.challenge.title}</h3>
          <span className="body small">{data.challenge.description}</span>
        </Link>
      ) : (
        <Link href="/ideas/challenges" className="small">
          See the season&apos;s challenges ›
        </Link>
      )}
      <div className="chips scroll">
        {data.circles.map((c) => (
          <Link key={c.id} href={`/ideas/circles/${c.id}`} className="chip">
            <Users {...ICON_SM} /> {c.name} <span className="muted">· {c.memberCount}</span>
          </Link>
        ))}
        <button className="chip" onClick={() => setCircleSheet(true)}>
          + {data.circles.length ? "Circle" : "Start or join a circle"}
        </button>
        <Link href={`/ideas/elf/${data.family.handle}`} className="chip">
          My elf page
        </Link>
      </div>
      <Segment options={SORTS.map((s) => ({ key: s.key, label: s.label }))} value={sort} onChange={setSort} />
      <select className="input" value={room} onChange={(e) => setRoom(e.target.value)} aria-label="Room">
        <option value="">Any room</option>
        {ROOM_TYPES.map((r) => (
          <option key={r} value={r}>
            {r}
          </option>
        ))}
      </select>
      {error && <p className="error">{error}</p>}
      {posts === null ? (
        <Working label="Loading…" />
      ) : posts.length === 0 ? (
        <div className="card filled body">Nothing here yet. Finish a night, add a photo, and share it: you&apos;ll be the first.</div>
      ) : (
        posts.map((p) => (
          <PostCard
            key={p.id}
            post={p}
            onVote={(x) => {
              patch(x.id, (y) => ({ ...y, upvotes: y.upvotes + (y.viewer.voted ? -1 : 1), viewer: { ...y.viewer, voted: !y.viewer.voted } }));
              void api.vote(x.id).then((v) => patch(x.id, (y) => ({ ...y, upvotes: v.upvotes, viewer: { ...y.viewer, voted: v.voted } }))).catch((e) => setError(errorMessage(e)));
            }}
            onSave={(x) => {
              patch(x.id, (y) => ({ ...y, viewer: { ...y.viewer, saved: !y.viewer.saved } }));
              void api.savePost(x.id).then((v) => patch(x.id, (y) => ({ ...y, viewer: { ...y.viewer, saved: v.saved } }))).then(() => actions.reload()).catch((e) => setError(errorMessage(e)));
            }}
          />
        ))
      )}
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
