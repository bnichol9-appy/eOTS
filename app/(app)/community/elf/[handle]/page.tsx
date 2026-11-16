"use client";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { PostCard } from "@/components/PostCard";
import { PageHead, Working } from "@/components/ui";
import { api, type ElfProfile } from "@/lib/client/api";
import { errorMessage } from "@/lib/client/utils";
import type { PostSummary } from "@/lib/types";

export default function ElfPage() {
  const { handle } = useParams<{ handle: string }>();
  const router = useRouter();
  const [elf, setElf] = useState<ElfProfile | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api
      .elf(handle)
      .then(setElf)
      .catch((e) => setError(errorMessage(e)));
  }, [handle]);

  function patch(id: string, fn: (p: PostSummary) => PostSummary) {
    setElf((e) => e && { ...e, posts: e.posts.map((p) => (p.id === id ? fn(p) : p)) });
  }

  if (error) return <p className="error">{error}</p>;
  if (!elf) return <Working label="Loading…" />;

  const chaosWords = ["", "Gentle", "Playful", "Cheeky", "Chaotic", "Total mayhem"];
  return (
    <div>
      <PageHead
        title={elf.elfName}
        sub={`${elf.displayName} · @${elf.handle}`}
        left={
          <button className="icon-btn" onClick={() => router.back()} aria-label="Back">
            ‹
          </button>
        }
      />
      <div className="card">
        <p className="muted">{elf.elfPersonality}</p>
        <div className="stats">
          <Stat n={elf.stats.nightsDone} label="nights" />
          <Stat n={elf.stats.streak} label="streak" />
          <Stat n={elf.stats.posts} label="shared" />
          <Stat n={elf.stats.upvotesReceived} label="upvotes" />
        </div>
        <p className="small muted">Chaos setting: {chaosWords[elf.chaosLevel]}</p>
      </div>
      <h2 className="section">Setups</h2>
      {elf.posts.length === 0 && <p className="muted small">Nothing shared yet.</p>}
      {elf.posts.map((p) => (
        <PostCard
          key={p.id}
          post={p}
          onVote={(post) =>
            void api.vote(post.id).then((r) => patch(post.id, (x) => ({ ...x, upvotes: r.upvotes, viewer: { ...x.viewer, voted: r.voted } })))
          }
          onSave={(post) => void api.savePost(post.id).then((r) => patch(post.id, (x) => ({ ...x, viewer: { ...x.viewer, saved: r.saved } })))}
        />
      ))}
    </div>
  );
}

function Stat({ n, label }: { n: number; label: string }) {
  return (
    <div className="stat">
      <strong>{n}</strong>
      <span>{label}</span>
    </div>
  );
}
