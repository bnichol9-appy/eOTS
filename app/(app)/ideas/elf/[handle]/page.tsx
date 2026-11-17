"use client";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useApp } from "@/components/AppContext";
import { SectionHead } from "@/components/home/Sections";
import { BadgeIcon } from "@/components/icons";
import { PostMini } from "@/components/PostMini";
import { Tiles, Topbar, Working } from "@/components/ui";
import { api, type ElfProfile } from "@/lib/client/api";
import { errorMessage } from "@/lib/client/utils";

const CHAOS = ["", "Gentle", "Playful", "Cheeky", "Chaotic", "Total mayhem"];

/** An elf's public page: who they are, how busy they've been, badges and what they've shared. */
export default function ElfPage() {
  const { handle } = useParams<{ handle: string }>();
  const router = useRouter();
  const { data } = useApp();
  const [elf, setElf] = useState<ElfProfile | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api
      .elf(handle)
      .then(setElf)
      .catch((e) => setError(errorMessage(e)));
  }, [handle]);

  if (error)
    return (
      <div className="screen">
        <Topbar title="Elf" back={() => router.back()} />
        <p className="error">{error}</p>
      </div>
    );
  if (!elf)
    return (
      <div className="screen">
        <Working label="Loading…" />
      </div>
    );

  const mine = handle === data.family.handle;
  return (
    <div className="screen home">
      <Topbar eyebrow={mine ? "Your elf page" : "Elf page"} title={elf.elfName} back={() => router.back()} />

      <section className="countdown" aria-label="About">
        <div className="family-top">
          <span className="elf xl elf1 elf-hero" aria-hidden="true">
            {elf.elfName.charAt(0).toUpperCase()}
          </span>
          <div className="grow">
            <div className="eyebrow">@{elf.handle}</div>
            <h2 className="card-title">Run by {elf.displayName}</h2>
            <p className="muted small">Chaos setting: {CHAOS[elf.chaosLevel] ?? "Cheeky"}</p>
          </div>
        </div>
        {elf.elfPersonality && <p className="quote">{elf.elfPersonality}</p>}
      </section>

      <Tiles
        items={[
          { label: "Nights", value: String(elf.stats.nightsDone) },
          { label: "Streak", value: String(elf.stats.streak) },
          { label: "Shared", value: String(elf.stats.posts) },
          { label: "Upvotes", value: String(elf.stats.upvotesReceived) },
        ]}
      />

      {elf.badges.length > 0 && (
        <section aria-label="Badges">
          <SectionHead title="Badges" action={<span className="muted small">{elf.badges.length}</span>} />
          <div className="hooks">
            {elf.badges.map((b) => (
              <span key={b.key} className="tag line badge-tag">
                <BadgeIcon name={b.icon} size={16} /> {b.name}
              </span>
            ))}
          </div>
        </section>
      )}

      <section aria-label="Set-ups">
        <SectionHead title="Set-ups" action={elf.posts.length ? <span className="muted small">{elf.posts.length}</span> : undefined} />
        {elf.posts.length === 0 ? (
          <p className="muted small">{mine ? "Nothing shared yet. Log a night with a photo and tap Share to put it here." : "Nothing shared yet."}</p>
        ) : (
          <div className="post-grid" role="list">
            {elf.posts.map((p) => (
              <PostMini key={p.id} post={p} grid />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
