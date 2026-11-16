"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { useApp } from "@/components/AppContext";
import { PostCard } from "@/components/PostCard";
import { PageHead, Working } from "@/components/ui";
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
        sub="Real setups other parents built, photographed and rated. Upvote the good ones, save the great ones, do them in your house."
        right={
          <Link href={`/community/elf/${data.user.handle}`} className="icon-btn" aria-label="My elf page">
            🧝
          </Link>
        }
      />
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
    </div>
  );
}
