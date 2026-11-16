"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Topbar, Working } from "@/components/ui";
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

  if (error) return <div className="screen"><p className="error">{error}</p></div>;
  if (!list) return <div className="screen"><Working label="Loading…" /></div>;

  return (
    <div className="screen">
      <Topbar eyebrow="One theme a week" title="Challenges" back={() => router.back()} />
      <p className="body">Share a night into the week&apos;s theme. Most upvotes when the week ends wins the Champion badge.</p>
      {list.map((c) => (
        <Link key={c.id} href={`/ideas/challenges/${c.id}`} className={`card stack ${c.status === "active" ? "accent-border" : ""}`} style={{ gap: 4, opacity: c.status === "ended" ? 0.75 : 1 }}>
          <span className="eyebrow">
            {c.status === "active" ? "This week" : c.status === "upcoming" ? "Coming up" : "Finished"} · {prettyDate(c.startsOn)} to {prettyDate(c.endsOn)}
          </span>
          <h3>{c.title}</h3>
          <span className="body small">{c.description}</span>
          <span className="small muted">
            {c.entries} {c.entries === 1 ? "entry" : "entries"}
            {c.winner ? ` · winner: ${c.winner.elfName}, ${c.winner.title}` : ""}
          </span>
        </Link>
      ))}
    </div>
  );
}
