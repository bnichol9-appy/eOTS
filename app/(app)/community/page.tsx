"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { useApp } from "@/components/AppContext";
import { PostCard } from "@/components/PostCard";
import { PageHead, Sheet, Working } from "@/components/ui";
import { api } from "@/lib/client/api";
import { errorMessage } from "@/lib/client/utils";
import { ROOM_TYPES, type PostSummary } from "@/lib/types";

const SORTS = [
  { key: "hot", label: "Trending" },
  { key: "new", label: "New" },
  { key: "top", label: "All-time" },
];

export default function CommunityPage() {
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

  async function vote(p: PostSummary) {
    patch(p.id, (x) => ({ ...x, upvotes: x.upvotes + (x.viewer.voted ? -1 : 1), viewer: { ...x.viewer, voted: !x.viewer.voted } }));
    try {
      const r = await api.vote(p.id);
      patch(p.id, (x) => ({ ...x, upvotes: r.upvotes, viewer: { ...x.viewer, voted: r.voted } }));
    } catch (e) {
      setError(errorMessage(e));
    }
  }

  async function save(p: PostSummary) {
    patch(p.id, (x) => ({ ...x, viewer: { ...x.viewer, saved: !x.viewer.saved } }));
    try {
      const r = await api.savePost(p.id);
      patch(p.id, (x) => ({ ...x, viewer: { ...x.viewer, saved: r.saved } }));
      await actions.reload();
    } catch (e) {
      setError(errorMessage(e));
    }
  }

  return (
    <div>
      <PageHead
        title="Other elves"
        sub="Real setups other parents built, photographed and rated."
        right={
          <Link href={`/community/elf/${data.family.handle}`} className="icon-btn" aria-label="My elf page">
            🧝
          </Link>
        }
      />

      {data.challenge ? (
        <Link href={`/community/challenges/${data.challenge.id}`} className="card challenge-banner">
          <span className="eyebrow">This week&apos;s challenge · {data.challenge.entries} entries</span>
          <strong>🎯 {data.challenge.title}</strong>
          <span className="small muted">{data.challenge.description}</span>
        </Link>
      ) : (
        <Link href="/community/challenges" className="small muted block">
          See the season&apos;s challenges ›
        </Link>
      )}

      <div className="circles-row">
        {data.circles.map((c) => (
          <Link key={c.id} href={`/community/circles/${c.id}`} className="circle-chip">
            👥 {c.name} <span className="muted">· {c.memberCount}</span>
          </Link>
        ))}
        <button className="circle-chip add" onClick={() => setCircleSheet(true)}>
          + {data.circles.length ? "Circle" : "Start or join a circle"}
        </button>
      </div>

      <div className="segment">
        {SORTS.map((s) => (
          <button key={s.key} className={sort === s.key ? "on" : ""} onClick={() => setSort(s.key)}>
            {s.label}
          </button>
        ))}
      </div>
      <select className="input" value={room} onChange={(e) => setRoom(e.target.value)}>
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
        <div className="card notice">Nothing here yet. Finish a night, add a photo, and tap “Share with other parents” to post the first one.</div>
      ) : (
        posts.map((p) => <PostCard key={p.id} post={p} onVote={vote} onSave={save} />)
      )}

      {circleSheet && <CircleSheet onClose={() => setCircleSheet(false)} />}
    </div>
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
    <Sheet title="Circles" onClose={onClose}>
      <p className="muted small">A private group: the school parents, the cousins, your street. Members see each other&apos;s nights and can share setups just to the circle.</p>
      <p className="eyebrow">Start one</p>
      <div className="row">
        <input className="input" placeholder="Name, e.g. Year 2 parents" value={name} onChange={(e) => setName(e.target.value)} />
        <button className="btn primary" disabled={!name.trim() || busy} onClick={() => void go(() => api.createCircle(name))}>
          Create
        </button>
      </div>
      <p className="eyebrow">Or join with a code</p>
      <div className="row">
        <input className="input" placeholder="CIR-XXXX-XXXX" value={code} onChange={(e) => setCode(e.target.value.toUpperCase())} />
        <button className="btn ghost" disabled={!code.trim() || busy} onClick={() => void go(() => api.joinCircle(code))}>
          Join
        </button>
      </div>
      {error && <p className="error">{error}</p>}
    </Sheet>
  );
}
