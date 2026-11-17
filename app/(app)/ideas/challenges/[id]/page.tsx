"use client";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { Camera, ChevronRight, Crown, Share2, ThumbsUp, Trophy } from "lucide-react";
import { useEffect, useState } from "react";
import { SectionHead } from "@/components/home/Sections";
import { Topbar, Working } from "@/components/ui";
import { api } from "@/lib/client/api";
import { errorMessage, localDate } from "@/lib/client/utils";
import type { Challenge, PostSummary } from "@/lib/types";

const SM = { size: 18, strokeWidth: 1.8 };
const short = (d: string) => new Date(`${d}T12:00:00`).toLocaleDateString(undefined, { day: "numeric", month: "short" });

/** One challenge: what it is, how to enter, the winner, and the leaderboard. */
export default function ChallengePage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [challenge, setChallenge] = useState<Challenge | null>(null);
  const [entries, setEntries] = useState<PostSummary[]>([]);
  const [error, setError] = useState<string | null>(null);
  const today = localDate();

  useEffect(() => {
    api
      .challenge(id, today)
      .then((r) => {
        setChallenge(r.challenge);
        setEntries(r.entries);
      })
      .catch((e) => setError(errorMessage(e)));
  }, [id, today]);

  if (error)
    return (
      <div className="screen">
        <Topbar title="Challenge" back={() => router.back()} />
        <p className="error">{error}</p>
      </div>
    );
  if (!challenge)
    return (
      <div className="screen">
        <Working label="Loading…" />
      </div>
    );

  const daysLeft = Math.max(0, Math.round((Date.parse(`${challenge.endsOn}T00:00:00Z`) - Date.parse(`${today}T00:00:00Z`)) / 86_400_000));
  const status = challenge.status === "active" ? (daysLeft === 0 ? "Last day" : `${daysLeft} day${daysLeft === 1 ? "" : "s"} left`) : challenge.status === "upcoming" ? "Coming up" : "Finished";

  return (
    <div className="screen home">
      <Topbar eyebrow={`Challenge · ${short(challenge.startsOn)} to ${short(challenge.endsOn)}`} title={challenge.title} back={() => router.back()} />

      <section className="countdown" aria-label="About this challenge">
        <div className="family-top">
          <span className="challenge-icon big" aria-hidden="true">
            <Trophy {...SM} size={24} />
          </span>
          <div className="grow">
            <div className="eyebrow">{status}</div>
            <h2 className="card-title">
              {challenge.entries} {challenge.entries === 1 ? "entry" : "entries"}
            </h2>
          </div>
        </div>
        <p className="body">{challenge.description}</p>
        {challenge.winner && (
          <Link href={`/ideas/${challenge.winner.postId}`} className="list-row set-row winner-row">
            <Crown {...SM} className="row-icon acc" aria-hidden="true" />
            <span className="row-label">
              <span className="row-sub">Winner</span>
              <strong>
                {challenge.winner.title} by {challenge.winner.elfName}
              </strong>
            </span>
            <ChevronRight {...SM} className="muted" aria-hidden="true" />
          </Link>
        )}
      </section>

      {challenge.status !== "ended" && (
        <section aria-label="How to enter">
          <SectionHead title="How to enter" />
          <div className="list">
            {[
              { icon: Camera, text: "Do a night that fits the theme and log it with a photo" },
              { icon: Share2, text: "Tap Share with other elves and tick the challenge box" },
              { icon: ThumbsUp, text: "Most upvotes when the week ends wins the Champion badge" },
            ].map((s, i) => (
              <div key={i} className="list-row set-row">
                <s.icon {...SM} className="row-icon" aria-hidden="true" />
                <span className="row-label">{s.text}</span>
              </div>
            ))}
          </div>
        </section>
      )}

      <section aria-label="Leaderboard">
        <SectionHead title="Leaderboard" />
        {entries.length === 0 ? (
          <p className="muted small">No entries yet. Be the first.</p>
        ) : (
          <div className="idea-list">
            {entries.map((p, i) => (
              <Link key={p.id} href={`/ideas/${p.id}`} className="idea-row">
                <span className={`rank-num ${i < 3 ? "top" : ""}`}>{i + 1}</span>
                <span className="idea-thumb">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={p.photoUrl} alt="" loading="lazy" />
                </span>
                <span className="grow">
                  <span className="night-meta">
                    {p.author.elfName} · {p.roomType}
                  </span>
                  <span className="night-title">{p.title}</span>
                </span>
                <span className="votes">
                  <ThumbsUp size={14} strokeWidth={1.8} /> {p.upvotes}
                </span>
              </Link>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
