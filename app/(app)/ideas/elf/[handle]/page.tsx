"use client";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { BadgeIcon } from "@/components/icons";
import { PostCard } from "@/components/PostCard";
import { Topbar, Working } from "@/components/ui";
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

  if (error) return <div className="screen"><p className="error">{error}</p></div>;
  if (!elf) return <div className="screen"><Working label="Loading…" /></div>;

  const chaosWords = ["", "Gentle", "Playful", "Cheeky", "Chaotic", "Total mayhem"];
  return (
    <div className="screen">
      <Topbar eyebrow={`${elf.displayName} · @${elf.handle}`} title={elf.elfName} back={() => router.back()} />
      <div className="card filled stack">
        {elf.elfPersonality && <p className="body">{elf.elfPersonality}</p>}
        <div className="stats">
          {[
            [elf.stats.nightsDone, "nights"],
            [elf.stats.streak, "streak"],
            [elf.stats.posts, "shared"],
            [elf.stats.upvotesReceived, "upvotes"],
          ].map(([n, l]) => (
            <div key={l} className="tile">
              <strong>{n}</strong>
              <div className="meta">{l}</div>
            </div>
          ))}
        </div>
        <p className="small muted">Chaos setting: {chaosWords[elf.chaosLevel]}</p>
        {elf.badges.length > 0 && (
          <div className="badge-row">
            {elf.badges.map((b) => (
              <span key={b.key} title={b.name} aria-label={b.name}>
                <BadgeIcon name={b.icon} size={20} />
              </span>
            ))}
          </div>
        )}
      </div>
      <div className="eyebrow">Setups</div>
      {elf.posts.length === 0 && <p className="muted small">Nothing shared yet.</p>}
      {elf.posts.map((p) => (
        <PostCard key={p.id} post={p} onVote={(post) => void api.vote(post.id).then((r) => patch(post.id, (x) => ({ ...x, upvotes: r.upvotes, viewer: { ...x.viewer, voted: r.voted } })))} onSave={(post) => void api.savePost(post.id).then((r) => patch(post.id, (x) => ({ ...x, viewer: { ...x.viewer, saved: r.saved } })))} />
      ))}
    </div>
  );
}
