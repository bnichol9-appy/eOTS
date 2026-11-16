"use client";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { PostCard } from "@/components/PostCard";
import { Topbar, Working } from "@/components/ui";
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

  if (error) return <div className="screen"><p className="error">{error}</p></div>;
  if (!challenge) return <div className="screen"><Working label="Loading…" /></div>;

  return (
    <div className="screen">
      <Topbar eyebrow={`${prettyDate(challenge.startsOn)} to ${prettyDate(challenge.endsOn)} · ${challenge.status === "active" ? "open now" : challenge.status}`} title={challenge.title} back={() => router.back()} />
      <div className="card filled stack">
        <p className="body">{challenge.description}</p>
        {challenge.status === "active" && <p className="small muted">To enter: finish a night, add a photo, tap Share and tick the challenge box. Most upvotes when the week ends wins.</p>}
        {challenge.winner && (
          <p className="body">
            Winner: <Link href={`/ideas/${challenge.winner.postId}`}>{challenge.winner.title}</Link> by <Link href={`/ideas/elf/${challenge.winner.handle}`}>{challenge.winner.elfName}</Link>
          </p>
        )}
      </div>
      <div className="eyebrow">Leaderboard</div>
      {entries.length === 0 && <p className="muted small">No entries yet. Be first.</p>}
      {entries.map((p, i) => (
        <div key={p.id} className="ranked">
          <span className="rank">{i === 0 ? "1st" : i === 1 ? "2nd" : i === 2 ? "3rd" : `#${i + 1}`}</span>
          <PostCard post={p} onVote={(x) => void api.vote(x.id).then((v) => patch(x.id, (q) => ({ ...q, upvotes: v.upvotes, viewer: { ...q.viewer, voted: v.voted } })))} onSave={(x) => void api.savePost(x.id).then((v) => patch(x.id, (q) => ({ ...q, viewer: { ...q.viewer, saved: v.saved } })))} />
        </div>
      ))}
    </div>
  );
}
