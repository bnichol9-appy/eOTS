"use client";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { PostCard } from "@/components/PostCard";
import { PageHead, Working } from "@/components/ui";
import { api } from "@/lib/client/api";
import { errorMessage, localDate, prettyDate } from "@/lib/client/utils";
import type { Challenge, PostSummary } from "@/lib/types";

export default function ChallengePage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [challenge, setChallenge] = useState<Challenge | null>(null);
  const [entries, setEntries] = useState<PostSummary[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api
      .challenge(id, localDate())
      .then((r) => {
        setChallenge(r.challenge);
        setEntries(r.entries);
      })
      .catch((e) => setError(errorMessage(e)));
  }, [id]);

  function patch(pid: string, fn: (p: PostSummary) => PostSummary) {
    setEntries((ps) => ps.map((p) => (p.id === pid ? fn(p) : p)));
  }

  if (error) return <p className="error">{error}</p>;
  if (!challenge) return <Working label="Loading…" />;

  return (
    <div>
      <PageHead
        title={`🎯 ${challenge.title}`}
        sub={`${prettyDate(challenge.startsOn)} to ${prettyDate(challenge.endsOn)} · ${challenge.status === "active" ? "open now" : challenge.status}`}
        left={
          <button className="icon-btn" onClick={() => router.back()} aria-label="Back">
            ‹
          </button>
        }
      />
      <div className="card">
        <p>{challenge.description}</p>
        {challenge.status === "active" && <p className="small muted">To enter: finish a night, add a photo, tap Share and tick the challenge box. Most upvotes when the week ends wins.</p>}
        {challenge.winner && (
          <p>
            🥇 Winner: <Link href={`/community/${challenge.winner.postId}`}>{challenge.winner.title}</Link> by <Link href={`/community/elf/${challenge.winner.handle}`}>{challenge.winner.elfName}</Link>
          </p>
        )}
      </div>
      <h2 className="section">Leaderboard</h2>
      {entries.length === 0 && <p className="muted small">No entries yet. Be first.</p>}
      {entries.map((p, i) => (
        <div key={p.id} className="ranked">
          <span className="rank">{i === 0 ? "🥇" : i === 1 ? "🥈" : i === 2 ? "🥉" : `#${i + 1}`}</span>
          <PostCard
            post={p}
            onVote={(x) => void api.vote(x.id).then((v) => patch(x.id, (q) => ({ ...q, upvotes: v.upvotes, viewer: { ...q.viewer, voted: v.voted } })))}
            onSave={(x) => void api.savePost(x.id).then((v) => patch(x.id, (q) => ({ ...q, viewer: { ...q.viewer, saved: v.saved } })))}
          />
        </div>
      ))}
    </div>
  );
}
