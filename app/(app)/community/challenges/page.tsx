"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { PageHead, Working } from "@/components/ui";
import { api } from "@/lib/client/api";
import { errorMessage, localDate, prettyDate } from "@/lib/client/utils";
import type { Challenge } from "@/lib/types";

export default function ChallengesPage() {
  const router = useRouter();
  const [list, setList] = useState<Challenge[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api
      .challenges(localDate())
      .then((r) => setList(r.challenges))
      .catch((e) => setError(errorMessage(e)));
  }, []);

  if (error) return <p className="error">{error}</p>;
  if (!list) return <Working label="Loading…" />;

  return (
    <div>
      <PageHead
        title="Weekly challenges"
        sub="One theme a week. Share a night into it; most upvotes by the end wins the Champion badge."
        left={
          <button className="icon-btn" onClick={() => router.back()} aria-label="Back">
            ‹
          </button>
        }
      />
      {list.map((c) => (
        <Link key={c.id} href={`/community/challenges/${c.id}`} className={`card challenge ${c.status}`}>
          <span className="eyebrow">
            {c.status === "active" ? "This week" : c.status === "upcoming" ? "Coming up" : "Finished"} · {prettyDate(c.startsOn)} to {prettyDate(c.endsOn)}
          </span>
          <h3>🎯 {c.title}</h3>
          <p className="muted small">{c.description}</p>
          <p className="small">
            {c.entries} {c.entries === 1 ? "entry" : "entries"}
            {c.winner ? ` · 🥇 ${c.winner.elfName}: ${c.winner.title}` : ""}
          </p>
        </Link>
      ))}
    </div>
  );
}
