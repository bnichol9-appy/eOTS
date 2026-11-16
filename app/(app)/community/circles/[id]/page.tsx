"use client";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useApp } from "@/components/AppContext";
import { PostCard } from "@/components/PostCard";
import { PageHead, Working } from "@/components/ui";
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
    const text = `Join my eOTS circle "${circle!.name}" with code ${circle!.inviteCode}`;
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

  if (error) return <p className="error">{error}</p>;
  if (!circle) return <Working label="Loading…" />;

  return (
    <div>
      <PageHead
        title={circle.name}
        sub={`${circle.memberCount} ${circle.memberCount === 1 ? "family" : "families"}`}
        left={
          <button className="icon-btn" onClick={() => router.back()} aria-label="Back">
            ‹
          </button>
        }
      />
      <div className="card">
        <p>
          Invite code: <strong className="code">{circle.inviteCode}</strong>
        </p>
        <div className="row">
          <button className="btn primary" onClick={() => void share()}>
            {copied ? "Copied ✓" : "Invite parents"}
          </button>
          <button
            className="btn ghost"
            onClick={() => {
              if (confirm(circle.isOwner ? "Delete this circle for everyone?" : "Leave this circle?"))
                void api
                  .leaveCircle(circle.id)
                  .then(() => actions.reload())
                  .then(() => router.replace("/community"))
                  .catch((e) => setError(errorMessage(e)));
            }}
          >
            {circle.isOwner ? "Delete circle" : "Leave"}
          </button>
        </div>
        <p className="eyebrow">Members</p>
        <ul className="plain-list">
          {circle.members.map((m) => (
            <li key={m.familyId}>
              <Link href={`/community/elf/${m.handle}`}>{m.elfName}</Link> <span className="muted small">({m.parents})</span>
            </li>
          ))}
        </ul>
      </div>

      {circle.recent.length > 0 && (
        <>
          <h2 className="section">Last nights</h2>
          <div className="card">
            {circle.recent.map((r, i) => (
              <p key={i} className="small">
                <span className="muted">{prettyDate(r.date)}</span> · <strong>{r.elfName}</strong> did {r.postId ? <Link href={`/community/${r.postId}`}>{r.title}</Link> : <em>{r.title}</em>}
              </p>
            ))}
          </div>
        </>
      )}

      <h2 className="section">Shared in this circle</h2>
      {posts.length === 0 && <p className="muted small">Nothing shared yet. When a member shares a night, it shows up here (even if they chose &quot;just my circles&quot;).</p>}
      {posts.map((p) => (
        <PostCard
          key={p.id}
          post={p}
          onVote={(x) => void api.vote(x.id).then((v) => patch(x.id, (q) => ({ ...q, upvotes: v.upvotes, viewer: { ...q.viewer, voted: v.voted } })))}
          onSave={(x) => void api.savePost(x.id).then((v) => patch(x.id, (q) => ({ ...q, viewer: { ...q.viewer, saved: v.saved } })))}
        />
      ))}
    </div>
  );
}
