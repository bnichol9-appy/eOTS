"use client";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useApp } from "@/components/AppContext";
import { PostCard } from "@/components/PostCard";
import { Topbar, Working } from "@/components/ui";
import { api } from "@/lib/client/api";
import { errorMessage, prettyDate } from "@/lib/client/utils";
import type { Circle, PostSummary } from "@/lib/types";

export default function CirclePage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { actions } = useApp();
  const [circle, setCircle] = useState<Circle | null>(null);
  const [posts, setPosts] = useState<PostSummary[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    api
      .circle(id)
      .then((r) => {
        setCircle(r.circle);
        setPosts(r.posts);
      })
      .catch((e) => setError(errorMessage(e)));
  }, [id]);

  function patch(pid: string, fn: (p: PostSummary) => PostSummary) {
    setPosts((ps) => ps.map((p) => (p.id === pid ? fn(p) : p)));
  }

  async function share() {
    const text = `Join my Trick or Tinsel circle "${circle!.name}" with code ${circle!.inviteCode}`;
    try {
      if (navigator.share) await navigator.share({ text });
      else {
        await navigator.clipboard.writeText(text);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      }
    } catch {
      /* cancelled */
    }
  }

  if (error) return <div className="screen"><p className="error">{error}</p></div>;
  if (!circle) return <div className="screen"><Working label="Loading…" /></div>;

  return (
    <div className="screen">
      <Topbar eyebrow={`${circle.memberCount} ${circle.memberCount === 1 ? "family" : "families"}`} title={circle.name} back={() => router.back()} />
      <div className="card filled stack">
        <p className="body">
          Invite code: <strong className="code">{circle.inviteCode}</strong>
        </p>
        <div className="row">
          <button className="btn primary small grow" onClick={() => void share()}>
            {copied ? "Copied" : "Invite parents"}
          </button>
          <button
            className="btn small grow"
            onClick={() => {
              if (confirm(circle.isOwner ? "Delete this circle for everyone?" : "Leave this circle?"))
                void api.leaveCircle(circle.id).then(() => actions.reload()).then(() => router.replace("/ideas")).catch((e) => setError(errorMessage(e)));
            }}
          >
            {circle.isOwner ? "Delete circle" : "Leave"}
          </button>
        </div>
        <div className="eyebrow">Members</div>
        <div className="list">
          {circle.members.map((m) => (
            <div key={m.familyId} className="list-row">
              <Link href={`/ideas/elf/${m.handle}`}>{m.elfName}</Link>
              <span className="right">{m.parents}</span>
            </div>
          ))}
        </div>
      </div>
      {circle.recent.length > 0 && (
        <div className="card stack">
          <div className="eyebrow">Last nights</div>
          {circle.recent.map((r, i) => (
            <p key={i} className="small body">
              <span className="muted">{prettyDate(r.date)}</span> · <strong>{r.elfName}</strong> did {r.postId ? <Link href={`/ideas/${r.postId}`}>{r.title}</Link> : <em>{r.title}</em>}
            </p>
          ))}
        </div>
      )}
      <div className="eyebrow">Shared in this circle</div>
      {posts.length === 0 && <p className="muted small">Nothing shared yet. When a member shares a night it shows up here, even if they chose &quot;just my circles&quot;.</p>}
      {posts.map((p) => (
        <PostCard key={p.id} post={p} onVote={(x) => void api.vote(x.id).then((v) => patch(x.id, (q) => ({ ...q, upvotes: v.upvotes, viewer: { ...q.viewer, voted: v.voted } })))} onSave={(x) => void api.savePost(x.id).then((v) => patch(x.id, (q) => ({ ...q, viewer: { ...q.viewer, saved: v.saved } })))} />
      ))}
    </div>
  );
}
